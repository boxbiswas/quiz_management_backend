import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/roleMiddleware.js';
import { getQuestionsByQuiz, createQuestion, updateQuestion, deleteQuestion } from '../controllers/questionController.js';

const router = express.Router({ mergeParams: true }); // mergeParams is important if mounted under quiz routes

// These routes assume mounting at /api/quizzes/:quizId/questions in app.js
router.get('/', authenticate, isAdmin, getQuestionsByQuiz);
router.post('/', authenticate, isAdmin, createQuestion);

// These routes assume mounting at /api/questions in app.js
router.put('/:id', authenticate, isAdmin, updateQuestion);
router.delete('/:id', authenticate, isAdmin, deleteQuestion);

export default router;