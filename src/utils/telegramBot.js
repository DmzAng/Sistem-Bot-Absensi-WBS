  const TelegramBot = require("node-telegram-bot-api");
  const { ensureDirectories } = require('./pdfUtils');
  const axios = require('./axiosUtils');

  const ENTITIES = {
    MAGANG: {
      dataSheet: 'Magang',
      rekapSheet: 'RekapMAGANG',
      buttons: ['HADIR', 'IZIN', 'SAKIT'],
      topicId: process.env.REKAP_MAGANG_TOPIC_ID,
      hasAsal: true,
      unitOptions: ['Witel Business Service'],
      healthOptions: ['Sehat', 'Kurang Fit', 'Izin']

    },
    WBS: {
      dataSheet: 'WBS',
      rekapSheet: 'RekapWBS',
      buttons: ['ONSITE', 'REMOTE'],
      topicId: process.env.REKAP_WBS_TOPIC_ID,
      hasAsal: false,
      unit: 'Witel Business Service',
      unitOptions: ['Witel Business Service'],
      healthOptions: ['Sehat', 'Kurang Fit', 'Izin']
    }
  };

  const createBot = () => {
  const bot = new TelegramBot(process.env.TOKEN, {
    polling: {
      interval: 3000,
      timeout: 10000,
      autoStart: true,
      params: {
        timeout: 10
      }
    },
    request: {
      agentOptions: {
        keepAlive: true,
        maxSockets: 50
      }
    },
    onlyFirstMatch: true
  });

  bot.on('error', (error) => {
    console.error('Bot error:', error);
    if (error.code === 'EFATAL') {
      setTimeout(() => bot.startPolling(), 5000);
    }
  });

  return bot;
};

  module.exports = {
    getEntityByType(type) {
      if (!type || typeof type !== 'string') {
        throw new Error('Tipe entitas harus berupa string');
      }
      return ENTITIES[type.toUpperCase()];  },

    createBot: () => {
      const bot = new TelegramBot(process.env.TOKEN, { polling: true });
      ensureDirectories();
      return bot;
    },

    createKeyboard: (entityType) => {
      const entity = ENTITIES[entityType.toUpperCase()];
      if (!entity) {
        throw new Error(`Entity ${entityType} tidak ditemukan`);
      }
      return {
        keyboard: [entity.buttons.map(btn => ({ text: btn }))],
        one_time_keyboard: true,
        resize_keyboard: true
      };
    },

    getEntityConfig: (chatId) => {
      return Object.values(ENTITIES).find(e => e.id === chatId);
    },

    isOfficeHours: () => {
      const now = new Date();
      return now.getHours() >= 0 && now.getHours() < 23;
    }
  };