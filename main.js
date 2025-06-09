require("dotenv").config();
const { createBot } = require('./src/utils/telegramBot');
const StateManager = require('./stateManager');
// const { initSchedulers } = require('./src/utils/scheduler');
const registrationHandler = require('./src/handlers/registrationHandler');
const attendanceHandler = require('./src/handlers/attendanceHandler');
const todoHandler = require('./src/handlers/todoHandler');
const photoHandler = require('./src/handlers/photoHandler');
const locationHandler = require('./src/handlers/locationHandler');
const rekapHandler = require('./src/handlers/rekapHandler');

const bot = createBot();
const stateManager = require('./stateManager');

// Inisialisasi semua handler
// initSchedulers(bot);
registrationHandler(bot, stateManager);
attendanceHandler(bot, stateManager);
todoHandler(bot, stateManager);
photoHandler(bot, stateManager);
locationHandler(bot, stateManager);
rekapHandler(bot);

  // Handle error polling
bot.on("polling_error", (error) => {
  console.error("Polling error:", error);
  setTimeout(() => bot.startPolling(), 5000);
});

process.on('SIGINT', () => {
  clearInterval(stateManager.cleanupInterval);
  process.exit();
});

console.log("🚀 Bot berhasil berjalan!");