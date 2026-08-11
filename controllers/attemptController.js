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
                answers: {
                    include: {
                        question: {
                            include: {
                                options: true // We need all options to show what was correct vs selected
                            }
                        },
                        selectedOption: true
                    }
                }
            }
        });

        if (!attempt) {
            return res.status(404).json({ message: 'Attempt not found.' });
        }

        // Security check: Only the student who owns it (or an Admin) can view it
        if (req.user.role === 'STUDENT' && attempt.userId !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized to view this attempt.' });
        }

        // Ensure the attempt is finished. If it's IN_PROGRESS, they shouldn't see answers yet.
        if (attempt.status === 'IN_PROGRESS') {
            return res.status(403).json({ message: 'Cannot review an attempt that is still in progress.' });
        }

        // Structure the data perfectly for the frontend Answer Review loop
        const formattedReview = attempt.answers.map(ans => {
            const correctOption = ans.question.options.find(opt => opt.isCorrect === true);

            return {
                questionId: ans.question.id,
                questionText: ans.question.questionText,
                explanation: ans.question.explanation,
                marks: ans.question.marks,
                options: ans.question.options.map(opt => ({
                    id: opt.id,
                    optionText: opt.optionText,
                    isCorrect: opt.isCorrect // Safe to send now because the quiz is over
                })),
                selectedOptionId: ans.selectedOptionId,
                isCorrect: ans.isCorrect,
                correctOptionId: correctOption ? correctOption.id : null
            };
        });

        // Send a clean, separated response object
        res.status(200).json({
            attemptDetails: {
                id: attempt.id,
                score: attempt.score,
                percentage: attempt.percentage,
                correctAnswers: attempt.correctAnswers,
                incorrectAnswers: attempt.incorrectAnswers,
                unanswered: attempt.unanswered,
                timeTaken: attempt.timeTaken,
                status: attempt.status,
                startedAt: attempt.startedAt,
                completedAt: attempt.completedAt,
                quiz: attempt.quiz
            },
            review: formattedReview
        });
    } catch (error) {
        console.error("GET ATTEMPT ERROR:", error);
        res.status(500).send("Error fetching attempt details.");
    }
};


// POST /quizzes/:quizId/submit
export const submitQuiz = async (req, res) => {
    try {
        const quizId = parseInt(req.params.quizId);
        const userId = req.user.id;
        const { answers } = req.body; // Expected format: [{ questionId: 1, selectedOptionId: 4 }, ...]

        // 1. Fetch the active IN_PROGRESS attempt
        const attempt = await prisma.attempt.findFirst({
            where: { quizId, userId, status: 'IN_PROGRESS' }
        });

        if (!attempt) {
            return res.status(400).json({ message: 'No active attempt found for this quiz. It may have already been submitted.' });
        }

        // 2. Fetch the Quiz with its Questions and their Options (including the correct ones)
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: {
                questions: {
                    include: { options: true }
                }
            }
        });

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found.' });
        }

        // 3. Time Validation[cite: 1]
        const now = new Date();
        const startedAt = attempt.startedAt;
        const durationMs = quiz.duration * 60000;
        const expiryTime = new Date(startedAt.getTime() + durationMs);

        // Calculate time taken in seconds
        let timeTaken = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

        // If the request comes in late (e.g., due to network delay after an auto-submit), 
        // cap the time taken to the maximum duration of the quiz.
        if (now > expiryTime) {
            timeTaken = quiz.duration * 60;
        }

        // 4. Scoring Algorithm
        let correctCount = 0;
        let incorrectCount = 0;
        let unansweredCount = 0;
        let obtainedMarks = 0;
        let totalMarks = 0;

        const answerRecords = [];

        quiz.questions.forEach(question => {
            totalMarks += question.marks;

            // Find the student's submitted answer for this specific question
            const studentAnswer = answers ? answers.find(a => a.questionId === question.id) : null;
            const correctOption = question.options.find(o => o.isCorrect === true);

            let isCorrect = false;
            let selectedOptionId = null;

            if (!studentAnswer || !studentAnswer.selectedOptionId) {
                unansweredCount++;
            } else {
                selectedOptionId = parseInt(studentAnswer.selectedOptionId);
                if (correctOption && selectedOptionId === correctOption.id) {
                    isCorrect = true;
                    correctCount++;
                    obtainedMarks += question.marks;
                } else {
                    incorrectCount++;
                }
            }

            // Prepare record for the Answer table
            answerRecords.push({
                attemptId: attempt.id,
                questionId: question.id,
                selectedOptionId: selectedOptionId,
                isCorrect: selectedOptionId ? isCorrect : null
            });
        });

        // Calculate final percentage and pass/fail status
        const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
        const status = percentage >= quiz.passingScore ? 'PASSED' : 'FAILED';

        // 5. Database Transaction: Save answers and update the attempt simultaneously
        const finalResult = await prisma.$transaction(async (tx) => {
            // Bulk insert all answers
            await tx.answer.createMany({
                data: answerRecords
            });

            // Update the attempt with final metrics
            const updatedAttempt = await tx.attempt.update({
                where: { id: attempt.id },
                data: {
                    score: obtainedMarks,
                    percentage: Number(percentage.toFixed(2)),
                    correctAnswers: correctCount,
                    incorrectAnswers: incorrectCount,
                    unanswered: unansweredCount,
                    timeTaken: timeTaken,
                    status: status,
                    completedAt: now
                }
            });

            return updatedAttempt;
        });

        res.status(200).json({
            message: 'Quiz submitted successfully.',
            result: finalResult
        });

    } catch (error) {
        console.error("SUBMIT QUIZ ERROR:", error);
        res.status(500).json({ message: 'Error submitting quiz.' });
    }
};


// GET /admin/attempts (ADMIN ONLY - Global Platform Attempts)
export const getAllAttempts = async (req, res) => {
    try {
        const attempts = await prisma.attempt.findMany({
            include: {
                user: { 
                    select: { name: true, email: true } // Include student details
                },
                quiz: { 
                    select: { title: true, category: { select: { name: true } } } 
                }
            },
            orderBy: { startedAt: 'desc' }
        });

        res.status(200).json(attempts);
    } catch (error) {
        console.error("GET ALL ATTEMPTS ERROR:", error);
        res.status(500).json({ message: 'Error fetching platform attempts.' });
    }
};