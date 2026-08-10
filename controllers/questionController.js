import { prisma } from '../lib/prisma.js';

// GET /quizzes/:quizId/questions (ADMIN ONLY)
// Admin needs to see all questions and which option is correct
export const getQuestionsByQuiz = async (req, res) => {
    try {
        const quizId = parseInt(req.params.quizId);

        const questions = await prisma.question.findMany({
            where: { quizId },
            include: {
                options: true 
            },
            orderBy: { createdAt: 'asc' }
        });

        res.status(200).json(questions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching questions.' });
    }
};

// POST /quizzes/:quizId/questions (ADMIN ONLY)
export const createQuestion = async (req, res) => {
    try {
        const quizId = parseInt(req.params.quizId);
        const { questionText, marks, explanation, difficulty, options } = req.body;

        // Validation: Ensure exactly one correct option[cite: 1]
        const correctOptions = options.filter(opt => opt.isCorrect === true);
        if (correctOptions.length !== 1) {
            return res.status(400).json({ message: 'A question must have exactly one correct option.' });
        }

        const question = await prisma.question.create({
            data: {
                quizId,
                questionText,
                marks: parseInt(marks),
                explanation,
                difficulty,
                options: {
                    create: options.map(opt => ({
                        optionText: opt.optionText,
                        isCorrect: opt.isCorrect
                    }))
                }
            },
            include: { options: true }
        });

        res.status(201).json({ message: 'Question created successfully.', question });
    } catch (error) {
        res.status(500).json({ message: 'Error creating question.' });
    }
};

// PUT /questions/:id (ADMIN ONLY)
export const updateQuestion = async (req, res) => {
    try {
        const questionId = parseInt(req.params.id);
        const { questionText, marks, explanation, difficulty, options } = req.body;

        // Validation: Ensure exactly one correct option[cite: 1]
        const correctOptions = options.filter(opt => opt.isCorrect === true);
        if (correctOptions.length !== 1) {
            return res.status(400).json({ message: 'A question must have exactly one correct option.' });
        }

        // Use a transaction to delete old options and insert new ones safely
        const updatedQuestion = await prisma.$transaction(async (tx) => {
            // 1. Delete existing options
            await tx.option.deleteMany({
                where: { questionId }
            });

            // 2. Update question and create new options
            return await tx.question.update({
                where: { id: questionId },
                data: {
                    questionText,
                    marks: parseInt(marks),
                    explanation,
                    difficulty,
                    options: {
                        create: options.map(opt => ({
                            optionText: opt.optionText,
                            isCorrect: opt.isCorrect
                        }))
                    }
                },
                include: { options: true }
            });
        });

        res.status(200).json({ message: 'Question updated successfully.', question: updatedQuestion });
    } catch (error) {
        res.status(500).json({ message: 'Error updating question.' });
    }
};

// DELETE /questions/:id (ADMIN ONLY)
export const deleteQuestion = async (req, res) => {
    try {
        const questionId = parseInt(req.params.id);

        await prisma.question.delete({
            where: { id: questionId }
        });

        res.status(200).json({ message: 'Question deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting question.' });
    }
};