import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import * as admin from 'firebase-admin';

const router = Router();
const db = admin.firestore();

// Example Route: Get Guides
router.get('/', async (req: AuthenticatedRequest, res) => {
    try {
        const { clientId, role } = req.user!;
        
        let targetClientId = req.query.clientId as string;
        
        // RBAC enforcement
        if (role !== 'admin') {
            targetClientId = clientId;
        }

        if (!targetClientId) {
             res.status(400).json({ error: 'Missing clientId' });
             return;
        }

        const snapshot = await db.collection(`clients/${targetClientId}/guides`).get();
        const guides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(guides);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch guides' });
    }
});

export default router;
