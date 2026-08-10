import { prisma } from '../lib/prisma.js';

export const getDashboardStats = async (req, res) => {
    try {
        const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
        const totalQuizzes = await prisma.quiz.count();
        const publishedQuizzes = await prisma.quiz.count({ where: { status: 'PUBLISHED' } });
        const draftQuizzes = await prisma.quiz.count({ where: { status: 'DRAFT' } });
        const totalQuestions = await prisma.question.count();
        const totalAttempts = await prisma.attempt.count();

        const passedAttempts = await prisma.attempt.count({ where: { status: 'PASSED' } });
        const failedAttempts = await prisma.attempt.count({ where: { status: 'FAILED' } });

        const avgScoreAgg = await prisma.attempt.aggregate({
            _avg: { percentage: true }
        });
        const averageScore = avgScoreAgg._avg.percentage ? Number(avgScoreAgg._avg.percentage.toFixed(2)) : 0;

        res.status(200).json({
            totalStudents,
            totalQuizzes,
            publishedQuizzes,
            draftQuizzes,
            totalQuestions,
            totalAttempts,
            averageScore,
            passedAttempts,
            failedAttempts
        });
    } catch (error) {
        console.error("DASHBOARD STATS ERROR:", error);
        res.status(500).json({ message: 'Error fetching dashboard statistics.' });
    }
};