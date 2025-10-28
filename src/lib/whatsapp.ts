import { Boom } from '@hapi/boom';
import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import pino from 'pino';

const log = pino();

export let sock: ReturnType<typeof makeWASocket> | null = null;

export async function connectBaileys() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update as any;
    if (connection === 'close') {
      const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
      log.warn('connection closed, reason %s', reason);
      // reconnect logic: call connectBaileys again
      setTimeout(() => connectBaileys().catch(console.error), 2000);
    } else if (connection === 'open') {
      log.info('WhatsApp connection open');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (!messages || !messages[0]) return;
    const m = messages[0];
    // ignore status messages
    if (m.key && m.key.remoteJid === 'status@broadcast') return;

    try {
      // minimal command handler: ping
      if (m.message?.conversation?.startsWith('!ping')) {
        await sock?.sendMessage(m.key.remoteJid!, { text: 'Pong!' }, { quoted: m });
      }
      // XP increment, automod, verification logic hooks would go here

    } catch (err) {
      console.error('message handler error', err);
    }
  });

  // print QR from baileys events if available
  sock.ev.on('connection.update', (update) => {
    if ((update as any).qr) {
      qrcode.generate((update as any).qr, { small: true });
    }
  });

  return sock;
        }
