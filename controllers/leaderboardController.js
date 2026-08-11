import { prisma } from '../lib/prisma.js';

// GET /leaderboard?type=overall&metric=average_score&categoryId=2
export const getLeaderboard = async (req, res) => {
    try {
        const { type = 'overall', metric = 'highest_score', categoryId } = req.query;

        // 1. Determine Date Filters for Weekly/Monthly
        let dateFilter = {};
        const now = new Date();
        if (type === 'weekly') {
            const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = { startedAt: { gte: lastWeek } };
        } else if (type === 'monthly') {
            const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateFilter = { startedAt: { gte: lastMonth } };
        }

        // 2. Determine Category Filter
        let categoryFilter = {};
        if (type === 'category' && categoryId) {
            categoryFilter = { quiz: { categoryId: parseInt(categoryId) } };
        }

        // 3. Fetch Students and their completed attempts with applied filters
        const students = await prisma.user.findMany({
            where: { role: 'STUDENT' },
            select: {
                id: true,
                name: true,
                attempts: {
                    where: {
                        status: { in: ['PASSED', 'FAILED'] },
                        ...dateFilter,
                        ...categoryFilter
                    },
                    select: {
                        percentage: true
                    }
                }
            }
        });

        // 4. Calculate Metrics for Each Student
        const leaderboardData = students.map(student => {
            const attempts = student.attempts;
            const completedQuizzes = attempts.length;

            let highestScore = 0;
            let averageScore = 0;

            if (completedQuizzes > 0) {
                highestScore = Math.max(...attempts.map(a => a.percentage || 0));
                const totalScore = attempts.reduce((sum, a) => sum + (a.percentage || 0), 0);
                averageScore = Number((totalScore / completedQuizzes).toFixed(2));
            }

            return {
                id: student.id,
                name: student.name,
                completedQuizzes,
                highestScore,
                averageScore
            };
        });

        // 5. Filter out students with no relevant attempts
        const activeStudents = leaderboardData.filter(student => student.completedQuizzes > 0);

        // 6. Sort based on the requested metric
        activeStudents.sort((a, b) => {
            if (metric === 'average_score') return b.averageScore - a.averageScore;
            if (metric === 'completed_quizzes') return b.completedQuizzes - a.completedQuizzes;
            return b.highestScore - a.highestScore; // Default to highest_score
        });

        // 7. Assign Ranks
        const rankedLeaderboard = activeStudents.map((student, index) => ({
            rank: index + 1,
            ...student
        }));

        res.status(200).json(rankedLeaderboard);
    } catch (error) {
        console.error("LEADERBOARD ERROR:", error);
        res.status(500).json({ message: 'Error generating leaderboard.' });
    }
};