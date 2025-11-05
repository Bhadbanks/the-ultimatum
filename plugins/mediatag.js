module.exports = {
    command: 'mediatag',
    category: 'group',
    description: '```Tag all members with a media file```',
    group: true,

    async execute(sock, m, { reply, participants, quoted, isMedia }) {
        try {
            if (!m.isGroup) return reply('❌ This command can only be used in groups.');
            
            const mentionedJid = participants.map(p => p.id);
            const mediaMessage = quoted ? quoted : m;

            // Ensure there is a media message
            if (!isMedia && !mediaMessage.mtype.includes('image') && !mediaMessage.mtype.includes('video') && !mediaMessage.mtype.includes('audio') && !mediaMessage.mtype.includes('sticker') && !mediaMessage.mtype.includes('document')) {
                return reply('⚠️ Reply to a media message or send media with .mediatag');
            }

            const mediaType = Object.keys(mediaMessage.message)[0];
            const msgContent = mediaMessage.message[mediaType];

            await sock.sendMessage(m.chat, {
                [mediaType]: msgContent,
                caption: mediaMessage.message[mediaType].caption || '',
                mentions: mentionedJid
            }, { quoted: m });

        } catch (error) {
            console.error('❌ Error in mediatag:', error);
            reply('⚠️ Error while tagging media members.');
        }
    }
};
