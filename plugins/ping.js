module.exports = {
  command: 'ping',
  category: 'general',
  description: 'Check bot response speed',
  async execute(sock, m, ctx) {
    try {
      const start = Date.now();

      // Send initial Pong message
      const sent = await sock.sendMessage(m.chat, { text: 'Pong!' }, { quoted: m });

      // Calculate latency
      const end = Date.now();
      const ping = end - start;

      // Edit the same message to show ping result
      await sock.sendMessage(m.chat, {
        text: `_Pong Response: ${ping}ms_`,
        edit: sent.key, // edit previously sent message
      });

    } catch (err) {
      console.error('ping error:', err);
      ctx.reply('❌ Error while testing ping.');
    }
  }
};
