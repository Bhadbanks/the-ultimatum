// plugins/tag.js
module.exports = {
  command: "tag",
  description: "```Tag everyone in the group with a msg/media```.",
  category: "group",

  execute: async (sock, m, { text, participants, reply }) => {
    try {
      const from = m.key.remoteJid || m.chat;
      if (!from.endsWith("@g.us")) {
        return reply("⚠️ This command only works in groups.");
      }

      const mentions = participants.map(p => p.id);

      // Extract caption/text if replying to media
      let msgText = text && text.trim() ? text : null;
      if (!msgText && m.quoted) {
        const quoted = m.quoted;
        const type = Object.keys(quoted.message || {})[0];
        const quotedMsg = quoted.message[type];

        if (quotedMsg) {
          msgText =
            quotedMsg.caption ||
            quotedMsg.text ||
            "📸 Media shared (no caption)";
        }
      }

      // Default fallback
      if (!msgText) {
        return reply("Reply to a message or use `.tag <text>` to tag everyone.");
      }

      await sock.sendMessage(
        from,
        { text: msgText, mentions },
        { quoted: m }
      );
    } catch (err) {
      console.error("❌ Error in .tag:", err);
      await reply("Error while tagging members.");
    }
  },
};
