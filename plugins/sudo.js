const { rmComma, jidToNum, getVars, setVar } = require('../library/function');

module.exports = {
    name: 'sudo',
    description: 'Manage sudo users',
    category: 'tools'
        async execute(sock, m, args) {
        const messageText = m.text || "";
        const fromMe = m.key.fromMe; // check if the sender is the bot owner
        const quotedJid = m.quoted ? m.quoted.sender : null;
        const mentionJid = m.mentionedJid ? m.mentionedJid[0] : null;

        const command = messageText.split(' ')[0].replace('.', '').toLowerCase(); // .setsudo, .delsudo, .getsudo
        let match = messageText.replace(`.${command}`, '').trim();

        match = jidToNum(quotedJid || mentionJid || match);

        if ((command === 'setsudo' || command === 'delsudo') && !fromMe) {
            return sock.sendMessage(m.chat, { text: 'Only the bot owner can use this command.' }, { quoted: m });
        }

        try {
            const vars = await getVars(m.id);
            if (command === 'setsudo') {
                if (!match) return sock.sendMessage(m.chat, { text: 'Example: .setsudo 9876543210 | mention | reply' }, { quoted: m });
                const SUDO = rmComma(`${vars.SUDO || ''},${match}`);
                await setVar({ SUDO }, m.id);
                return sock.sendMessage(m.chat, { text: `New SUDO Numbers are: ${SUDO}` }, { quoted: m });
            }

            if (command === 'delsudo') {
                if (!match) return sock.sendMessage(m.chat, { text: 'Example: .delsudo 9876543210 | mention | reply' }, { quoted: m });
                const SUDO = rmComma(vars.SUDO.replace(match, ''));
                await setVar({ SUDO }, m.id);
                return sock.sendMessage(m.chat, { text: `New SUDO Numbers are: ${SUDO}` }, { quoted: m });
            }

            if (command === 'getsudo') {
                await sock.sendMessage(m.chat, { text: `SUDO Numbers are: ${vars.SUDO || 'None'}` }, { quoted: m });
            }
        } catch (err) {
            return sock.sendMessage(m.chat, { text: err.message }, { quoted: m });
        }
    }
};
