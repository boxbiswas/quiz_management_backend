import { prisma } from '../lib/prisma.js';

// GET /admin/analytics
export const getPlatformAnalytics = async (req, res) => {
    try {
        // 1. Student, Quiz, and Attempt Statistics Overview
        const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
        const totalQuizzes = await prisma.quiz.count();
        const totalAttempts = await prisma.attempt.count();

        // 2. Pass/Fail Analytics & Average Score
        const passedAttempts = await prisma.attempt.count({ where: { status: 'PASSED' } });
        const failedAttempts = await prisma.attempt.count({ where: { status: 'FAILED' } });

        const avgScoreAgg = await prisma.attempt.aggregate({
            _avg: { percentage: true }
        });
        const averageScore = avgScoreAgg._avg.percentage ? Number(avgScoreAgg._avg.percentage.toFixed(2)) : 0;

        // 3. Most Popular Quizzes (Top 5 by Attempt Count)
        const popularQuizzesData = await prisma.quiz.findMany({
            take: 5,
            orderBy: {
                attempts: { _count: 'desc' }
            },
            select: {
                title: true,
                _count: { select: { attempts: true } }
            }
        });

        const popularQuizzes = popularQuizzesData.map(q => ({
            title: q.title,
            attempts: q._count.attempts
        }));

        // 4. Most Popular Categories (Top 5 by Attempt Count)
        const categories = await prisma.category.findMany({
            include: {
                quizzes: {
                    include: {
                        _count: { select: { attempts: true } }
                    }
                }
            }
        });

        const popularCategories = categories.map(cat => {
            const totalCategoryAttempts = cat.quizzes.reduce((sum, quiz) => sum + quiz._count.attempts, 0);
            return { name: cat.name, attempts: totalCategoryAttempts };
        })
            .sort((a, b) => b.attempts - a.attempts)
            .slice(0, 5);

        // 5. Time-Series Data for Charts (Last 30 Days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentAttempts = await prisma.attempt.findMany({
            where: { startedAt: { gte: thirtyDaysAgo } },
            select: { startedAt: true }
        });

        const recentRegistrations = await prisma.user.findMany({
            where: { role: 'STUDENT', createdAt: { gte: thirtyDaysAgo } },
            select: { createdAt: true }
        });

        // Helper function to group records by Date (YYYY-MM-DD) for frontend charts
        const groupByDate = (records, dateField) => {
            const acc = {};
            records.forEach(record => {
                const dateStr = record[dateField].toISOString().split('T')[0];
                acc[dateStr] = (acc[dateStr] || 0) + 1;
            });
            return Object.entries(acc)
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => a.date.localeCompare(b.date)); // Sort chronologically
        };

        const attemptsOverTime = groupByDate(recentAttempts, 'startedAt');
        const registrationsOverTime = groupByDate(recentRegistrations, 'createdAt');

        // Send complete analytics payload
        res.status(200).json({
            statistics: {
                totalStudents,
                totalQuizzes,
                totalAttempts,
                averageScore
            },
            passFailAnalytics: {
                passed: passedAttempts,
                failed: failedAttempts
            },
            popularQuizzes,
            popularCategories,
            charts: {
                attemptsOverTime,
                registrationsOverTime
            }
        });

    } catch (error) {
        console.error("ANALYTICS ERROR:", error);
        res.status(500).json({ message: 'Error fetching platform analytics.' });
    }
};