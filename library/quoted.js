
const fs = require('fs')

const fquoted = {
    channel: {
        key: {
            fromMe: false,
            participant: "0@s.whatsapp.net",
            remoteJid: "27796262030@s.whatsapp.net"
        },
        message: {
            newsletterAdminInviteMessage: {
                newsletterJid: "0@newsletter",
                newsletterName: " X ",
                caption: "༺𝕿𝖍𝖊 𝕴𝖑𝖙𝖎𝖒𝖆𝖙𝖚𝖒༻",
                inviteExpiration: "0"
            }
        }
    }
};

module.exports = { fquoted };

let file = require.resolve(__filename)
require('fs').watchFile(file, () => {
  require('fs').unwatchFile(file)
  console.log('\x1b[0;32m'+__filename+' \x1b[1;32mupdated!\x1b[0m')
  delete require.cache[file]
  require(file)
})

