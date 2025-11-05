// plugins/mediatag.js
const FileType = require('file-type');

module.exports = {
  command: 'mediatag',
  category: 'group',
  description: 'Reply to a media message and tag everyone with it',
  group: true,

  async execute(sock, m, ctx) {
    try {
      const { reply, participants = [] } = ctx;

      if (!m.isGroup) return reply('❌ This command is for groups only.');
      if (!m.quoted) return reply('⚠️ Reply to a media message with `.mediatag`.');

      const mentioned = participants.map(p => p.id);
      let quotedMsg = m.quoted?.message || m.quoted?.msg?.message || m.quoted?.msg || null;
      if (!quotedMsg) return reply('⚠️ No media content found in this message.');

      // Detect viewOnce
      if (quotedMsg.viewOnceMessageV2) {
        quotedMsg = quotedMsg.viewOnceMessageV2.message;
      }

      // Identify the media key inside the message
      const mediaKeys = Object.keys(quotedMsg);
      const mediaType = mediaKeys.find(k =>
        /(imageMessage|videoMessage|audioMessage|stickerMessage|documentMessage)/i.test(k)
      );

      if (!mediaType) return reply('⚠️ No valid media found in this message.');

      // Download media
      const buffer = await sock.downloadMediaMessage({ message: quotedMsg }).catch(() => null);
      if (!buffer) return reply('❌ Failed to download media.');

      const type = await FileType.fromBuffer(buffer).catch(() => null);
      const mime = type?.mime || '';
      const caption =
        quotedMsg?.[mediaType]?.caption ||
        quotedMsg?.[mediaType]?.fileName ||
        '';

      // Build outgoing payload
      let payload = {};
      if (/image\//.test(mime)) {
        payload = { image: buffer, caption };
      } else if (/video\//.test(mime)) {
        payload = { video: buffer, caption };
      } else if (/audio\//.test(mime)) {
        payload = { audio: buffer, mimetype: mime };
      } else if (/webp/.test(mime) || quotedMsg?.stickerMessage) {
        payload = { sticker: buffer };
      } else {
        const filename = `file.${type?.ext || 'bin'}`;
        payload = { document: buffer, fileName: filename, caption };
      }

      payload.mentions = mentioned;

      await sock.sendMessage(m.chat, payload, { quoted: m });

    } catch (err) {
      console.error('mediatag error:', err);
      ctx.reply('❌ Error: ' + (err.message || err));
    }
  }
};
