const attendanceHandler = require('./attendanceHandler');
const { saveAttendanceData } = require('./attendanceHandler');

module.exports = (bot, userStates) => {
  bot.on("location", async (msg) => {
    const chatId = msg.chat.id;
    const state = userStates[chatId];
    
    if (!state || state.step !== 1) {
      return bot.sendMessage(chatId, "❌ Sesi tidak valid. Mulai absen lagi dari awal");
    }

    try {
      state.location = {
        lat: msg.location.latitude,
        lon: msg.location.longitude
      };
      
      await saveAttendanceData(bot, userStates, chatId, state);
      
    } catch (error) {
      console.error(`[LOKASI] Error:`, error);
      bot.sendMessage(chatId, "❌ Gagal memproses lokasi: " + error.message);
    }
  });
};