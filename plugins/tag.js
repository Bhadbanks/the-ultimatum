// plugins/tag.js
module.exports = {
  command: "tag",
  description: "Tag everyone in the group with an optional message or reply.",
  category: "group",
  owner: false,
  admin: false,

  execute: async (sock, m, { text = "", participants = [], reply }) => {
    try {
      const from = m.key.remoteJid || m.chat;
      const isGroup = from.endsWith("@g.us");
      if (!isGroup) return reply("This command only works in groups!");

      const mentions = participants.map(p => p.id);
      const msgText =
        text.trim() ||
        (m.quoted && m.quoted.text) ||
        "Tagging everyone!";

      await sock.sendMessage(from, {
        text: msgText,
        mentions,
      }, { quoted: m });
    } catch (e) {
      console.error("Tag error:", e);
      reply("❌ Error while tagging");
    }
  }
};
