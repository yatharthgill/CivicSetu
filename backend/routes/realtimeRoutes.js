import express from 'express';
import { protect } from '../middleware/auth.js';
import { streamEvents } from '../controllers/realtimeController.js';

const router = express.Router();

router.get('/stream', protect, streamEvents);

export default router;
