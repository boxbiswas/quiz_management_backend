import express from 'express';
const router = express.Router();
import { registerUser, loginUser, logoutUser, forgotPassword, resetPassword } from '../controllers/authController.js';


router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/forgotPassword', forgotPassword);
router.post('/resetPassword', resetPassword);

export default router;