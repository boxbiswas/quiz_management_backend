import { prisma } from '../lib/prisma.js';

// GET /categories
// Both Admin and Student can view categories for filtering
export const getCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching categories.' });
    }
};

// POST /categories (ADMIN ONLY)
export const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        const category = await prisma.category.create({
            data: { name, description }
        });

        res.status(201).json({ message: 'Category created successfully.', category });
    } catch (error) {
        res.status(500).json({ message: 'Error creating category.' });
    }
};

// PUT /categories/:id (ADMIN ONLY)
export const updateCategory = async (req, res) => {
    try {
        const categoryId = parseInt(req.params.id);
        const { name, description } = req.body;

        const category = await prisma.category.update({
            where: { id: categoryId },
            data: { name, description }
        });

        res.status(200).json({ message: 'Category updated successfully.', category });
    } catch (error) {
        res.status(500).json({ message: 'Error updating category.' });
    }
};

// DELETE /categories/:id (ADMIN ONLY)
export const deleteCategory = async (req, res) => {
    try {
        const categoryId = parseInt(req.params.id);

        await prisma.category.delete({
            where: { id: categoryId }
        });

        res.status(200).json({ message: 'Category deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting category.' });
    }
};