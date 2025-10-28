import express from 'express';
import { sock } from '../lib/whatsapp.js';
import GroupModel from '../schemas/group.js';

const router = express.Router();

// auth middleware
router.use((req, res, next) => {
  const token = (req.headers['x-api-token'] || req.query.token) as string | undefined;
  if (!token || token !== process.env.API_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

router.get('/groups', async (req, res) => {
  const groups = await GroupModel.find({}).limit(100).lean();
  res.json({ groups });
});

router.get('/status', (req, res) => {
  res.json({ botConnected: !!sock });
});

export default router;
