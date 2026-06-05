import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { db } from '../firebase';

const router = Router();

// Get Folders
router.get('/', async (req: AuthenticatedRequest, res) => {
    try {
        const { clientId, role } = req.user!;
        let targetClientId = req.query.clientId as string;
        
        if (role !== 'admin') {
            targetClientId = clientId;
        } else if (!targetClientId) {
            targetClientId = clientId;
        }

        if (!targetClientId) {
             res.status(400).json({ error: 'Missing clientId' });
             return;
        }

        const snapshot = await db.collection(`clients/${targetClientId}/folders`).get();
        const folders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(folders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch folders' });
    }
});

// Create Folder
router.post('/', async (req: AuthenticatedRequest, res) => {
    try {
        const { clientId, role } = req.user!;
        let targetClientId = req.body.clientId || req.query.clientId as string;
        
        if (role !== 'admin') {
            targetClientId = clientId;
        } else if (!targetClientId) {
            targetClientId = clientId;
        }

        if (!targetClientId) {
             res.status(400).json({ error: 'Missing clientId' });
             return;
        }

        const newFolder = { ...req.body.folder };
        const docRef = db.collection(`clients/${targetClientId}/folders`).doc(newFolder.id || undefined);
        await docRef.set(newFolder, { merge: true });

        res.json({ id: docRef.id, ...newFolder });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create folder' });
    }
});

// Update Folder
router.put('/:id', async (req: AuthenticatedRequest, res) => {
    try {
        const id = req.params.id as string;
        const { clientId, role } = req.user!;
        let targetClientId = req.body.clientId || req.query.clientId as string;
        
        if (role !== 'admin') {
            targetClientId = clientId;
        } else if (!targetClientId) {
            targetClientId = clientId;
        }

        if (!targetClientId) {
             res.status(400).json({ error: 'Missing clientId' });
             return;
        }

        const updateData = { ...req.body.folder };
        await db.collection(`clients/${targetClientId}/folders`).doc(id).set(updateData, { merge: true });
        res.json({ id, ...updateData });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update folder' });
    }
});

// Delete Folder
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
    try {
        const id = req.params.id as string;
        const { clientId, role } = req.user!;
        let targetClientId = req.query.clientId as string;
        
        if (role !== 'admin') {
            targetClientId = clientId;
        } else if (!targetClientId) {
            targetClientId = clientId;
        }

        if (!targetClientId) {
             res.status(400).json({ error: 'Missing clientId' });
             return;
        }

        await db.collection(`clients/${targetClientId}/folders`).doc(id).delete();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete folder' });
    }
});

export default router;
