const { rmComma, jidToNum, getVars, setVar } = require("../library/function");

module.exports = {
    command: "sudo",
    category: "owner",
    description: "Manage bot SUDO users (setsudo, delsudo, getsudo)",
    owner: true, // only bot owner can use
    async execute(sock, m, { args, reply, isCreator }) {
        try {
            const subCmd = (args[0] || "").toLowerCase();
            const target =
                jidToNum(
                    m.quoted?.sender ||
                    m.mentionedJid?.[0] ||
                    args[1]
                );

            // Load vars
            const vars = await getVars(m.id);
            let sudoList = vars.SUDO || "";

            switch (subCmd) {
                case "add":
                case "set":
                case "setsudo": {
                    if (!isCreator) return; // only owner
                    if (!target)
                        return reply("📌 Example:\n.sudo add 9876543210\nor reply/mention the user.");
                    const SUDO = rmComma(`${sudoList},${target}`);
                    await setVar({ SUDO }, m.id);
                    return reply(`✅ Added new sudo user.\n\n*Current SUDO:* ${SUDO}`);
                }

                case "del":
                case "remove":
                case "delsudo": {
                    if (!isCreator) return;
                    if (!target)
                        return reply("📌 Example:\n.sudo del 9876543210\nor reply/mention the user.");
                    const SUDO = rmComma(sudoList.replace(target, ""));
                    await setVar({ SUDO }, m.id);
                    return reply(`❌ Removed sudo user.\n\n*Current SUDO:* ${SUDO}`);
                }

                case "list":
                case "get":
                case "getsudo":
                default: {
                    if (!sudoList) return reply("⚠️ No sudo users found.");
                    return reply(`🗿 *SUDO Users:*\n${sudoList.split(",").join("\n")}`);
                }
            }
        } catch (err) {
            console.error(err);
            reply(`❌ Error: ${err.message}`);
        }
    },
};
