
const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', 'library', 'database');
const DB_FILE = path.join(DB_DIR, 'alive.json');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) return {};
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '{}');
  } catch (e) {
    console.error('loadDB error', e);
    return {};
  }
}
function saveDB(obj) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(obj, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('saveDB error', e);
    return false;
  }
}

module.exports = {
  command: 'setalive',
  description: '```set custom alive(uptime) msg```',
  category: 'owner',
  owner: true,
  execute: async (sock, m, opts) => {
    try {
      const { q = '', isCreator, reply, prefix = '.' } = opts;
      if (!isCreator) return; // loader double-checks, but safe-guard

      const raw = (q || '').trim();
      if (!raw) {
        const sample = `${prefix}setalive I am alive! #uptime #imageUrl https://example.com/pic.jpg`;
        const msg = `Usage:\n${sample}\n\nIf you omit #imageUrl no image will be stored. '#uptime' will append bot uptime when .alive runs.`;
        if (typeof reply === 'function') return reply(msg);
        return sock.sendMessage(m.chat, { text: msg }, { quoted: m });
      }

      const uptimeFlag = /#uptime/i.test(raw);
      const imgMatch = raw.match(/#imageUrl\s+(\S+)/i);
      const imageUrl = imgMatch ? imgMatch[1] : null;
      let cleaned = raw.replace(/#uptime/ig, '').replace(/#imageUrl\s+\S+/ig, '').trim();
      if (!cleaned) cleaned = 'I am alive!';

      const db = loadDB();
      db.alive = {
        text: cleaned,
        uptime: Boolean(uptimeFlag),
        imageUrl: imageUrl || null,
        updatedAt: Date.now()
      };
      saveDB(db);

      const confirm = `✅ Alive saved.\nText: ${cleaned}\nUptime: ${Boolean(uptimeFlag)}\nImage: ${imageUrl || 'none'}`;
      if (typeof reply === 'function') return reply(confirm);
      await sock.sendMessage(m.chat, { text: confirm }, { quoted: m });
    } catch (err) {
      console.error('setalive error', err);
    }
  }
};
