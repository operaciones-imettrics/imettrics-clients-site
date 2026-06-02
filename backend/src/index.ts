import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import { authMiddleware } from './middleware/auth';
import guidesRouter from './routes/guides';
import clientsRouter from './routes/clients';
import storageRouter from './routes/storage';

dotenv.config();

// Initialize Firebase Admin
admin.initializeApp();

const app = express();
app.use(cors());
app.use(express.json());

// Main healthcheck
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// App Routes
app.use('/api/clients', authMiddleware, clientsRouter);
app.use('/api/guides', authMiddleware, guidesRouter);
app.use('/api/storage', authMiddleware, storageRouter);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Backend Server running on port ${PORT}`);
});
