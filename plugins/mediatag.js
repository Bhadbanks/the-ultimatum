// plugins/mediatag.js
module.exports = {
  command: 'mediatag',
  category: 'group',
  description: '```Reply a media to tag```',
  group: true,

  async execute(sock, m, { quoted, participants, reply }) {
    try {
      if (!m.isGroup) return reply('❌ This command only works in groups.');

      const mentioned = participants.map(p => p.id).filter(Boolean);
      if (!quoted) return reply('⚠️ Reply to a media message.');

      // Deep media extraction
      let msg = quoted.message;
      while (msg && typeof msg === 'object' && !Object.keys(msg).some(k => /image|video|sticker|audio|document/i.test(k))) {
        msg = Object.values(msg)[0]; // unwrap layers (viewOnce, ephemeral, etc)
      }

      if (!msg) return reply('⚠️ Could not find any media in this message.');

      const type = Object.keys(msg).find(k => /image|video|sticker|audio|document/i.test(k));
      if (!type) return reply('⚠️ That message doesn’t contain any media.');

      //  Download media
      const buffer = await sock.downloadMediaMessage(quoted).catch(() => null);
      if (!buffer) return reply('⚠️ Failed to download media.');

      const caption = msg[type]?.caption || '';

      //  Send with mentions
      const options = { mentions: mentioned };
      if (/image/i.test(type)) await sock.sendMessage(m.chat, { image: buffer, caption, ...options }, { quoted: m });
      else if (/video/i.test(type)) await sock.sendMessage(m.chat, { video: buffer, caption, ...options }, { quoted: m });
      else if (/sticker/i.test(type)) await sock.sendMessage(m.chat, { sticker: buffer, ...options }, { quoted: m });
      else if (/audio/i.test(type)) await sock.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/mp4', ptt: false, ...options }, { quoted: m });
      else if (/document/i.test(type)) await sock.sendMessage(m.chat, { document: buffer, fileName: 'file', ...options }, { quoted: m });
      else return reply('⚠️ Unsupported media type.');

    } catch (err) {
      console.error('❌ mediatag error:', err);
      reply('⚠️ Error while tagging media.');
    }
  }
};
