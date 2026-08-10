import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { isAdmin, isAuthorizedUser } from '../middlewares/roleMiddleware.js';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController.js';

const router = express.Router();

router.get('/', authenticate, isAuthorizedUser, getCategories);

router.post('/', authenticate, isAdmin, createCategory);
router.put('/:id', authenticate, isAdmin, updateCategory);
router.delete('/:id', authenticate, isAdmin, deleteCategory);

export default router;