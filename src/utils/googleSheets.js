const { google } = require('googleapis');
const axios = require('./axiosUtils');
const { pipeline } = require('stream/promises');
const { promisify } = require('util');
const { getEntityByType } = require('./telegramBot');

async function getAuthClient() {
  return google.auth.getClient({
    keyFile: "credentials.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function downloadPDF(url, filename) {
  const response = await axios({
    url,
    responseType: 'stream',
    retry: true
  });

  const outputPath = path.join(PDF_DIR, filename);
  const writer = fs.createWriteStream(outputPath);
  
  await pipeline(response.data, writer);
  return outputPath;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

async function getSheetData(spreadsheetId, range) {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  
  return response.data.values || [];
}

async function appendSheetData(spreadsheetId, range, values) {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });
    
    const res = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      resource: { values },
    });
    
    console.log('✅ Data appended:', res.data.updates);
    return res;
  } catch (error) {
    console.error('❌ Append error:', error.message);
    throw error;
  }
}

async function getUserTodayTodoRow(username) {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  const range = 'Todo!A2:F';
  const rows = await getSheetData(spreadsheetId, range);
  const today = formatDate(new Date());

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row[0] === username && row[1] === today) {
      return {
        row: row,
        rowIndex: i + 2
      };
    }
  }
  return null;
}

async function getUserPreviousTodoRow(username) {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  const range = 'Todo!A2:F';
  const rows = await getSheetData(spreadsheetId, range);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const userRows = rows.filter(row => row[0] === username)
    .map(row => ({
      row,
      date: new Date(row[1])
    }))
    .filter(rowData => rowData.date < today)
    .sort((a, b) => b.date - a.date);

  return userRows.length > 0 ? { 
    row: userRows[0].row, 
    rowIndex: rows.indexOf(userRows[0].row) + 2 
  } : null;
}

async function getAllUncompletedTodos(username) {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  const range = 'Todo!A2:F';
  const rows = await getSheetData(spreadsheetId, range);
  const today = formatDate(new Date());

  return rows
    .filter(row => row[0] === username && row[1] !== today)
    .flatMap(row => row[4]?.split('\n').filter(Boolean) || []);
}

module.exports = {
  getSheetData,
  appendSheetData,
  getAllUncompletedTodos,
  getStudents: async (dataSheet, entityType) => {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const range = `${dataSheet}!A2:E`;
    const rows = await getSheetData(spreadsheetId, range);
    
    if (entityType === 'MAGANG') {
      return rows.map(row => ({
        nama: row[0],
        status: row[1],
        asal: row[2],
        unit: row[3],
        username: row[4]
      }));
    } else {
      return rows.map(row => ({
        nama: row[0],
        posisi: row[1],
        penempatan: row[2],
        username: row[3]
      }));
    }
  },

  saveAttendance: async (rekapSheet, rowData) => {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const range = `${rekapSheet}!A2:N`;
    await appendSheetData(spreadsheetId, range, [rowData]);
  },

  saveRegistration: async (sheetName, rowData) => {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const range = `${sheetName}!A2:E`;
    await appendSheetData(spreadsheetId, range, [rowData]);
  },

  getStudentByUsername: async (username) => {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const sheets = ['Magang', 'WBS'];
    
    for (const sheet of sheets) {
      const rows = await getSheetData(spreadsheetId, `${sheet}!A2:E`);
      const usernameColumn = sheet === 'Magang' ? 4 : 3;
      const studentRow = rows.find(row => row[usernameColumn]?.toLowerCase() === username.toLowerCase());
      
      if (studentRow) {
        return sheet === 'Magang' ? {
          type: 'MAGANG',
          nama: studentRow[0],
          status: studentRow[1],
          asal: studentRow[2],
          unit: studentRow[3]
        } : {
          type: 'WBS',
          nama: studentRow[0],
          posisi: studentRow[1],
          unit: studentRow[2]
        };
      }
    }
    return null;
  },

  getTodayAttendanceByUsername: async (username, entityType) => {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const entityConfig = getEntityByType(entityType);
    const rekapSheet = entityConfig.rekapSheet;
    const range = `${rekapSheet}!A2:N`;

    const rows = await getSheetData(spreadsheetId, range);
    const today = new Date();
    // const formattedToday = [
    //   String(today.getDate()).padStart(2, '0'),
    //   String(today.getMonth() + 1).padStart(2, '0'),
    //   today.getFullYear()
    // ].join('-');
    const formattedToday = today.toLocaleDateString('en-GB');

    const expectedUsername = `@${username}`;
    const usernameColumn = entityType === 'MAGANG' ? 9 : 8;

    return rows.some(row => 
      row[0] === formattedToday && 
      row[usernameColumn] === expectedUsername
    );
  },

  appendSheetData, 

  saveTodoItems: async (username, items) => {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });

    const today = formatDate(new Date());
    const userData = await getUserTodayTodoRow(username);

    if (!userData) {
      // Cek row kemarin
      const previousRow = await getUserPreviousTodoRow(username);
      
      // Pindahkan pending kemarin ke uncompleted
      if (previousRow) {
        const pendingItems = previousRow.row[2]?.split('\n').filter(Boolean) || [];
        if (pendingItems.length > 0) {
          const uncompleted = previousRow.row[4]?.split('\n').filter(Boolean) || [];
          const dateStr = previousRow.row[1];
          uncompleted.push(`${pendingItems.join(', ')}`);
          
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Todo!C${previousRow.rowIndex}:F${previousRow.rowIndex}`,
            valueInputOption: "RAW",
            resource: {
              values: [
                [
                  '', // Kosongkan pending
                  previousRow.row[3], // Completed tetap
                  uncompleted.join('\n'),
                  new Date().toISOString()
                ]
              ]
            }
          });
        }
      }

      // Buat row baru untuk hari ini
      const newRow = [
        username,
        today,
        items.join('\n'),  // Pending
        '',                // Completed
        '',                // Uncompleted
        new Date().toISOString()
      ];
      
      await appendSheetData(spreadsheetId, 'Todo!A2:F', [newRow]);
    } else {
      // Update row hari ini
      const currentPending = userData.row[2]?.split('\n').filter(Boolean) || [];
      currentPending.push(...items.filter(item => item.trim()));
      
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Todo!C${userData.rowIndex}:F${userData.rowIndex}`,
        valueInputOption: "RAW",
        resource: {
          values: [
            [
              currentPending.join('\n'),
              userData.row[3] || '',
              userData.row[4] || '',
              new Date().toISOString()
            ]
          ]
        }
      });
    }
  },

  getPendingTodos: async (username) => {
    const userData = await getUserTodayTodoRow(username);
    if (!userData) return [];
    return userData.row[2]?.split('\n').filter(Boolean).map((item, index) => ({ index, item })) || [];
  },

  markTodoAsDone: async (username, itemIndex) => {
    const userData = await getUserTodayTodoRow(username);
    if (!userData) throw new Error('User tidak ditemukan');

    const pending = userData.row[2]?.split('\n').filter(Boolean) || [];
    const completed = userData.row[3]?.split('\n').filter(Boolean) || [];
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });

    if (itemIndex < 0 || itemIndex >= pending.length) {
      throw new Error('Indeks tidak valid');
    }

    const [doneItem] = pending.splice(itemIndex, 1);
    completed.push(doneItem);

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `Todo!C${userData.rowIndex}:F${userData.rowIndex}`,
      valueInputOption: "RAW",
      resource: {
        values: [
          [
            pending.join('\n'),
            completed.join('\n'),
            userData.row[4] || '',
            new Date().toISOString()
          ]
        ]
      }
    });
  }
};
