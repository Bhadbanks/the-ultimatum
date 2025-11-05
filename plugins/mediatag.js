// plugins/mediatag.js
module.exports = {
  command: "mediatag",
  description: "```Tag everyone with media/sticker```",
  category: "group",

  execute: async (sock, m, { participants, reply }) => {
    try {
      const from = m.key.remoteJid || m.chat;
      if (!from.endsWith("@g.us")) {
        return reply("⚠️ This command only works in groups.");
      }

      if (!m.quoted) {
        return reply("Reply to a media message with `.mediatag` to tag everyone.");
      }

      const quoted = m.quoted;
      const type = Object.keys(quoted.message || {})[0];
      const mentions = participants.map(p => p.id);

      // Handle image/video/sticker/audio/document
      const sendable = {};
      if (quoted.message.imageMessage) {
        sendable.image = quoted.message.imageMessage;
        sendable.caption =
          quoted.message.imageMessage.caption || "📸 Media shared";
      } else if (quoted.message.videoMessage) {
        sendable.video = quoted.message.videoMessage;
        sendable.caption =
          quoted.message.videoMessage.caption || "🎥 Media shared";
      } else if (quoted.message.stickerMessage) {
        sendable.sticker = quoted.message.stickerMessage;
      } else if (quoted.message.audioMessage) {
        sendable.audio = quoted.message.audioMessage;
      } else if (quoted.message.documentMessage) {
        sendable.document = quoted.message.documentMessage;
      } else {
        return reply("Unsupported media type for tagging.");
      }

      sendable.mentions = mentions;
      await sock.sendMessage(from, sendable, { quoted: m });
    } catch (err) {
      console.error("❌ Error in .mediatag:", err);
      await reply("Error while tagging members with media.");
    }
  },
};
