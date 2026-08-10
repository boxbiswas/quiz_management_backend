export const isAdmin = (req, res, next) => {
    // req.user is populated by authenticate middleware
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Access denied. Admin resources only.' });
    }

    next();
};

export const isStudent = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'STUDENT') {
        return res.status(403).json({ message: 'Access denied. Student resources only.' });
    }

    next();
};

// For routes where both roles have access (like the Leaderboard)
export const isAuthorizedUser = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'STUDENT') {
        return res.status(403).json({ message: 'Access denied. Invalid role.' });
    }

    next();
};