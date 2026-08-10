import { prisma } from '../lib/prisma.js';

// GET /users?search=name
export const getUsers = async (req, res) => {
    try {
        const { search } = req.query;

        const whereClause = { role: 'STUDENT' };
        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            select: { id: true, name: true, email: true, status: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users.' });
    }
};

// GET /users/:id
export const getUserById = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        const user = await prisma.user.findUnique({
            where: { id: userId, role: 'STUDENT' },
            include: {
                attempts: {
                    include: {
                        quiz: { select: { title: true, category: { select: { name: true } } } }
                    },
                    orderBy: { startedAt: 'desc' }
                }
            }
        });

        if (!user) return res.status(404).json({ message: 'Student not found.' });

        // Calculate performance
        const totalAttempts = user.attempts.length;
        const passed = user.attempts.filter(a => a.status === 'PASSED').length;
        const failed = user.attempts.filter(a => a.status === 'FAILED').length;
        const highestScore = totalAttempts > 0 ? Math.max(...user.attempts.map(a => a.percentage || 0)) : 0;

        const totalPercentage = user.attempts.reduce((sum, a) => sum + (a.percentage || 0), 0);
        const averageScore = totalAttempts > 0 ? Number((totalPercentage / totalAttempts).toFixed(2)) : 0;

        res.status(200).json({
            profile: {
                id: user.id,
                name: user.name,
                email: user.email,
                status: user.status,
                createdAt: user.createdAt
            },
            performance: {
                quizzesAttempted: totalAttempts,
                averageScore,
                highestScore,
                passed,
                failed
            },
            history: user.attempts
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching student details.' });
    }
};

// PUT /users/:id
export const updateUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { name, email } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { name, email },
            select: { id: true, name: true, email: true, status: true }
        });

        res.status(200).json({ message: 'User updated successfully', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user.' });
    }
};

// PATCH /users/:id/status
export const updateUserStatus = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { status } = req.body; // 'ACTIVE' or 'INACTIVE'

        if (!['ACTIVE', 'INACTIVE'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value.' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { status },
            select: { id: true, name: true, status: true }
        });

        res.status(200).json({ message: `User account is now ${status}`, user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user status.' });
    }
};

// DELETE /users/:id
export const deleteUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        await prisma.user.delete({
            where: { id: userId }
        });

        res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user.' });
    }
};