import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { storage } from '../firebase';

const router = Router();

// Generate v4 read/write signed URL
router.post('/signed-url', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { filename, action } = req.body;
        const { clientId, role } = req.user!;
        
        let pathClientId = req.body.clientId;

        if (!pathClientId) {
             res.status(400).json({ error: 'Missing clientId' });
             return;
        }

        const bucket = storage.bucket();
        // File path matching storage.rules definition: /clientes/{clientId}/...
        const filepath = `clientes/${pathClientId}/${Date.now()}-${filename}`;
        
        const file = bucket.file(filepath);
        const [url] = await file.getSignedUrl({
            version: 'v4',
            action: action || 'write',
            expires: Date.now() + 15 * 60 * 1000, // 15 mins
            contentType: 'application/octet-stream', // Auto logic can be used here
        });

        res.json({ url, filepath });
    } catch (error) {
        console.error('Error generating signed URL', error);
        res.status(500).json({ error: 'Failed to generate URL' });
    }
});

export default router;
