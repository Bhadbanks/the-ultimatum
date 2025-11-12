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

// ✅ Helper for normalized JIDs (to fix bot admin detection)
const normalizeJid = id => id ? id.replace(/:\d+/, '') : id;

// Plugin Loader System
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
      // Owner-only
      if (plugin.owner && !ctx.isCreator) return true;
      // Group-only
      if (plugin.group && !m.isGroup) return true;
      // Admin-only
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
      .filter(([cat, cmds]) => cmds.length > 0 && this.defaultCategories[cat])
      .sort(([a], [b]) => this.defaultCategories[a].localeCompare(this.defaultCategories[b]));

    for (const [cat, cmds] of sortedCategories) {
      const name = this.defaultCategories[cat];
      const sorted = cmds.sort();
      const list = sorted.map(cmd => {
        const p = this.plugins.get(cmd);
        return `︱✗ ${cmd}${p.description ? ` - ${p.description}` : ''}`;
      }).join('\n');
      sections.push(`╾─╼▣ ${name}\n${list}\n╿─╼▣`);
    }

    return sections.join('\n\n');
  }

  getPluginCount() {
    return Array.from(this.plugins.values()).length;
  }

  reloadPlugins() {
    const files = fs.readdirSync(this.pluginsDir).filter(f => f.endsWith('.js') && !f.startsWith('_'));
    for (const f of files) delete require.cache[require.resolve(path.join(this.pluginsDir, f))];
    this.loadPlugins();
  }
}

const pluginLoader = new PluginLoader();

module.exports = sock = async (sock, m, chatUpdate, store) => {
  try {
    if (!jidNormalizedUser || !getContentType || !isPnUser) await loadBaileysUtils();

    const body =
      m.mtype === "conversation" ? m.message.conversation :
      m.mtype === "imageMessage" ? m.message.imageMessage.caption :
      m.mtype === "videoMessage" ? m.message.videoMessage.caption :
      m.mtype === "extendedTextMessage" ? m.message.extendedTextMessage.text :
      m.mtype === "buttonsResponseMessage" ? m.message.buttonsResponseMessage.selectedButtonId :
      m.mtype === "listResponseMessage" ? m.message.listResponseMessage.singleSelectReply.selectedRowId :
      m.mtype === "templateButtonReplyMessage" ? m.message.templateButtonReplyMessage.selectedId :
      m.mtype === "interactiveResponseMessage" ? JSON.parse(m.msg.nativeFlowResponseMessage.paramsJson).id :
      "";

    const sender = m.key.fromMe ? sock.user.id : (m.key.participant || m.key.remoteJid);
    const senderNumber = sender.split('@')[0];
    const botNumber = normalizeJid(sock.user.id);
    const prefa = ["", "!", ".", ",", "🤖", "🗿"];
    const prefixRegex = /^[°zZ#$@*+,.?=''():√%!¢£¥€π¤ΩΦ_&><`™©®Δ^βα~¦|/\\©^]/;
    const prefix = prefixRegex.test(body) ? body.match(prefixRegex)[0] : '.';
    const from = m.key.remoteJid;
    const isGroup = from.endsWith("@g.us");

    const isCmd = body.startsWith(prefix);
    const command = isCmd ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : '';
    const args = body.trim().split(/ +/).slice(1);
    const text = args.join(" ");
    const quoted = m.quoted ? m.quoted : m;
    const mime = (quoted.msg || quoted).mimetype || '';
    const qmsg = (quoted.msg || quoted);
    const isMedia = /image|video|sticker|audio/.test(mime);
    const groupMetadata = isGroup ? await sock.groupMetadata(m.chat).catch(() => ({})) : {};
    const groupName = isGroup ? groupMetadata.subject || '' : '';
    const participants = isGroup ? groupMetadata.participants || [] : [];
    const groupOwner = isGroup ? normalizeJid(groupMetadata.owner || '') : '';
    const groupAdmins = participants.filter(p => p.admin).map(p => normalizeJid(p.id));
    const isBotAdmins = isGroup ? groupAdmins.includes(normalizeJid(botNumber)) : false;
    const isAdmins = isGroup ? groupAdmins.includes(normalizeJid(m.sender)) : false;
    const isGroupOwner = isGroup ? normalizeJid(groupOwner) === normalizeJid(m.sender) : false;
    const isCreator = normalizeJid(m.sender) === normalizeJid(config.owner);

    async function reply(text) {
      await sock.sendMessage(m.chat, {
        text,
        contextInfo: {
          mentionedJid: [m.sender],
          externalAdReply: {
            title: config.settings.title,
            body: config.settings.description,
            thumbnailUrl: config.thumbUrl,
            renderLargerThumbnail: false
          }
        }
      }, { quoted: m });
    }

    const ctx = {
      args, text, q: text, quoted, mime, qmsg, isMedia,
      groupMetadata, groupName, participants, groupOwner,
      groupAdmins, isBotAdmins, isAdmins, isGroupOwner,
      isCreator, prefix, reply, config, sender
    };

    // Execute Plugin
    const pluginExecuted = await pluginLoader.executePlugin(command, sock, m, ctx);
    if (pluginExecuted) return;

    // Built-in Commands
    switch (command) {
      case 'menu': {
        const usedMem = process.memoryUsage().heapUsed / 1024 / 1024;
        const totalMem = os.totalmem() / 1024 / 1024 / 1024;
        const uptimeSec = process.uptime();
        const uptime = `${Math.floor(uptimeSec / 3600)}h ${Math.floor(uptimeSec % 3600 / 60)}m ${Math.floor(uptimeSec % 60)}s`;
        const ping = Date.now() - m.messageTimestamp * 1000;
        const mode = sock.public ? 'Public' : 'Self';
        const menuText = `
╔〘 *༺𝕿𝖍𝖊 𝕴𝖑𝖙𝖎𝖒𝖆𝖙𝖚𝖒༻*
║ 👑 *Owner:* ༺𝕷𝖔𝖜𝖐𝖊𝖞 𝕴𝖘 𝕳𝖎𝖒༻
║ ⚙️ *Mode:* ${mode}
║ ⏳ *Uptime:* ${uptime}
║ ⚡ *Ping:* ${ping.toFixed(0)}ms
╚═〘 *System Status* 〙

${pluginLoader.getMenuSections()}
`;
        await sock.sendMessage(m.chat, { image, caption: menuText }, { quoted: m });
        break;
      }

      case 'reload': {
        if (!isCreator) return;
        pluginLoader.reloadPlugins();
        await reply(`✅ Reloaded plugins! Total: ${pluginLoader.getPluginCount()}`);
        break;
      }
    }

  } catch (err) {
    console.log(chalk.red('❌ Error in message.js:'), err);
  }
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.greenBright(`${__filename} updated!`));
  delete require.cache[file];
  require(file);
});
