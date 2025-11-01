// --- Prevent corrupted session issues ---
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const sessionPath = path.join(__dirname, 'session');
const credsFile = path.join(sessionPath, 'creds.json');

try {
  if (fs.existsSync(credsFile)) {
    const stats = fs.statSync(credsFile);
    const sizeInKB = stats.size / 1024;
    if (sizeInKB < 2) {
      console.log(chalk.red('⚠️ Corrupted session detected — deleting session folder...'));
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  }
} catch (err) {
  console.warn(chalk.yellow('⚠️ Session integrity check failed:'), err.message);
}

if (!fs.existsSync(sessionPath)) {
  fs.mkdirSync(sessionPath, { recursive: true });
}

// --- Main bot logic below ---
console.clear();
const config = () => require('./settings/config');
process.on("uncaughtException", console.error);

let makeWASocket, Browsers, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, jidDecode, downloadContentFromMessage, jidNormalizedUser, isPnUser;

const loadBaileys = async () => {
  const baileys = await import('@whiskeysockets/baileys');
  makeWASocket = baileys.default;
  Browsers = baileys.Browsers;
  useMultiFileAuthState = baileys.useMultiFileAuthState;
  DisconnectReason = baileys.DisconnectReason;
  fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
  jidDecode = baileys.jidDecode;
  downloadContentFromMessage = baileys.downloadContentFromMessage;
  jidNormalizedUser = baileys.jidNormalizedUser;
  isPnUser = baileys.isPnUser;
};

const pino = require('pino');
const FileType = require('file-type');
const readline = require("readline");
const chalkLib = require("chalk");
const { Boom } = require('@hapi/boom');
const { getBuffer } = require('./library/function');
const { smsg } = require('./library/serialize');
const { videoToWebp, writeExifImg, writeExifVid, addExif, toPTT, toAudio } = require('./library/exif');

const listcolor = ['cyan', 'magenta', 'green', 'yellow', 'blue'];
const randomcolor = listcolor[Math.floor(Math.random() * listcolor.length)];

const question = (text) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(chalkLib.yellow(text), (answer) => {
      resolve(answer);
      rl.close();
    });
  });
};

const clientstart = async () => {
  await loadBaileys();

  const browserOptions = [
    Browsers.macOS('Safari'),
    Browsers.macOS('Chrome'),
    Browsers.windows('Firefox'),
    Browsers.ubuntu('Chrome'),
    Browsers.baileys('Baileys'),
    Browsers.macOS('Edge'),
    Browsers.windows('Edge'),
  ];
  
  const randomBrowser = browserOptions[Math.floor(Math.random() * browserOptions.length)];
  const store = {
    messages: new Map(),
    contacts: new Map(),
    groupMetadata: new Map(),
    loadMessage: async (jid, id) => store.messages.get(`${jid}:${id}`) || null,
    bind: (ev) => {
      ev.on('messages.upsert', ({ messages }) => {
        for (const msg of messages) {
          if (msg.key?.remoteJid && msg.key?.id) {
            store.messages.set(`${msg.key.remoteJid}:${msg.key.id}`, msg);
          }
        }
      });
    }
  };

  const { state, saveCreds } = await useMultiFileAuthState(`./${config().session}`);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: !config().status.terminal,
    auth: state,
    version,
    browser: randomBrowser
  });

  if (config().status.terminal && !sock.authState.creds.registered) {
    const phoneNumber = await question('number WhatsApp: ');
    const code = await sock.requestPairingCode(phoneNumber);
    console.log(chalkLib.green(`your pairing code: ${chalkLib.bold.green(code)}`));
  }

  store.bind(sock.ev);
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (connection === 'connecting') console.log(chalkLib.yellow('🔄 Connecting to WhatsApp...'));
    if (connection === 'open') console.log(chalkLib.green('✅ Connected successfully!'));
    
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = reason !== DisconnectReason.loggedOut;
      console.log(chalkLib.red('❌ Connection closed:'), reason);

      // 🧠 Instead of infinite reconnect loops, exit cleanly for deploy script to restart
      if (shouldReconnect) {
        console.log(chalkLib.yellow('🔁 Restart required, letting deploy script handle it...'));
        process.exit(1);
      } else {
        console.log(chalkLib.red('🚫 Logged out. Please re-pair manually.'));
        process.exit(0);
      }
    }

    if (qr) console.log(chalkLib.blue('📱 Scan the QR code above to connect.'));
    const { konek } = require('./library/connection/connection');
    konek({ sock, update, clientstart, DisconnectReason, Boom });
  });

  sock.ev.on('messages.upsert', async chatUpdate => {
    try {
      const mek = chatUpdate.messages[0];
      if (!mek.message) return;
      mek.message = Object.keys(mek.message)[0] === 'ephemeralMessage'
        ? mek.message.ephemeralMessage.message
        : mek.message;

      if (!sock.public && !mek.key.fromMe && chatUpdate.type === 'notify') return;
      if (mek.key.id.startsWith('BASE-') && mek.key.id.length === 12) return;

      const m = await smsg(sock, mek, store);
      require("./message")(sock, m, chatUpdate, store);
    } catch (err) {
      console.log(err);
    }
  });

  sock.public = config().status.public;
};

clientstart();

// --- Graceful error suppression ---
const ignoredErrors = [
  'Socket connection timeout',
  'EKEYTYPE',
  'item-not-found',
  'rate-overlimit',
  'Connection Closed',
  'Timed Out',
  'Value not found'
];

process.on('unhandledRejection', reason => {
  if (ignoredErrors.some(e => String(reason).includes(e))) return;
  console.log('Unhandled Rejection:', reason);
});
