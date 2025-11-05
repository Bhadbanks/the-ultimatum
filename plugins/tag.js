// plugins/tag.js
module.exports = {
  command: 'tag',
  description: 'Tag everyone in the group. Usage: .tag <text> or reply to a message with .tag',
  category: 'group',
  owner: false,
  admin: false,
  execute: async (sock, m, opts) => {
    try {
      // m: message object
      // opts: { args, text, q, quoted, participants, prefix, reply, ... }
      const { text = '', quoted, participants = [], prefix = '.', reply } = opts;

      const from = m.key?.remoteJid || m.chat || '';
      const isGroup = String(from).endsWith('@g.us');

      if (!isGroup) {
        // politely inform if used in private chat
        await sock.sendMessage(m.chat, { text: `This command only works in groups.` }, { quoted: m });
        return;
      }

      // build mentions (use participants passed by your message handler)
      const mentions = Array.isArray(participants)
        ? participants.map(p => p.id).filter(Boolean)
        : [];

      // if reply to a message => quote it and mention everyone (works for media)
      if (m.quoted) {
        // We quote the replied message so recipients see original content
        await sock.sendMessage(m.chat, {
          text: ' ', // empty text but the mentionedJid will notify
          contextInfo: { mentionedJid: mentions }
        }, { quoted: m.quoted });
        return;
      }

      // if user provided text after .tag
      if (text && text.trim().length > 0) {
        await sock.sendMessage(m.chat, {
          text: text.trim(),
          contextInfo: { mentionedJid: mentions }
        }, { quoted: m });
        return;
      }

      // else show usage
      const usage = `Usage:\n${prefix}tag <message>\nOr reply to a message with ${prefix}tag to tag everyone.`;
      if (typeof reply === 'function') return reply(usage);
      await sock.sendMessage(m.chat, { text: usage }, { quoted: m });
    } catch (err) {
      console.error('tag plugin error:', err);
    }
  }
};
