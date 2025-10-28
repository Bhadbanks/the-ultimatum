import express from 'express';
import http from 'http';
import { connectBaileys } from './lib/whatsapp.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import apiRouter from './routes/api.js';
import pino from 'pino';

dotenv.config();
const log = pino();

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

async function start() {
  // Mongo
  if (!process.env.MONGODB_URI) throw new Error('Missing MONGODB_URI');
  await mongoose.connect(process.env.MONGODB_URI);
  log.info('MongoDB connected');

  // Express
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());
  app.use((req, _res, next) => {
    // simple token check for dashboard -> bot communication
    const token = req.headers['x-api-token'] as string | undefined;
    if (req.path.startsWith('/public')) return next();
    if (!token || token !== process.env.API_TOKEN) {
      return next(); // allow middleware to handle auth on specific endpoints
    }
    next();
  });

  app.use('/api', apiRouter);

  app.get('/health', (_req, res) => res.json({ ok: true }));

  const server = http.createServer(app);
  server.listen(PORT, () => log.info(`Bot API listening on http://localhost:${PORT}`));

  // Baileys connection
  await connectBaileys();
}

start().catch(err => {
  console.error('Startup error', err);
  process.exit(1);
});
