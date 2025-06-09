// const schedule = require('node-schedule');
// const { getEntityByType } = require('./telegramBot');
// const { getStudents, appendSheetData, getSheetData } = require('./googleSheets');
// const { downloadPDF, convertPDFToImages } = require('./pdfUtils');
// const fetch = require('node-fetch');
// const fs = require('fs');

// module.exports = {
//   initSchedulers: (bot) => {
//     schedule.scheduleJob('24 13 * * *', async () => {
//       const entities = ['MAGANG', 'WBS'];
      
//       for (const entity of entities) {
//         try {
//           const entityConfig = getEntityByType(entity);
//           const students = await getStudents(entityConfig.dataSheet);

//           const today = new Date().toLocaleDateString('en-GB');
//           const attendance = await getSheetData(
//             process.env.SPREADSHEET_ID, 
//             `${entityConfig.rekapSheet}!A2:N`
//           ).then(rows => 
//             rows.filter(row => row[0] === today)
//           );

//           const usernameColumn = entity === 'MAGANG' ? 9 : 8;
//           const missing = students.filter(s => 
//             !attendance.some(a => a[usernameColumn] === `@${s.username}`)
//           );

//           if (missing.length === 0) continue;
//           const rows = missing.map(s => {
//             if (entity === 'MAGANG') {
//               return [
//                 today,
//                 s.nama,
//                 s.status,
//                 s.asal,
//                 s.unit,
//                 'Tidak Hadir',  // Kondisi Kesehatan
//                 'Tidak Hadir',  // Status Hadir
//                 new Date().toLocaleTimeString('en-GB'),
//                 '',             // Foto
//                 `@${s.username}`,
//                 '', '', '',     // Koordinat & Alamat
//                 'TANPA KABAR'   // Keterangan
//               ];
//             } else {
//               return [
//                 today,
//                 s.nama,
//                 s.posisi,
//                 s.penempatan,
//                 'Tidak Hadir',  // Status Hadir
//                 new Date().toLocaleTimeString('en-GB'),
//                 '',             // Foto
//                 `@${s.username}`,
//                 '', '', '',     // Koordinat & Alamat
//                 'TANPA KABAR'   // Keterangan
//               ];
//             }
//           });

//           await appendSheetData(
//             process.env.SPREADSHEET_ID,
//             entityConfig.rekapSheet,
//             rows
//           );

//           const pdfUrl = await fetch(`${process.env.APPSCRIPT_URL}?sheet=${entity.toLowerCase()}`)
//             .then(res => res.json())
//             .then(data => data.fileUrl);

//           const pdfPath = await downloadPDF(pdfUrl, `rekap_${entity}_${Date.now()}.pdf`);
//           const imagePaths = await convertPDFToImages(pdfPath);

//           for (const imgPath of imagePaths) {
//             await bot.sendPhoto(
//               process.env.GROUP_CHAT_ID,
//               imgPath, 
//               { message_thread_id: entityConfig.topicId }
//             );
//           }

//           fs.unlinkSync(pdfPath);
//           imagePaths.forEach(img => fs.unlinkSync(img));

//         } catch (error) {
//           console.error(`Error processing ${entity}:`, error);
//         }
//       }
//     });
//   }
// };