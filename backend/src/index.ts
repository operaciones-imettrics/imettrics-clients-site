import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './firebase';
import { authMiddleware, requireClientAccess } from './middleware/auth';
import guidesRouter from './routes/guides';
import clientsRouter from './routes/clients';
import usersRouter from './routes/users';
import storageRouter from './routes/storage';
import foldersRouter from './routes/folders';

dotenv.config();

const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://imettrics-clients-portal-dev.web.app',
    'https://imettrics-clients-portal-dev.firebaseapp.com',
    'https://imettrics-clients-portal.web.app',
    'https://imettrics-clients-portal.firebaseapp.com',
    // Add your custom domain here when ready, e.g. 'https://portal.imettrics.com'
];

const app = express();
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, mobile apps)
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS origin not allowed: ${origin}`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
app.options(/.*/, cors()); // Pre-flight for all routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Main healthcheck
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// App Routes
app.use('/api/clients', authMiddleware, clientsRouter);
app.use('/api/clients/:clientId/users', authMiddleware, usersRouter);
app.use('/api/guides', authMiddleware, requireClientAccess, guidesRouter);
app.use('/api/folders', authMiddleware, requireClientAccess, foldersRouter);
app.use('/api/storage', authMiddleware, requireClientAccess, storageRouter);

const PORT = parseInt(process.env.PORT as string) || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend Server running on port ${PORT}`);
});
