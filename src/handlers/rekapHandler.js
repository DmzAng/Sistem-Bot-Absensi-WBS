const { downloadPDF, convertPDFToImages } = require('../utils/pdfUtils');
const fs = require('fs');
const fetch = require('node-fetch');

module.exports = (bot) => {
  bot.onText(/\/rekap(?:\s(\w+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const entityType = match[1] ? match[1].toUpperCase() : null;

    if (!entityType || !['MAGANG', 'WBS'].includes(entityType)) {
      return bot.sendMessage(
        chatId,
        "⚠️ Format salah. Gunakan /rekap <jenis>\nContoh: /rekap magang\nJenis yang valid: magang, wbs"
      );
    }

    try {
      const response = await fetch(`${process.env.APPSCRIPT_URL}?sheet=${entityType.toLowerCase()}`);
      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = JSON.parse(responseText);
      if (!data.fileUrl) {
        throw new Error(data.error || 'URL PDF tidak valid dari AppScript');
      }

      const pdfPath = await downloadPDF(data.fileUrl, `rekap_${entityType}_${Date.now()}.pdf`);
      const imagePaths = await convertPDFToImages(pdfPath);

      const topicId = process.env[`REKAP_${entityType}_TOPIC_ID`];
      for (const imgPath of imagePaths) {
        await bot.sendPhoto(process.env.GROUP_CHAT_ID, imgPath, { 
          message_thread_id: topicId
        });
      }

      fs.unlinkSync(pdfPath);
      imagePaths.forEach(img => fs.unlinkSync(img));
      
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, `❌ Gagal membuat rekap: ${error.message}`);
    }
  });
};