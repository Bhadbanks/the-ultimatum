const config = require('./settings/config');
const fs = require('fs');
const crypto = require("crypto");
const path = require("path");
const os = require('os');
const chalk = require("chalk");
const axios = require('axios');
const { exec } = require('child_process');
const { dechtml, fetchWithTimeout } = require('./library/function');
const { tempfiles } = require("./library/uploader");
const { fquoted } = require('./library/quoted');
const Api = require('./library/Api');

const image = fs.readFileSync('./thumbnail/image.jpg');
const docu = fs.readFileSync('./thumbnail/document.jpg');

let jidNormalizedUser, getContentType, isPnUser;

const loadBaileysUtils = async () => {
    const baileys = await import('@whiskeysockets/baileys');
    jidNormalizedUser = baileys.jidNormalizedUser;
    getContentType = baileys.getContentType;
    isPnUser = baileys.isPnUser;
};

// 🔧 Helper to normalize JID for consistent admin checks
const normalizeJid = id => id ? id.replace(/:\d+/, '') : id;

// 🔌 Plugin Loader System
class PluginLoader {
    constructor() {
        this.plugins = new Map();
        this.categories = new Map();
        this.pluginsDir = path.join(__dirname, 'plugins');
        this.defaultCategories = {
            'ai': '🤖 AI MENU',
            'downloader': '📥 DOWNLOAD MENU',
            'fun': '🎮 FUN MENU',
            'general': '⚡ GENERAL MENU',
            'group': '👥 GROUP MENU',
            'owner': '👑 OWNER MENU',
            'other': '📦 OTHER MENU',
            'tools': '🛠️ TOOLS MENU',
            'video': '🎬 VIDEO MENU'
        };
        this.loadPlugins();
    }

    loadPlugins() {
        try {
            if (!fs.existsSync(this.pluginsDir)) {
                fs.mkdirSync(this.pluginsDir, { recursive: true });
                console.log(chalk.cyan('📁 Created plugins directory'));
                return;
            }

            const pluginFiles = fs.readdirSync(this.pluginsDir).filter(file =>
                file.endsWith('.js') && !file.startsWith('_')
            );

            this.plugins.clear();
            this.categories.clear();

            Object.keys(this.defaultCategories).forEach(cat => {
                this.categories.set(cat, []);
            });

            for (const file of pluginFiles) {
                try {
                    const pluginPath = path.join(this.pluginsDir, file);
                    const plugin = require(pluginPath);

                    if (plugin.command && typeof plugin.execute === 'function') {
                        if (!plugin.category) plugin.category = 'general';
                        if (!this.categories.has(plugin.category)) {
                            this.categories.set(plugin.category, []);
                        }

                        this.plugins.set(plugin.command, plugin);
                        this.categories.get(plugin.category).push(plugin.command);

                        console.log(chalk.green(`✅ Loaded plugin: ${plugin.command} (${plugin.category})`));
                    } else {
                        console.log(chalk.yellow(`⚠️ Invalid plugin structure in: ${file}`));
                    }
                } catch (error) {
                    console.log(chalk.red(`❌ Failed to load plugin ${file}:`, error.message));
                }
            }

            console.log(chalk.cyan(`📦 Loaded ${this.plugins.size} plugins across ${this.categories.size} categories`));
        } catch (error) {
            console.log(chalk.red('❌ Error loading plugins:', error.message));
        }
    }

    async executePlugin(command, sock, m, ctx) {
        const plugin = this.plugins.get(command);
        if (!plugin) return false;

        try {
            if (plugin.owner && !ctx.isCreator) return true;
            if (plugin.group && !m.isGroup) return true;
            if (plugin.admin && m.isGroup && !ctx.isAdmins && !ctx.isCreator) return true;

            await plugin.execute(sock, m, ctx);
            return true;
        } catch (error) {
            console.log(chalk.red(`❌ Error executing plugin ${command}:`, error));
            return true;
        }
    }

    getMenuSections() {
        const sections = [];
        const sortedCategories = Array.from(this.categories.entries())
            .filter(([category, commands]) => commands.length > 0 && this.defaultCategories[category])
            .sort(([catA], [catB]) => this.defaultCategories[catA].localeCompare(this.defaultCategories[catB]));

        for (const [category, commands] of sortedCategories) {
            const categoryName = this.defaultCategories[category];
            const sortedCommands = commands.sort();
            const commandList = sortedCommands.map(cmd => {
                const plugin = this.plugins.get(cmd);
                return `︱✗ ${cmd}${plugin.description ? ` - ${plugin.description}` : ''}`;
            }).join('\n');
            sections.push(`╾─╼▣ ${categoryName}\n${commandList}\n╿─╼▣`);
        }

        return sections.join('\n\n');
    }

    getPluginCount() {
        let count = 0;
        for (const commands of this.categories.values()) count += commands.length;
        return count;
    }

    reloadPlugins() {
        const pluginFiles = fs.readdirSync(this.pluginsDir).filter(file =>
            file.endsWith('.js') && !file.startsWith('_')
        );
        for (const file of pluginFiles) {
            const pluginPath = path.join(this.pluginsDir, file);
            delete require.cache[require.resolve(pluginPath)];
        }
        this.loadPlugins();
    }
}

