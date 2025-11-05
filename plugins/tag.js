// plugins/tag.js
module.exports = {
  command: "tag",
  description: "```Tag everyone with a text```",
  category: "group",

  execute: async (sock, m, { text, q, quoted, qmsg, participants, reply }) => {
    try {
      const from = m.key.remoteJid || m.chat;
      if (!from || !from.endsWith("@g.us")) {
        return reply("⚠️ This command only works in groups.");
      }

      // Build mention list
      const mentions = (participants || []).map(p => p.id).filter(Boolean);
      if (!mentions.length) return reply("No participants found to tag.");

      // If user provided text (.tag hello) use that
      // If reply to a message without explicit text, try to extract quoted text
      let finalText = (text || "").trim();

      // helper to get text from quoted message
      const getQuotedText = (q) => {
        if (!q) return "";
        // qmsg in your loader is (quoted.msg || quoted)
        // try common fields
        if (q.conversation) return q.conversation;
        if (q.text) return q.text;
        if (q.caption) return q.caption;
        if (q?.imageMessage?.caption) return q.imageMessage.caption;
        if (q?.videoMessage?.caption) return q.videoMessage.caption;
        if (q?.extendedTextMessage?.text) return q.extendedTextMessage.text;
        return "";
      };

      if (!finalText) {
        finalText = getQuotedText(qmsg || quoted) || "";
      }

      if (!finalText) {
        return reply("Usage: `.tag <text>` or reply to a message with `.tag` to tag using that message's text.");
      }

      // Send message with mentions. Quote the command message so it's clear who invoked it.
      await sock.sendMessage(from, { text: finalText, mentions }, { quoted: m });
    } catch (err) {
      console.error("Error in plugin tag:", err);
      try { await reply("❌ Error while tagging members."); } catch(e) {}
    }
  },
};
