// plugins/mediatag.js
const FileType = require('file-type');

module.exports = {
  command: 'mediatag',
  category: 'group',
  description: 'Reply to a media message and tag everyone while resending that media',
  group: true,

  async execute(sock, m, ctx) {
    try {
      const { quoted, qmsg, isMedia, participants = [], reply } = ctx;

      // Must be used in group
      if (!m.isGroup) return reply('❌ This command is for groups only.');

      // Build mention list (array of jids)
      const mentioned = participants.map(p => p.id).filter(Boolean);
      if (mentioned.length === 0) return reply('⚠️ No participants found to tag.');

      // Prefer the quoted message (reply). If not replying, check if user sent media with command.
      const target = qmsg || quoted || null;

      if (!target || !isMedia) {
        return reply('⚠️ Reply to a media message with `.mediatag` or send media with the command.\nExample: reply an image -> `.mediatag`');
      }

      // Download the media buffer using your sock helper (index.js defines sock.downloadMediaMessage)
      const buffer = await sock.downloadMediaMessage(target).catch(err => {
        throw new Error('Failed to download media: ' + (err?.message || err));
      });

      if (!buffer || !Buffer.isBuffer(buffer)) {
        return reply('⚠️ Could not read media content.');
      }

      // Detect file type so we can send appropriate field
      const type = await FileType.fromBuffer(buffer).catch(() => null) || { ext: 'bin', mime: 'application/octet-stream' };
      const mime = type.mime || '';
      let messagePayload = {};
      const caption = (target?.message?.imageMessage?.caption)
        || (target?.message?.videoMessage?.caption)
        || (target?.message?.documentMessage?.fileName && '') // leave blank if not provided
        || '';

      if (/image\/(jpe?g|png|webp|gif)/i.test(mime)) {
        messagePayload = { image: buffer, caption };
      } else if (/video\//i.test(mime)) {
        messagePayload = { video: buffer, caption };
      } else if (/audio\//i.test(mime)) {
        // send as audio (not ptt). If you want ptt, set ptt:true
        messagePayload = { audio: buffer, mimetype: mime, ptt: false };
      } else if (/webp/i.test(mime) && target?.message?.stickerMessage) {
        // sticker (webp) — resend as sticker
        messagePayload = { sticker: buffer };
      } else {
        // fallback: send as document
        const filename = `file.${type.ext || 'bin'}`;
        messagePayload = { document: buffer, fileName: filename, caption };
      }

      // Add mentions
      messagePayload.mentions = mentioned;

      // Send it quoting the original command message (or you can quote the replied media). I quote `m` so it's clear who triggered it.
      await sock.sendMessage(m.chat, messagePayload, { quoted: m });

      // Confirm
      await reply(`✅ Tagged ${mentioned.length} members with the media.`);
    } catch (err) {
      console.error('mediatag error:', err);
      // use ctx.reply if available, else fallback to console
      try { await (ctx.reply ? ctx.reply('❌ Error: ' + (err.message || err)) : null); } catch {}
    }
  }
};
