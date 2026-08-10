import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { isStudent, isAuthorizedUser } from '../middlewares/roleMiddleware.js';
import { startQuiz, getMyAttempts, getAttemptById } from '../controllers/attemptController.js';

const router = express.Router({ mergeParams: true }); // Used so we can mount under /quizzes/:quizId/start

// These assume mounting at /quizzes/:quizId/start (or similar) in app.js
router.post('/', authenticate, isStudent, startQuiz);

// These assume mounting at /attempts
router.get('/', authenticate, isStudent, getMyAttempts);
router.get('/:id', authenticate, isAuthorizedUser, getAttemptById);

export default router;