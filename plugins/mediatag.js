const FileType = require('file-type');

module.exports = {
  command: 'mediatag',
  category: 'group',
  description: 'Reply to a media message and tag everyone while resending that media',
  group: true,

  async execute(sock, m, ctx) {
    try {
      const { quoted, participants = [], reply } = ctx;

      if (!m.isGroup) return reply('❌ This command only works in groups.');

      const mentioned = participants.map(p => p.id).filter(Boolean);
      if (!mentioned.length) return reply('⚠️ No group members found to tag.');

      if (!quoted) return reply('⚠️ Reply to a media message.\nExample: reply with `.mediatag`');

      // Unwrap nested Baileys layers (viewOnce, ephemeral, etc.)
      let msg = quoted.message;
      while (msg && typeof msg === 'object' && !Object.keys(msg).some(k => /(image|video|sticker|audio|document)Message/i.test(k))) {
        msg = Object.values(msg)[0];
      }

      if (!msg) return reply('⚠️ No valid media found in this message.');

      const type = Object.keys(msg).find(k => /(image|video|sticker|audio|document)Message/i.test(k));
      if (!type) return reply('⚠️ Unsupported or invalid media type.');

      const content = msg[type];
      const buffer = await sock.downloadMediaMessage({ message: { [type]: content } }).catch(() => null);
      if (!buffer) return reply('⚠️ Failed to download media.');

      const detected = (await FileType.fromBuffer(buffer).catch(() => null)) || {};
      const mime = detected.mime || content.mimetype || '';
      const caption = content.caption || '';

      let payload = { mentions: mentioned };

      // Image
      if (/image/i.test(type)) {
        payload.image = buffer;
        if (caption) payload.caption = caption;
      }

      // Video
      else if (/video/i.test(type)) {
        payload.video = buffer;
        if (caption) payload.caption = caption;
      }

      // Audio
      else if (/audio/i.test(type)) {
        payload.audio = buffer;
        payload.mimetype = mime || 'audio/mpeg';
      }

      // Sticker
      else if (/sticker/i.test(type) || /webp/i.test(mime)) {
        payload.sticker = buffer;
      }

      // Document
      else if (/document/i.test(type)) {
        payload.document = buffer;
        payload.fileName = content.fileName || `file.${detected.ext || 'bin'}`;
      }

      else {
        return reply('⚠️ Unsupported media type.');
      }

      // 🚀 Send the message with mentions
      await sock.sendMessage(m.chat, payload, { quoted: m });

    } catch (err) {
      console.error('❌ mediatag error:', err);
      reply('⚠️ Error while tagging media.');
    }
  }
};
