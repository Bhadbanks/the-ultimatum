// library/connection/connection.js
const chalk = require("chalk")

let reconnecting = false;

module.exports = {
  konek: async ({ sock, update, clientstart, DisconnectReason, Boom }) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log(chalk.red(`⚠️ Disconnected. Reason code: ${reason}`));

      switch (reason) {
        case DisconnectReason.badSession:
          console.log(chalk.red("❌ Bad session file. Please delete and scan again."));
          process.exit(1);
          break;

        case DisconnectReason.connectionClosed:
        case DisconnectReason.connectionLost:
        case DisconnectReason.timedOut:
        case DisconnectReason.restartRequired:
          if (!reconnecting) {
            reconnecting = true;
            console.log(chalk.yellow("🔄 Attempting to reconnect..."));
            setTimeout(() => {
              reconnecting = false;
              clientstart();
            }, 5000);
          }
          break;

        case DisconnectReason.connectionReplaced:
          console.log(chalk.red("🚫 Connection replaced (another session logged in)."));
          process.exit(0);
          break;

        case DisconnectReason.loggedOut:
          console.log(chalk.red("🚫 Logged out. Please delete session folder and scan again."));
          process.exit(0);
          break;

        default:
          console.log(chalk.yellow(`⚠️ Unknown reason: ${reason}. Reconnecting safely...`));
          if (!reconnecting) {
            reconnecting = true;
            setTimeout(() => {
              reconnecting = false;
              clientstart();
            }, 5000);
          }
      }
    } else if (connection === "open") {
      console.log(chalk.green("✅ Successfully connected to bot!"));
    }
  }
};
