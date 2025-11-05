module.exports = {
  command: 'tag',
  category: 'group',
  description: 'Tag all group members with or without message/media (silent mode)',

  async execute(sock, m, { text, quoted, isGroup, participants, reply }) {
    if (!isGroup) return reply('❌ This command only works in groups.');

    const mentionIds = participants.map(p => p.id);

    // If user provides a message
    if (text) {
      return await sock.sendMessage(m.chat, {
        text,
        mentions: mentionIds
      }, { quoted: m });
    }

    // If user replies to something
    if (quoted) {
      const msgType = Object.keys(quoted.message)[0];
      const content = quoted.message[msgType];

      // If it's media (image/video/etc.)
      if (
        msgType.includes('image') ||
        msgType.includes('video') ||
        msgType.includes('sticker') ||
        msgType.includes('document')
      ) {
        const buffer = await quoted.download();
        return await sock.sendMessage(m.chat, {
          [msgType.replace('Message', '')]: buffer,
          caption: quoted.text || '',
          mentions: mentionIds
        }, { quoted: m });
      } else {
        // Text-only reply
        return await sock.sendMessage(m.chat, {
          text: quoted.text || '',
          mentions: mentionIds
        }, { quoted: m });
      }
    }

    // If neither message nor reply
    return reply('⚠️ Please reply to a message/media or use `.tag <message>`');
  }
};