const pluginLoader = new PluginLoader();

// 💫 MAIN HANDLER
module.exports = sock = async (sock, m) => {
    try {
        if (!jidNormalizedUser || !getContentType || !isPnUser) {
            await loadBaileysUtils();
        }

        const body =
            m.mtype === "conversation" ? m.message.conversation :
            m.mtype === "imageMessage" ? m.message.imageMessage.caption :
            m.mtype === "videoMessage" ? m.message.videoMessage.caption :
            m.mtype === "extendedTextMessage" ? m.message.extendedTextMessage.text :
            m.mtype === "buttonsResponseMessage" ? m.message.buttonsResponseMessage.selectedButtonId :
            m.mtype === "listResponseMessage" ? m.message.listResponseMessage.singleSelectReply.selectedRowId :
            m.text || '';

        const sender = m.key.fromMe
            ? sock.user.id
            : m.key.participant || m.key.remoteJid;

        const senderNumber = sender.split('@')[0];
        const prefix = /^[°zZ#$@*+,.?=''():√%!¢£¥€π¤ΩΦ_&><`™©®Δ^βα~¦|/\\©^]/.test(body)
            ? body.match(/^[°zZ#$@*+,.?=''():√%!¢£¥€π¤ΩΦ_&><`™©®Δ^βα~¦|/\\©^]/)[0]
            : '.';
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);
        const text = args.join(' ');
        const quoted = m.quoted ? m.quoted : m;
        const mime = (quoted.msg || quoted).mimetype || '';
        const qmsg = (quoted.msg || quoted);
        const isMedia = /image|video|sticker|audio/.test(mime);
        const groupMetadata = m.isGroup ? await sock.groupMetadata(m.chat).catch(() => ({})) : {};
        const participants = groupMetadata.participants || [];
        const groupAdmins = participants
            .filter(p => p.admin)
            .map(p => normalizeJid(p.id));
        const groupOwner = groupMetadata.owner ? normalizeJid(groupMetadata.owner) : '';
        const botNumber = normalizeJid(sock.user.id);
        const isBotAdmins = groupAdmins.includes(botNumber);
        const isAdmins = groupAdmins.includes(normalizeJid(m.sender));
        const isGroupOwner = groupOwner === normalizeJid(m.sender);
        const isCreator = normalizeJid(m.sender) === botNumber;

        const reply = async (text) => {
            return sock.sendMessage(m.chat, { text }, { quoted: m });
        };

        const ctx = {
            args, text, q: text, quoted, mime, qmsg, isMedia,
            groupMetadata, participants, groupAdmins, groupOwner,
            isBotAdmins, isAdmins, isGroupOwner, isCreator,
            prefix, reply, config, sender, botNumber
        };

        // 🔹 Execute Plugin
        const executed = await pluginLoader.executePlugin(command, sock, m, ctx);
        if (executed) return;

        // 🔹 Built-in Menu & Reload
        switch (command) {
            case 'menu': {
                const uptime = process.uptime();
                const uptimeText = new Date(uptime * 1000).toISOString().substr(11, 8);
                const totalCommands = pluginLoader.getPluginCount();
                const pluginMenuSections = pluginLoader.getMenuSections();

                const caption = `
╔〘 *༺𝕿𝖍𝖊 𝕴𝖑𝖙𝖎𝖒𝖆𝖙𝖚𝖒༻* 〙
║ 👑 Owner: ༺𝕷𝖔𝖜𝖐𝖊𝖞 𝕴𝖘 𝕳𝖎𝖒༻ᵀʰᵉ ᵁˡᵗᶦᵐᵃᵗᵘᵐ
║ ⚙️ Mode: ${sock.public ? 'Public' : 'Self'}
║ 🧩 Commands: ${totalCommands}
║ ⏳ Uptime: ${uptimeText}
╚═〘 *Menu List* 〙

${pluginMenuSections}`;

                await sock.sendMessage(m.chat, {
                    image,
                    caption,
                    contextInfo: {
                        mentionedJid: [m.sender],
                        externalAdReply: {
                            title: "Lightweight | Premium | Fast",
                            body: "Official Dev Account",
                            mediaType: 3,
                            thumbnailUrl: config.thumbUrl,
                            mediaUrl: "https://t.me/im_just_lowkey",
                            sourceUrl: "https://t.me/im_just_lowkey",
                            showAdAttribution: true
                        }
                    }
                }, { quoted: m });
                break;
            }

            case 'reload': {
                if (!isCreator) return;
                pluginLoader.reloadPlugins();
                await reply(`✅ Plugins reloaded successfully (${pluginLoader.getPluginCount()} total).`);
                break;
            }
        }
    } catch (err) {
        console.error(chalk.red('❌ Handler Error:'), err);
    }
};

let file = require.resolve(__filename);
require('fs').watchFile(file, () => {
    require('fs').unwatchFile(file);
    console.log(chalk.greenBright(`${__filename} updated!`));
    delete require.cache[file];
    require(file);
});
