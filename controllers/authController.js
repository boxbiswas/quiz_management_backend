import "dotenv/config";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from "../lib/prisma.js";


// POST /auth/register
export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered.' });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user with default STUDENT role
        const createUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'STUDENT', // Enforced by backend
            },
        });

        res.status(201).json({
            message: 'Student registered successfully',
            user: { id: createUser.id, name: createUser.name, email: createUser.email, role: createUser.role }
        });
    } catch (err) {
        console.error("REGISTER ERROR:", err);
        res.status(500).send({ message: 'Something went wrong during registration' });
    }
};

// POST /auth/login (Handles both Admin and Student)
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Check account status
        if (user.status === 'INACTIVE') {
            return res.status(403).json({ message: 'Account is deactivated. Please contact an admin.' });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Generate token
        let token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 24 * 60 * 60 * 1000 //1 day
        })

        res.status(200).json({
            message: 'Login successful',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error("LOGIN ERROR:", err);
        res.status(500).send({ message: 'Something went wrong during login' });
    }
};

// POST /auth/logout
export const logoutUser = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
    });
    res.status(200).send({ message: 'Logged out successfully' });
};

// POST /auth/forgot-password
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // In a real application, you would generate a unique, time-sensitive token here,
        // save it to the database, and send it via email.
        // For this scope, we simulate generating a reset token.
        const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });

        res.status(200).json({
            message: 'Password reset instructions sent (simulated).',
            resetToken // Returning it here so you can test the next endpoint in Postman
        });
    } catch (err) {
        console.error("FORGOT PASSWORD ERROR:", err);
        res.status(500).send({ message: 'Something went wrong during forgot password' });

    }
};

// POST /auth/reset-password
export const resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;

        // Verify token
        const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);

        // Hash new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update user
        await prisma.user.update({
            where: { id: decoded.id },
            data: { password: hashedPassword }
        });

        res.status(200).json({ message: 'Password reset successfully.' });
    } catch (err) {
        console.error("RESET PASSWORD ERROR:", err);
        res.status(500).send({ message: 'Something went wrong during reset password' });
    }
};

