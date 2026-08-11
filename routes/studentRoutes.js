import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { isStudent } from '../middlewares/roleMiddleware.js';
import { getStudentDashboardStats } from '../controllers/studentDashboardController.js';

const router = express.Router();

// Mount at /student/dashboard
router.get('/dashboard', authenticate, isStudent, getStudentDashboardStats);

export default router;