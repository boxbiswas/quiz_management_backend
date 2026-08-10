import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin, isAuthorizedUser } from '../middleware/roleMiddleware.js';
import { getQuizzes, getQuizById, createQuiz, updateQuiz, deleteQuiz, updateQuizStatus } from '../controllers/quizController.js';

const router = express.Router();

// --- SHARED ROUTES (Requires Auth, Admin/Student handled in controller) ---
router.get('/', authenticate, isAuthorizedUser, getQuizzes);
router.get('/:id', authenticate, isAuthorizedUser, getQuizById);

// --- ADMIN ONLY ROUTES ---
router.post('/', authenticate, isAdmin, createQuiz);
router.put('/:id', authenticate, isAdmin, updateQuiz);
router.delete('/:id', authenticate, isAdmin, deleteQuiz);
router.patch('/:id/publish', authenticate, isAdmin, updateQuizStatus);

export default router;