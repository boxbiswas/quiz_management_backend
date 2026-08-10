import { prisma } from '../lib/prisma.js';

// GET /quizzes
// Admin sees all. Student sees only PUBLISHED.
export const getQuizzes = async (req, res) => {
    try {
        const whereClause = req.user.role === 'STUDENT' ? { status: 'PUBLISHED' } : {};

        const quizzes = await prisma.quiz.findMany({
            where: whereClause,
            include: { category: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(quizzes);
    } catch (error) {
        console.error("GET QUIZZES ERROR:", error);
        res.status(500).json({ message: 'Error fetching quizzes.' });
    }
};

// GET /quizzes/:id
// Admin sees any. Student sees only if PUBLISHED.
export const getQuizById = async (req, res) => {
    try {
        const quizId = parseInt(req.params.id);
        const whereClause = { id: quizId };

        if (req.user.role === 'STUDENT') {
            whereClause.status = 'PUBLISHED';
        }

        const quiz = await prisma.quiz.findFirst({
            where: whereClause,
            include: {
                category: { select: { id: true, name: true } },
                questions: {
                    // We will expand on questions in Day 6. 
                    // For students taking the quiz, we won't return isCorrect here.
                    select: {
                        id: true,
                        questionText: true,
                        marks: true,
                        difficulty: true,
                        options: { select: { id: true, optionText: true } }
                    }
                }
            }
        });

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found or not available.' });
        }

        res.status(200).json(quiz);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quiz details.' });
    }
};

// POST /quizzes (ADMIN ONLY)
export const createQuiz = async (req, res) => {
    try {
        const {
            title, description, categoryId, difficulty,
            duration, passingScore, maxAttempts, status
        } = req.body;

        const quiz = await prisma.quiz.create({
            data: {
                title,
                description,
                categoryId: parseInt(categoryId),
                difficulty,
                duration: parseInt(duration),
                passingScore: parseFloat(passingScore),
                maxAttempts: parseInt(maxAttempts),
                status: status || 'DRAFT'
            }
        });

        res.status(201).json({ message: 'Quiz created successfully.', quiz });
    } catch (error) {
        res.status(500).json({ message: 'Error creating quiz.', error: error.message });
    }
};

// PUT /quizzes/:id (ADMIN ONLY)
export const updateQuiz = async (req, res) => {
    try {
        const quizId = parseInt(req.params.id);
        const {
            title, description, categoryId, difficulty,
            duration, passingScore, maxAttempts
        } = req.body;

        const quiz = await prisma.quiz.update({
            where: { id: quizId },
            data: {
                title,
                description,
                categoryId: parseInt(categoryId),
                difficulty,
                duration: parseInt(duration),
                passingScore: parseFloat(passingScore),
                maxAttempts: parseInt(maxAttempts)
            }
        });

        res.status(200).json({ message: 'Quiz updated successfully.', quiz });
    } catch (error) {
        res.status(500).json({ message: 'Error updating quiz.' });
    }
};

// DELETE /quizzes/:id (ADMIN ONLY)
export const deleteQuiz = async (req, res) => {
    try {
        const quizId = parseInt(req.params.id);

        await prisma.quiz.delete({
            where: { id: quizId }
        });

        res.status(200).json({ message: 'Quiz deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting quiz.' });
    }
};

// PATCH /quizzes/:id/publish (ADMIN ONLY)
export const updateQuizStatus = async (req, res) => {
    try {
        const quizId = parseInt(req.params.id);
        const { status } = req.body; // 'PUBLISHED', 'UNPUBLISHED', or 'DRAFT'

        if (!['PUBLISHED', 'UNPUBLISHED', 'DRAFT'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status provided.' });
        }

        const quiz = await prisma.quiz.update({
            where: { id: quizId },
            data: { status }
        });

        res.status(200).json({ message: `Quiz status updated to ${status}.`, quiz });
    } catch (error) {
        res.status(500).json({ message: 'Error updating quiz status.' });
    }
};