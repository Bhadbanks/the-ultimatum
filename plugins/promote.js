module.exports = {
  command: 'promote',
  category: 'group',
  description: '```Promote a member to admin```',
  group: true,
  admin: true,

  async execute(sock, m, ctx) {
    const { reply, mentionedJid = [], quoted, groupMetadata, sender } = ctx;

    try {
      if (!m.isGroup) return reply('❌ This command only works in groups.');

      // Fetch latest group metadata
      const metadata = await sock.groupMetadata(m.chat);
      const participants = metadata.participants || [];

      // Normalize all IDs (to avoid :number mismatch)
      const normalize = id => id.replace(/:\d+/, '');
      const groupAdmins = participants.filter(p => p.admin).map(p => normalize(p.id));
      const botNumber = normalize(sock.user.id);
      const senderNormalized = normalize(sender);

      const isBotAdmins = groupAdmins.includes(botNumber);
      const isAdmins = groupAdmins.includes(senderNormalized);

      if (!isBotAdmins) return reply('❌ I need to be an admin to promote members.');
      if (!isAdmins) return reply('❌ Only group admins can use this command.');

      let target = [];

      if (quoted) target.push(quoted.sender);
      else if (mentionedJid.length > 0) target.push(...mentionedJid);
      else return reply('⚠️ Reply or mention the member you want to promote.');

      // Normalize targets
      target = target.map(normalize).filter(id => !groupAdmins.includes(id));

      if (target.length === 0) return reply('⚠️ That user is already an admin or invalid.');

      for (const user of target) {
        await sock.groupParticipantsUpdate(m.chat, [user], 'promote');
      }

      await reply(`✅ Promoted ${target.map(u => '@' + u.split('@')[0]).join(', ')}`, { mentions: target });
    } catch (err) {
      console.error('Promote error:', err);
      await reply('❌ Failed to promote member(s).');
    }
  }
};
