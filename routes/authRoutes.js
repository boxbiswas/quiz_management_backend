import express from 'express';
const router = express.Router();
import { registerUser, loginUser, logoutUser, forgotPassword, resetPassword } from '../controllers/authController.js';


router.post('/registerUser', registerUser);
router.post('/loginUser', loginUser);
router.post('/logoutUser', logoutUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;