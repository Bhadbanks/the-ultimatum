const yts = require('yt-search');
const axios = require('axios');

module.exports = {
    command: 'play',
    description: '```Download/play YouTube music```',
    category: 'downloader',
    execute: async (sock, m, {
        args,
        text,
        q,
        quoted,
        mime,
        qmsg,
        isMedia,
        groupMetadata,
        groupName,
        participants,
        groupOwner,
        groupAdmins,
        isBotAdmins,
        isAdmins,
        isGroupOwner,
        isCreator,
        prefix,
        reply,
        config,
        sender
    }) => {
        try {
            if (!text) {
                return await reply(`🎧 *༺𝕿𝖍𝖊 𝕴𝖑𝖙𝖎𝖒𝖆𝖙𝖚𝖒༻*\n\n┌─❖\n│ ✦ Need a song name!\n│ ✦ Example: ${prefix}play Celine Dion Zinoleesky\n└───────────────◉`);
            }

            // Initial reaction - music note
            await sock.sendMessage(m.chat, { 
                react: { text: "🎶", key: m.key } 
            });

            let processingMsg = await sock.sendMessage(m.chat, { 
                text: `🔍 *Searching for:* \"${text}\"\n⏳ Please wait...` 
            }, { quoted: m });

            const { videos } = await yts(text);
            if (!videos || videos.length === 0) {
                await sock.sendMessage(m.chat, { 
                    react: { text: "😔", key: m.key } 
                });
                await sock.sendMessage(m.chat, { 
                    text: "❌ *No Results Found*\n\nI couldn't find any songs with that name.\n💡 Try different keywords or check spelling!" 
                }, { quoted: m });
                return;
            }

            const video = videos[0];
            
            // Update reaction to searching
            await sock.sendMessage(m.chat, { 
                react: { text: "🔍", key: m.key } 
            });

            // Update message to found
            await sock.sendMessage(m.chat, { 
                text: `✅ *Song Found!*\n\n🎵 *${video.title}*\n⏱️ ${video.timestamp} | 👁️ ${video.views}\n\n⬇️ Starting download...` ,
                edit: processingMsg.key
            });

            // Downloading reaction
            await sock.sendMessage(m.chat, { 
                react: { text: "⬇️", key: m.key } 
            });

            const apiUrl = `https://yt-dl.officialhectormanuel.workers.dev/?url=${encodeURIComponent(video.url)}`;
            const response = await axios.get(apiUrl);
            const data = response.data;

            if (!data?.status || !data.audio) {
                await sock.sendMessage(m.chat, { 
                    react: { text: "😢", key: m.key } 
                });
                await sock.sendMessage(m.chat, { 
                    text: "🚫 *Download Failed*\n\nThe audio service is currently unavailable.\n⚡ Try again in a few minutes!" 
                }, { quoted: m });
                return;
            }

            // Success reaction sequence
            await sock.sendMessage(m.chat, { 
                react: { text: "⚡", key: m.key } 
            });

            // Final update before sending audio
            await sock.sendMessage(m.chat, { 
                text: `🎉 *Ready to Play!*\n\n🎵 ${data.title || video.title}\n✅ Download successful!\n\n🎶 Sending audio now...` ,
                edit: processingMsg.key
            });

            // Send the audio file
            await sock.sendMessage(m.chat, {
                audio: { url: data.audio },
                mimetype: "audio/mpeg", 
                fileName: `🎵 ${(data.title || video.title).substring(0, 50)}.mp3`,
                contextInfo: {
                    mentionedJid: [sender],
                    externalAdReply: {
                        title: "🎧 ༺𝕿𝖍𝖊 𝕴𝖑𝖙𝖎𝖒𝖆𝖙𝖚𝖒༻",
                        body: "by: ༺𝕷𝖔𝖜𝖐𝖊𝖞 𝕴𝖘 𝕳𝖎𝖒༻ᵀʰᵉ ᵁˡᵗᶦᵐᵃᵗᵘᵐ!",
                        thumbnailUrl: video.thumbnail,
                        sourceUrl: "",
                        mediaType: 1
                    }
                }
            }, { quoted: m });

            // Final success reaction
            await sock.sendMessage(m.chat, { 
                react: { text: "✅", key: m.key } 
            });

        } catch (error) {
            console.error('Error in play command:', error);
            await sock.sendMessage(m.chat, { 
                react: { text: "💀", key: m.key } 
            });
            await reply("💥 *Oops! Something broke*\n\n❌ An unexpected error occurred\n🔧 Our team has been notified\n💫 Try again in a few minutes");
        }
    }
};
