// plugins/mediatag.js
const FileType = require('file-type');

module.exports = {
  command: 'mediatag',
  category: 'group',
  description: '```Reply to a media to tag```',
  group: true,

  async execute(sock, m, ctx) {
    try {
      const { quoted, qmsg, participants = [], reply } = ctx;

      if (!m.isGroup) return reply('❌ This command is for groups only.');
      const mentioned = participants.map(p => p.id).filter(Boolean);
      if (!quoted && !qmsg) return reply('⚠️ Reply to a media message to tag everyone.');

      const target = qmsg || quoted;

      // Check for media
      const typeKey = Object.keys(target.message || {})[0];
      if (!typeKey || !/image|video|audio|sticker|document/i.test(typeKey)) {
        return reply('⚠️ That message doesn’t contain media.');
      }

      // Download media buffer
      const buffer = await sock.downloadMediaMessage(target).catch(() => null);
      if (!buffer) return reply('⚠️ Failed to download the media.');

      const detected = await FileType.fromBuffer(buffer).catch(() => null);
      const mime = detected?.mime || 'application/octet-stream';
      let sendContent = {};
      const caption =
        target.message?.[typeKey]?.caption || '';

      // Handle sticker properly
      if (typeKey.includes('stickerMessage')) {
        sendContent = { sticker: buffer };
      }

      // Handle image/video/audio/document
      else if (mime.startsWith('image/')) {
        sendContent = { image: buffer, caption };
      } else if (mime.startsWith('video/')) {
        sendContent = { video: buffer, caption };
      } else if (mime.startsWith('audio/')) {
        sendContent = { audio: buffer, mimetype: mime, ptt: false };
      } else if (mime.startsWith('application/')) {
        sendContent = { document: buffer, fileName: `file.${detected?.ext || 'bin'}` };
      }

      // Handle view-once media (recreate as viewOnceMessage)
      if (typeKey === 'viewOnceMessageV2' || typeKey === 'viewOnceMessage') {
        const inner = target.message?.[typeKey]?.message || {};
        const innerType = Object.keys(inner)[0];
        sendContent = {
          viewOnce: true,
          [innerType.replace('Message', '')]: await sock.downloadMediaMessage(target),
          caption: inner?.[innerType]?.caption || caption,
        };
      }

      // Tag everyone
      sendContent.mentions = mentioned;

      // Send silently
      await sock.sendMessage(m.chat, sendContent, { quoted: m });
    } catch (e) {
      console.error('❌ mediatag error:', e);
      await ctx.reply('⚠️ Error while tagging media.');
    }
  },
};
