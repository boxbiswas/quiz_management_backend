import "dotenv/config";
import express from 'express';

import cookieParser from 'cookie-parser';
import cors from 'cors';

import { prisma } from "./lib/prisma.js";

const app = express();

// Cors configuration
app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://quiz-management-frontend-gamma.vercel.app/"
    ],
    credentials: true, // This allows the cookies to be sent back and forth
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cookie']
}))


import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import attemptRoutes from './routes/attemptRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Import routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/quizzes', quizRoutes);
app.use('/categories', categoryRoutes);
app.use('/attempts', attemptRoutes);
app.use('/student', studentRoutes);
app.use('/leaderboard', leaderboardRoutes);

// For nested routes
app.use('/quizzes/:quizId/questions', questionRoutes);
app.use('/questions', questionRoutes);

// Mount the start quiz route specifically on the quizzes path
app.use('/quizzes/:quizId', attemptRoutes);


const PORT = process.env.PORT;

// Explicitly bind to 0.0.0.0 so Railway's proxy can route traffic to it
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});