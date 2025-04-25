const { google } = require("googleapis");
const path = require("path");
const { getEntityByType } = require('./telegramBot'); // Pastikan path benar


async function getAuthClient() {
  return google.auth.getClient({
    keyFile: "credentials.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
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
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });
  
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    resource: { values },
  });
}

module.exports = {
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
    const range = `${rekapSheet}!A2:K`;
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
    const formattedToday = [
      String(today.getDate()).padStart(2, '0'),
      String(today.getMonth() + 1).padStart(2, '0'),
      today.getFullYear()
    ].join('-');

    const expectedUsername = `@${username}`;

    return rows.some(row => 
      row[0] === formattedToday && 
      row[8] === expectedUsername
    );
  },

  appendSheetData, 
};