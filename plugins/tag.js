
const fs = require('fs');

module.exports = {
  command: 'tag',
  description: 'Tag everyone in group with message',
  category: 'group',
  group: true,
  admin: true,
  owner: true,
  execute: async (sock, m, opts) => {
    try {
      const {
        args,
        text,
        q, // text joined
        quoted,
        participants = [],
        prefix,
        reply,
      } = opts;

      // Ensure group (pluginLoader already prevents non-group, but safe-guard)
      if (!m.isGroup) return;

      const mentions = participants.map(p => p.id).filter(Boolean);

      // If user provided text after .tag
      if (text && text.trim().length > 0) {
        const caption = text.trim();
        await sock.sendMessage(m.chat, {
          text: caption,
          contextInfo: { mentionedJid: mentions }
        }, { quoted: m });
        return;
      }

      // If replying to a message: quote it and mention everyone
      if (m.quoted) {
        // send a small text that only mentions everyone, quoting the original message
        // quoting the original will make the original message visible (works for media)
        await sock.sendMessage(m.chat, {
          text: ' ',
          contextInfo: { mentionedJid: mentions }
        }, { quoted: m.quoted });
        return;
      }

      // No args and not a reply -> usage
      await reply(`Usage:\n${prefix}tag <message>\nor reply to a message with ${prefix}tag to tag everyone in that message.`);
    } catch (err) {
      console.error('tag plugin error:', err);
    }
  }
};
