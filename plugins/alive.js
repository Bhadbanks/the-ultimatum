// plugins/alive.js
const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', 'library', 'database');
const DB_FILE = path.join(DB_DIR, 'alive.json');

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) return {};
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '{}');
  } catch (e) {
    console.error('alive loadDB error', e);
    return {};
  }
}

module.exports = {
  command: 'alive',
  description: 'Show alive message (set with .setalive).',
  category: 'general',
  owner: false,
  execute: async (sock, m, opts) => {
    try {
      const { reply } = opts;
      const db = loadDB();
      const entry = db.alive || { text: 'I am alive!', uptime: true, imageUrl: null };

      // compose uptime
      let uptimeStr = '';
      if (entry.uptime) {
        const sec = Math.floor(process.uptime());
        const days = Math.floor(sec / 86400);
        const hours = Math.floor((sec % 86400) / 3600);
        const minutes = Math.floor((sec % 3600) / 60);
        const seconds = sec % 60;
        uptimeStr = `\n\nUptime: ${days}d ${hours}h ${minutes}m ${seconds}s`;
      }

      const finalText = `${entry.text}${uptimeStr}`;

      if (entry.imageUrl) {
        await sock.sendMessage(m.chat, {
          image: { url: entry.imageUrl },
          caption: finalText
        }, { quoted: m });
      } else {
        await sock.sendMessage(m.chat, { text: finalText }, { quoted: m });
      }
    } catch (err) {
      console.error('alive plugin error', err);
    }
  }
};
