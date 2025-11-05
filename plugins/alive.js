
const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', 'library', 'database');
const DB_FILE = path.join(DB_DIR, 'alive.json');

// Ensure DB directory exists
if (!fs.existsSync(DB_DIR)) {
  try { fs.mkdirSync(DB_DIR, { recursive: true }); } catch (e) { /* ignore */ }
}

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) return {};
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '{}');
  } catch (e) {
    console.error('Failed to read alive DB', e);
    return {};
  }
}

function saveDB(obj) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(obj, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Failed to write alive DB', e);
    return false;
  }
}

module.exports = {
  command: 'setalive',
  description: 'Set alive message and optional image. Owner only. Usage: .setalive Your text here #uptime #imageUrl https://example.com/img.jpg',
  category: 'owner',
  owner: true, // pluginLoader will skip if not creator
  execute: async (sock, m, opts) => {
    try {
      const { args, text, q, isCreator, reply, prefix } = opts;

      if (!isCreator) {
        // owner-only guard (pluginLoader already checks but double ensure)
        return;
      }

      const raw = (q || '').trim();

      if (!raw) {
        await reply(`Usage:\n${prefix}setalive <text> [#uptime] [#imageUrl <url>]\nExample:\n${prefix}setalive I'm alive! #uptime #imageUrl https://example.com/pic.jpg`);
        return;
      }

      // parse flags
      // Simple parsing: '#uptime' presence and '#imageUrl <url>' pair
      const uptimeFlag = /#uptime/i.test(raw);
      const imgMatch = raw.match(/#imageUrl\s+(\S+)/i);
      const imageUrl = imgMatch ? imgMatch[1] : null;

      // clean text (remove flags)
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

      await reply(`✅ Alive set!\nText: ${cleaned}\nUptime included: ${Boolean(uptimeFlag)}\nImage: ${imageUrl || 'none'}`);
    } catch (e) {
      console.error('setalive error', e);
    }
  }
};

// separate export to handle .alive command through same file loader
module.exports.alive = {
  command: 'alive',
  description: 'Show alive message (set by owner).',
  category: 'general',
  execute: async (sock, m, opts) => {
    try {
      const { reply } = opts;
      const db = loadDB();
      const entry = db.alive || { text: 'I am alive!', uptime: true, imageUrl: null };

      // build message text with uptime if requested
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
        // send as image with caption
        await sock.sendMessage(m.chat, {
          image: { url: entry.imageUrl },
          caption: finalText,
        }, { quoted: m });
      } else {
        // text only
        await sock.sendMessage(m.chat, { text: finalText }, { quoted: m });
      }

    } catch (e) {
      console.error('alive error', e);
    }
  }
};
