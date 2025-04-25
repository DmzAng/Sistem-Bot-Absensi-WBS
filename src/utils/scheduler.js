const schedule = require('node-schedule');
const { getEntityByType } = require('./telegramBot');
const { getStudents, appendSheetData } = require('./googleSheets');
const { downloadPDF, convertPDFToImages } = require('./pdfUtils');
const fetch = require('node-fetch');
const fs = require('fs');

module.exports = {
  initSchedulers: (bot) => {
    schedule.scheduleJob('30 20 * * *', async () => {
      const entities = ['MAGANG', 'WBS'];
      
      for (const entity of entities) {
        try {
          const entityConfig = getEntityByType(entity);
          const students = await getStudents(entityConfig.dataSheet);

          const missing = students.filter(s => 
            !attendance.find(a => a[1] === s.nama)
          );

          if (missing.length === 0) continue;

          const rows = missing.map(s => [
            new Date().toLocaleDateString('en-GB'),
            s.nama,
            ...(entity === 'MAGANG' ? [s.status, s.asal, s.unit] : [s.posisi, s.unit]),
            'TANPA KABAR',
            new Date().toLocaleTimeString('en-GB'),
            '',
            `@${s.username}`
          ]);

          await appendSheetData(
            process.env.SPREADSHEET_ID,
            entityConfig.rekapSheet,
            rows
          );

          const pdfUrl = await fetch(`${process.env.APPSCRIPT_URL}?sheet=${entity.toLowerCase()}`)
            .then(res => res.json())
            .then(data => data.fileUrl);

          const pdfPath = await downloadPDF(pdfUrl, `rekap_${entity}_${Date.now()}.pdf`);
          const imagePaths = await convertPDFToImages(pdfPath);

          for (const imgPath of imagePaths) {
            await bot.sendPhoto(
              process.env.GROUP_CHAT_ID,
              imgPath, 
              { message_thread_id: entityConfig.topicId }
            );
          }

          fs.unlinkSync(pdfPath);
          imagePaths.forEach(img => fs.unlinkSync(img));

        } catch (error) {
          console.error(`Error processing ${entity}:`, error);
        }
      }
    });
  }
};