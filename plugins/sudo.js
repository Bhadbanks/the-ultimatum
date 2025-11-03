const fs = require('fs');
const path = require('path');

const ownerFile = path.join(__dirname, '../library/database/owner.json');

// Ensure owner.json exists
if (!fs.existsSync(ownerFile)) {
  fs.writeFileSync(ownerFile, JSON.stringify({ SUDO: [] }, null, 2));
}

// Helper functions
function loadSudo() {
  try {
    const data = JSON.parse(fs.readFileSync(ownerFile, 'utf-8'));
    return Array.isArray(data.SUDO) ? data.SUDO : [];
  } catch {
    return [];
  }
}

function saveSudo(list) {
  fs.writeFileSync(ownerFile, JSON.stringify({ SUDO: list }, null, 2));
}

module.exports = [
  {
    command: 'setsudo',
    category: 'owner',
    description: 'Add a user as SUDO (reply, mention, or number)',
    async execute(sock, m, { text, reply, isCreator }) {
      if (!isCreator) return reply('Only owner can use this command.');

      const input =
        m.quoted?.sender ||
        (m.mentionedJid && m.mentionedJid[0]) ||
        text.replace(/[^0-9]/g, '');

      if (!input) return reply('Usage: .setsudo @user or reply to a message');

      const number = input.replace(/[^0-9]/g, '');
      if (!number) return reply('Invalid number.');

      const sudoList = loadSudo();

      if (sudoList.includes(number)) return reply(`User ${number} is already a SUDO.`);

      sudoList.push(number);
      saveSudo(sudoList);

      reply(`✅ Added *${number}* to SUDO list.`);
    },
  },
  {
    command: 'delsudo',
    category: 'owner',
    description: 'Remove a user from SUDO list',
    async execute(sock, m, { text, reply, isCreator }) {
      if (!isCreator) return reply('Only owner can use this command.');

      const input =
        m.quoted?.sender ||
        (m.mentionedJid && m.mentionedJid[0]) ||
        text.replace(/[^0-9]/g, '');

      if (!input) return reply('Usage: .delsudo @user or reply to a message');

      const number = input.replace(/[^0-9]/g, '');
      const sudoList = loadSudo();

      if (!sudoList.includes(number)) return reply(`User ${number} is not in the SUDO list.`);

      const updatedList = sudoList.filter(n => n !== number);
      saveSudo(updatedList);

      reply(`🗑️ Removed *${number}* from SUDO list.`);
    },
  },
  {
    command: 'getsudo',
    category: 'owner',
    description: 'List all SUDO users',
    async execute(sock, m, { reply }) {
      const sudoList = loadSudo();
      if (!sudoList.length) return reply('No SUDO users found.');
      reply(`👑 *SUDO USERS:*\n${sudoList.map(n => `• ${n}`).join('\n')}`);
    },
  },
];
