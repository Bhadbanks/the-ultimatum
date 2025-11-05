module.exports = {
  command: 'kick',
  category: 'group',
  description: 'Remove a member from the group',
  group: true,
  admin: true,

  async execute(sock, m, ctx) {
    const { reply, mentionedJid = [], quoted, participants, isBotAdmins, isAdmins } = ctx;

    try {
      if (!m.isGroup) return reply('❌ This command only works in groups.');
      if (!isBotAdmins) return reply('❌ I need to be an admin to use this command.');
      if (!isAdmins) return reply('❌ Only group admins can use this command.');

      let target = [];

      // Check for reply or mention
      if (quoted) {
        target.push(quoted.sender);
      } else if (mentionedJid.length > 0) {
        target.push(...mentionedJid);
      } else {
        return reply('⚠️ Reply or mention the member you want to kick.');
      }

      // Filter out admins (bot can’t kick admins)
      const groupAdmins = participants.filter(p => p.admin).map(a => a.id);
      target = target.filter(id => !groupAdmins.includes(id));

      if (target.length === 0) return reply('⚠️ Cannot remove admins or invalid targets.');

      // Kick them
      for (const user of target) {
        await sock.groupParticipantsUpdate(m.chat, [user], 'remove');
      }

      await reply(`✅ Removed ${target.map(u => '@' + u.split('@')[0]).join(', ')}`, { mentions: target });
    } catch (err) {
      console.error('Kick error:', err);
      await reply('❌ Failed to remove member(s).');
    }
  }
};
