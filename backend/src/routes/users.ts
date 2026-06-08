import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAdmin } from '../middleware/auth';
import { db } from '../firebase';

const router = Router({ mergeParams: true }); // Allows us to receive :clientId from parent route

// Admin Only Route: List all users with access to this clientId
router.get('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const clientId = req.params.clientId;
        const snapshot = await db.collection('user_access').where('clientId', '==', clientId).get();
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Admin Only Route: Add a user to a clientId whitelist
router.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const clientId = req.params.clientId;
        const { email, role } = req.body;

        if (!email) {
             res.status(400).json({ error: 'Email is required' });
             return;
        }

        // Check if user already exists for this client
        const existing = await db.collection('user_access')
           .where('clientId', '==', clientId)
           .where('email', '==', email)
           .get();

        if (!existing.empty) {
            res.status(400).json({ error: 'User is already whitelisted for this workspace' });
            return;
        }

        const newUserAccess = {
            clientId,
            email: email.toLowerCase(),
            role: role || 'viewer',
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('user_access').add(newUserAccess);
        res.json({ id: docRef.id, ...newUserAccess });
    } catch (error) {
         res.status(500).json({ error: 'Failed to grant access' });
    }
});

// Admin Only Route: Remove a user from a clientId whitelist
router.delete('/:email', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const clientId = req.params.clientId as string;
        const email = req.params.email as string;

        const snapshot = await db.collection('user_access')
            .where('clientId', '==', clientId)
            .where('email', '==', String(email).toLowerCase())
            .get();

        if (snapshot.empty) {
            res.status(404).json({ error: 'User not found in this workspace' });
            return;
        }

        // Delete all matching access records (should technically only be 1)
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        res.json({ success: true, message: `Access revoked for ${email}` });
    } catch (error) {
        res.status(500).json({ error: 'Failed to revoke access' });
    }
});

export default router;
