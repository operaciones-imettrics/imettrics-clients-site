import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { db } from '../firebase';

const router = Router();

// Get Guides
router.get('/', async (req: AuthenticatedRequest, res) => {
    try {
        let targetClientId = req.query.clientId as string;

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

// Create Guide
router.post('/', async (req: AuthenticatedRequest, res) => {
    try {
        let targetClientId = req.body.clientId || req.query.clientId as string;

        if (!targetClientId) {
             res.status(400).json({ error: 'Missing clientId' });
             return;
        }

        const newGuide = {
            ...req.body.guide,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = db.collection(`clients/${targetClientId}/guides`).doc(newGuide.id || undefined);
        await docRef.set(newGuide, { merge: true });

        res.json({ id: docRef.id, ...newGuide });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create guide' });
    }
});

// Update Guide
router.put('/:id', async (req: AuthenticatedRequest, res) => {
    try {
        const id = req.params.id as string;
        let targetClientId = req.body.clientId || req.query.clientId as string;

        if (!targetClientId) {
             res.status(400).json({ error: 'Missing clientId' });
             return;
        }

        const updateData = {
            ...req.body.guide,
            updatedAt: new Date().toISOString()
        };

        await db.collection(`clients/${targetClientId}/guides`).doc(id).set(updateData, { merge: true });
        res.json({ id, ...updateData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update guide' });
    }
});

// Delete Guide
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
    try {
        const id = req.params.id as string;
        let targetClientId = req.query.clientId as string;

        if (!targetClientId) {
             res.status(400).json({ error: 'Missing clientId' });
             return;
        }

        await db.collection(`clients/${targetClientId}/guides`).doc(id).delete();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete guide' });
    }
});

export default router;
