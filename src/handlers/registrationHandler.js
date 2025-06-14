const { getEntityByType } = require('../utils/telegramBot');
const { getStudentByUsername, saveRegistration } = require('../utils/googleSheets');

module.exports = (bot, userStates) => {

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
👋 *Selamat datang di Bot Absensi WBS!*

Sebelum melakukan absen, silakan daftar terlebih dahulu sesuai kebutuhan Anda:

1️⃣ *Daftar Magang* – untuk peserta *PKL / Magang*
   👉 Gunakan perintah: /daftarmagang

2️⃣ *Daftar WBS* – untuk karyawan atau staff WBS
   👉 Gunakan perintah: /daftarwbs

📝 *Todo List* – simpan daftar tugas Anda dengan mudah
   👉 Gunakan perintah: /todo

_📌 Pastikan Anda sudah memiliki username Telegram sebelum mendaftar._
    `;

  bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: "Markdown"
  });
});

  // Handler Daftar Magang
  bot.onText(/\/daftarmagang/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    
    if (!username) {
      return bot.sendMessage(chatId, "❌ Anda harus memiliki username Telegram untuk mendaftar");
    }

    try {
      const existing = await getStudentByUsername(username);
      if (existing) {
        return bot.sendMessage(chatId, `❌ Username @${username} sudah terdaftar!`);
      }

      userStates[chatId] = {
        registration: {
          step: 1,
          entityType: 'MAGANG',
          data: {}
        }
      };
      bot.sendMessage(chatId, "📝 Silakan masukkan Nama Lengkap Anda:");
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, "❌ Gagal memproses pendaftaran");
    }
  });

  // Handler Daftar WBS
  bot.onText(/\/daftarwbs/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    
    if (!username) {
      return bot.sendMessage(chatId, "❌ Anda harus memiliki username Telegram untuk mendaftar");
    }

    try {
      const existing = await getStudentByUsername(username);
      if (existing) {
        return bot.sendMessage(chatId, `❌ Username @${username} sudah terdaftar!`);
      }

      userStates[chatId] = {
        registration: {
          step: 1,
          entityType: 'WBS',
          data: {}
        }
      };
      bot.sendMessage(chatId, "📝 Silakan masukkan Nama Lengkap Anda:");
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, "❌ Gagal memproses pendaftaran");
    }
  });

  // Handle Input Pendaftaran
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    if (!msg.text) return;
    const text = msg.text;
    const state = userStates[chatId]?.registration;
    const user = msg.from.username || 'tidak_ada_username';

    if (!state) return;

    // Proses Magang
    if (state.entityType === 'MAGANG') {
      switch(state.step) {
        case 1:
          state.data.nama = text;
          state.step = 2;
          bot.sendMessage(chatId, "📌 Pilih Status:", {
            reply_markup: {
              keyboard: [['PKL', 'Magang']],
              one_time_keyboard: true
            }
          });
          break;
        
        case 2:
          if (!['PKL', 'Magang'].includes(text)) {
            return bot.sendMessage(chatId, "❌ Pilihan tidak valid!");
          }
          state.data.status = text;
          state.step = 3;
          bot.sendMessage(chatId, "🏫 Masukkan Asal Sekolah/Universitas:");
          break;
        
        case 3:
          state.data.asal = text;
          state.step = 4;
          bot.sendMessage(chatId, "🏢 Pilih Unit Penempatan:", {
            reply_markup: {
              keyboard: [getEntityByType('MAGANG').unitOptions],
              one_time_keyboard: true
            }
          });
          break;
        
        case 4:
          state.data.unit = text;
          state.data.username = user;
          await saveRegistration('Magang', [
            state.data.nama,
            state.data.status,
            state.data.asal,
            state.data.unit,
            state.data.username
          ]);
          delete userStates[chatId];
          console.log(`✅ Pendaftaran Magang atas nama ${state.data.nama} berhasil!`)
          bot.sendMessage(chatId, "✅ Pendaftaran Magang berhasil!");
          break;
      }
    }

    // Proses WBS
    if (state.entityType === 'WBS') {
      switch(state.step) {
        case 1:
          state.data.nama = text;
          state.step = 2;
          bot.sendMessage(chatId, "💼 Masukkan Posisi/Jabatan:");
          break;
        
        case 2:
          state.data.posisi = text;
          state.data.unit = getEntityByType('WBS').unit;
          state.data.username = user;
          await saveRegistration('WBS', [
            state.data.nama,
            state.data.posisi,
            state.data.unit,
            state.data.username
          ]);
          delete userStates[chatId];
          bot.sendMessage(chatId, "✅ Pendaftaran WBS berhasil!");
          break;
      }
    }
  });
};