import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAdmin } from '../middleware/auth';
import * as admin from 'firebase-admin';
import { db } from '../firebase';

const router = Router();

// Admin Only Route: Get All Clients Workspaces
router.get('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const snapshot = await db.collection('clients').get();
        const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
});

// Admin Only Route: Create Client Workspace
router.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, logo_url, primary_color } = req.body;
        const newClientParams = {
            name,
            logo_url: logo_url || '',
            primary_color: primary_color || '#000000',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        const docRef = await db.collection('clients').add(newClientParams);
        res.json({ id: docRef.id, ...newClientParams });
    } catch (error) {
         res.status(500).json({ error: 'Failed to create client workspace' });
    }
});

export default router;
