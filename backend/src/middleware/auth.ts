import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { auth, db } from '../firebase';

export interface AuthenticatedRequest extends Request {
    user?: admin.auth.DecodedIdToken;
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: No token provided' });
        return;
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Error verifying auth token', error);
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden: Admin access required' });
        return;
    }
    next();
};

export const requireClientAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Determine target client ID from URL params, body, or headers
    const targetClientId = req.params.clientId || req.body.clientId || req.headers['x-client-id'];

    if (!targetClientId && req.user?.role !== 'admin') {
         res.status(403).json({ error: 'Forbidden: Missing clientId context' });
         return;
    }

    // Admins have implicit access to everything
    if (req.user?.role === 'admin') {
        return next();
    }

    try {
        const snapshot = await db.collection('user_access')
            .where('email', '==', req.user?.email)
            .where('clientId', '==', targetClientId)
            .get();

        if (snapshot.empty) {
            res.status(403).json({ error: 'Forbidden: You do not have access to this workspace' });
            return;
        }

        next();
    } catch (err) {
        res.status(500).json({ error: 'Failed to verify workspace access' });
    }
};
