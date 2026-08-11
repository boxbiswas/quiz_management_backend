import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { isAuthorizedUser } from '../middlewares/roleMiddleware.js';
import { getLeaderboard } from '../controllers/leaderboardController.js';

const router = express.Router();

router.get('/', authenticate, isAuthorizedUser, getLeaderboard);

export default router;