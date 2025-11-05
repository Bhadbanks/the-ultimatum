// plugins/mediatag.js
const FileType = require('file-type');

module.exports = {
  command: 'mediatag',
  category: 'group',
  description: '```Reply to a media to tag```',
  group: true,

  async execute(sock, m, ctx) {
    try {
      const { reply, participants = [] } = ctx;

      if (!m.isGroup) return reply('❌ This command can only be used in groups.');
      if (!m.quoted) return reply('⚠️ Reply to a media message with `.mediatag`.');

      const quoted = m.quoted;
      const mentioned = participants.map(p => p.id);

      // Detect if the quoted message has media
      const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage', 'viewOnceMessageV2'];
      let target = null;
      for (const type of mediaTypes) {
        if (quoted.msg && quoted.msg[type]) {
          target = quoted.msg[type];
          break;
        }
      }

      if (!target) return reply('⚠️ No valid media found in this message.');

      // Download media
      const buffer = await sock.downloadMediaMessage(quoted).catch(e => null);
      if (!buffer) return reply('❌ Failed to download media.');

      const type = await FileType.fromBuffer(buffer).catch(() => null);
      const mime = type?.mime || '';
      let payload = {};
      const caption = quoted.msg?.caption || '';

      // Send as same type
      if (/image\//.test(mime)) {
        payload = { image: buffer, caption };
      } else if (/video\//.test(mime)) {
        payload = { video: buffer, caption };
      } else if (/audio\//.test(mime)) {
        payload = { audio: buffer, mimetype: mime };
      } else if (/webp/.test(mime) && quoted.msg?.stickerMessage) {
        payload = { sticker: buffer };
      } else {
        const filename = `file.${type?.ext || 'bin'}`;
        payload = { document: buffer, fileName: filename, caption };
      }

      payload.mentions = mentioned;

      await sock.sendMessage(m.chat, payload, { quoted: m });

    } catch (err) {
      console.error('mediatag error:', err);
      ctx.reply('❌ Error: ' + err.message);
    }
  }
};
