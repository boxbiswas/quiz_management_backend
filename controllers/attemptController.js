import { prisma } from '../lib/prisma.js';

// POST /quizzes/:quizId/start
export const startQuiz = async (req, res) => {
    try {
        const quizId = parseInt(req.params.quizId);
        const userId = req.user.id;

        // 1. Fetch Quiz & Questions (Exclude isCorrect for security)
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: {
                questions: {
                    select: {
                        id: true,
                        questionText: true,
                        marks: true,
                        options: { select: { id: true, optionText: true } }
                    }
                }
            }
        });

        // 2. Validate existence and published status
        if (!quiz || quiz.status !== 'PUBLISHED') {
            return res.status(404).json({ message: 'Quiz not found or not available.' });
        }

        // 3. Check for existing IN_PROGRESS attempt (Handles page refresh)[cite: 1]
        const activeAttempt = await prisma.attempt.findFirst({
            where: { quizId, userId, status: 'IN_PROGRESS' }
        });

        if (activeAttempt) {
            const expiryTime = new Date(activeAttempt.startedAt.getTime() + quiz.duration * 60000);
            return res.status(200).json({
                message: 'Resuming active quiz attempt.',
                attempt: activeAttempt,
                expiryTime,
                questions: quiz.questions
            });
        }

        // 4. Validate Maximum Attempts[cite: 1]
        const totalAttempts = await prisma.attempt.count({
            where: { quizId, userId }
        });

        if (totalAttempts >= quiz.maxAttempts) {
            return res.status(403).json({ message: 'Maximum attempts reached for this quiz.' });
        }

        // 5. Create new attempt
        const newAttempt = await prisma.attempt.create({
            data: {
                quizId,
                userId,
                status: 'IN_PROGRESS'
            }
        });

        // Calculate secure backend expiry time (duration in minutes converted to milliseconds)
        const expiryTime = new Date(newAttempt.startedAt.getTime() + quiz.duration * 60000);

        res.status(201).json({
            message: 'Quiz started successfully.',
            attempt: newAttempt,
            expiryTime, // The frontend will use this to run its visual timer
            questions: quiz.questions
        });

    } catch (error) {
        res.status(500).json({ message: 'Error starting quiz.' });
    }
};

// GET /attempts
export const getMyAttempts = async (req, res) => {
    try {
        const attempts = await prisma.attempt.findMany({
            where: { userId: req.user.id },
            include: {
                quiz: { select: { title: true, category: { select: { name: true } } } }
            },
            orderBy: { startedAt: 'desc' }
        });

        res.status(200).json(attempts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attempts.' });
    }
};

// GET /attempts/:id
export const getAttemptById = async (req, res) => {
    try {
        const attemptId = parseInt(req.params.id);

        const attempt = await prisma.attempt.findUnique({
            where: { id: attemptId },
            include: {
                quiz: { select: { title: true, duration: true, passingScore: true } },
                answers: { include: { question: true, selectedOption: true } } // For Day 9 Review
            }
        });

        if (!attempt) {
            return res.status(404).json({ message: 'Attempt not found.' });
        }

        // Security check: Only the student who owns it (or an Admin) can view it
        if (req.user.role === 'STUDENT' && attempt.userId !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized to view this attempt.' });
        }

        res.status(200).json(attempt);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attempt details.' });
    }
};