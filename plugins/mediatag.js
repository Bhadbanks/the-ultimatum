// plugins/mediatag.js
const FileType = require('file-type');

module.exports = {
  command: 'mediatag',
  category: 'group',
  description: 'Reply to any media (image, video, sticker, viewonce) and tag all members',
  group: true,

  async execute(sock, m, ctx) {
    try {
      const { quoted, participants = [], reply } = ctx;

      if (!m.isGroup) return reply('❌ This command only works in groups.');
      const mentioned = participants.map(p => p.id).filter(Boolean);

      if (!quoted) return reply('⚠️ Reply to a media message to tag everyone.');

      // --- Extract the real message ---
      let target = quoted.message || {};
      let type = Object.keys(target)[0];

      // Handle view-once messages (wrapped message)
      if (type === 'viewOnceMessageV2' || type === 'viewOnceMessage') {
        target = target[type].message;
        type = Object.keys(target)[0];
      }

      // If not media
      if (!/image|video|audio|sticker|document/i.test(type)) {
        return reply('⚠️ That message doesn’t contain media.');
      }

      // --- Download media ---
      const buffer = await sock.downloadMediaMessage(quoted).catch(() => null);
      if (!buffer) return reply('⚠️ Could not download media.');

      const detected = await FileType.fromBuffer(buffer).catch(() => null);
      const mime = detected?.mime || 'application/octet-stream';
      const caption = target[type]?.caption || '';

      let sendContent = {};

      // Stickers
      if (type.includes('stickerMessage')) {
        sendContent = { sticker: buffer };
      }

      // Image
      else if (mime.startsWith('image/')) {
        sendContent = { image: buffer, caption };
      }

      // Video
      else if (mime.startsWith('video/')) {
        sendContent = { video: buffer, caption };
      }

      // Audio
      else if (mime.startsWith('audio/')) {
        sendContent = { audio: buffer, mimetype: mime, ptt: false };
      }

      // Documents
      else if (mime.startsWith('application/')) {
        sendContent = { document: buffer, fileName: `file.${detected?.ext || 'bin'}` };
      }

      // --- Add mentions & send silently ---
      sendContent.mentions = mentioned;
      await sock.sendMessage(m.chat, sendContent, { quoted: m });
    } catch (err) {
      console.error('❌ mediatag error:', err);
      await ctx.reply('⚠️ Error while tagging media.');
    }
  },
};
