import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/roleMiddleware.js';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { getUsers, getUserById, updateUser, updateUserStatus, deleteUser } from '../controllers/userController.js';

const router = express.Router();

// Apply auth and admin check to all routes in this file
router.use(authenticate, isAdmin);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// User Management
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.patch('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

export default router;