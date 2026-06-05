import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAdmin } from '../middleware/auth';
import * as admin from 'firebase-admin';
import { db } from '../firebase';

const router = Router();

// Route: Get workspaces for the CURRENT user
router.get('/my-workspaces', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
             res.status(401).json({ error: 'Unauthorized' });
             return;
        }

        // If admin, they see all workspaces
        if (user.role === 'admin') {
            const snapshot = await db.collection('clients').get();
            const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            res.json(clients);
            return;
        }

        // For standard users, query user_access table
        const accessSnapshot = await db.collection('user_access')
            .where('email', '==', user.email)
            .get();

        if (accessSnapshot.empty) {
            res.json([]);
            return;
        }

        const clientIds = accessSnapshot.docs.map(doc => doc.data().clientId);
        
        // Fetch the details of the clients they have access to
        // Note: Firestore 'in' queries are limited to 10 items.
        // We handle that by chunking or doing a .getAll()
        const clientRefs = clientIds.map(id => db.collection('clients').doc(id));
        const clientsSnap = await db.getAll(...clientRefs);
        
        const clients = clientsSnap
            .filter(doc => doc.exists)
            .map(doc => ({ id: doc.id, ...doc.data() }));

        res.json(clients);
    } catch (error) {
        console.error('Error fetching my workspaces:', error);
        res.status(500).json({ error: 'Failed to fetch your workspaces' });
    }
});

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
