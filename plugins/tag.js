// plugins/tag.js
module.exports = {
  command: "tag",
  description: "Tag everyone in the group with a text message.",
  category: "group",

  execute: async (sock, m, { text, participants, reply }) => {
    try {
      const from = m.key.remoteJid || m.chat;
      if (!from.endsWith("@g.us")) {
        return reply("⚠️ This command only works in groups.");
      }

      if (!text) {
        return reply("Reply to a message or use `.tag <text>` to tag everyone.");
      }

      const mentions = participants.map(p => p.id);
      await sock.sendMessage(from, { text, mentions }, { quoted: m });
    } catch (err) {
      console.error("❌ Error in .tag:", err);
      await reply("Error while tagging members.");
    }
  },
};
