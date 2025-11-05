const FileType = require('file-type');

module.exports = {
  command: 'mediatag',
  category: 'group',
  description: '```Reply to a media to tag```',
  group: true,

  async execute(sock, m, ctx) {
    try {
      const { quoted, participants = [], reply } = ctx;

      if (!m.isGroup) return reply('❌ This command only works in groups.');

      const mentioned = participants.map(p => p.id).filter(Boolean);
      if (!mentioned.length) return reply('⚠️ No group members found to tag.');

      if (!quoted) return reply('⚠️ Reply to a media message.\nExample: reply with `.mediatag`');

      // 🧠 unwrap viewOnce or ephemeral layers
      let msg = quoted.message;
      while (
        msg &&
        typeof msg === 'object' &&
        !Object.keys(msg).some(k => /image|video|sticker|audio|document/i.test(k))
      ) {
        msg = Object.values(msg)[0];
      }

      if (!msg) return reply('⚠️ This message does not contain media.');

      // 🧩 Determine the actual message type (image/video/sticker/etc)
      const type = Object.keys(msg).find(k => /image|video|sticker|audio|document/i.test(k));
      if (!type) return reply('⚠️ Unsupported or missing media.');

      // 🧾 Download the actual content
      const buffer = await sock.downloadMediaMessage(quoted).catch(() => null);
      if (!buffer) return reply('⚠️ Failed to download media.');

      // 🏷 Caption if any
      const caption =
        msg[type]?.caption ||
        msg.caption ||
        '';

      // 🔎 Detect file type for proper sending
      const detected = (await FileType.fromBuffer(buffer).catch(() => null)) || {};
      const mime = detected.mime || '';
      const payload = { mentions: mentioned };

      if (/sticker/i.test(type) || /webp/i.test(mime)) {
        payload.sticker = buffer;
      } else if (/image/i.test(type)) {
        payload.image = buffer;
        if (caption) payload.caption = caption;
      } else if (/video/i.test(type)) {
        payload.video = buffer;
        if (caption) payload.caption = caption;
      } else if (/audio/i.test(type)) {
        payload.audio = buffer;
        payload.mimetype = mime || 'audio/mpeg';
      } else if (/document/i.test(type)) {
        payload.document = buffer;
        payload.fileName = msg[type]?.fileName || 'file';
      } else {
        return reply('⚠️ Unsupported media type.');
      }

      await sock.sendMessage(m.chat, payload, { quoted: m });

    } catch (err) {
      console.error('❌ mediatag error:', err);
      reply('⚠️ Error while tagging media.');
    }
  }
};
