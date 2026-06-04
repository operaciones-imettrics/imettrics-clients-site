import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './firebase';
import { authMiddleware } from './middleware/auth';
import guidesRouter from './routes/guides';
import clientsRouter from './routes/clients';
import storageRouter from './routes/storage';
import foldersRouter from './routes/folders';

dotenv.config();

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
app.use('/api/folders', authMiddleware, foldersRouter);
app.use('/api/storage', authMiddleware, storageRouter);

const PORT = parseInt(process.env.PORT as string) || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend Server running on port ${PORT}`);
});
