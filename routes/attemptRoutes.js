import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { isStudent, isAuthorizedUser } from '../middlewares/roleMiddleware.js';
import { startQuiz, submitQuiz, getMyAttempts, getAttemptById } from '../controllers/attemptController.js';

const router = express.Router({ mergeParams: true }); // Used so we can mount under /quizzes/:quizId/start

// These assume mounting at /quizzes/:quizId/start (or similar) in app.js
router.post('/start', authenticate, isStudent, startQuiz);

// Mount at /quizzes/:quizId/submit
router.post('/submit', authenticate, isStudent, submitQuiz);

// These assume mounting at /attempts
router.get('/', authenticate, isStudent, getMyAttempts);
router.get('/:id', authenticate, isAuthorizedUser, getAttemptById);

export default router;