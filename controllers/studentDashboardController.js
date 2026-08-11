import { prisma } from '../lib/prisma.js';

// GET /student/dashboard
export const getStudentDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch completed attempts for the user to calculate statistics
        const attempts = await prisma.attempt.findMany({
            where: {
                userId,
                status: { in: ['PASSED', 'FAILED'] } // Only aggregate finished quizzes
            },
            orderBy: { startedAt: 'desc' },
            include: {
                quiz: { select: { title: true } }
            }
        });

        // 1. Calculate Core Statistics
        const totalAttempts = attempts.length;
        const passedAttempts = attempts.filter(a => a.status === 'PASSED').length;
        const failedAttempts = attempts.filter(a => a.status === 'FAILED').length;

        const highestScore = totalAttempts > 0
            ? Math.max(...attempts.map(a => a.percentage || 0))
            : 0;

        const totalPercentage = attempts.reduce((sum, a) => sum + (a.percentage || 0), 0);
        const averageScore = totalAttempts > 0
            ? Number((totalPercentage / totalAttempts).toFixed(2))
            : 0;

        // 2. Calculate Total Questions Answered
        // Counts all records in the Answer table for this user where an option was actually selected
        const totalQuestionsAnswered = await prisma.answer.count({
            where: {
                attempt: { userId },
                selectedOptionId: { not: null }
            }
        });

        // 3. Format Recent Attempts (Top 5 for the UI)
        const recentAttempts = attempts.slice(0, 5).map(a => ({
            id: a.id,
            quizTitle: a.quiz.title,
            date: a.startedAt,
            score: a.percentage,
            status: a.status
        }));

        res.status(200).json({
            statistics: {
                totalAttempts,
                passedAttempts,
                failedAttempts,
                averageScore,
                highestScore,
                totalQuestionsAnswered
            },
            recentAttempts,
            performanceData: attempts.map(a => ({
                date: a.startedAt,
                score: a.percentage
            })).reverse() // Reversed for chronological chart rendering on frontend
        });

    } catch (error) {
        console.error("STUDENT DASHBOARD ERROR:", error);
        res.status(500).json({ message: 'Error fetching student dashboard statistics.' });
    }
};