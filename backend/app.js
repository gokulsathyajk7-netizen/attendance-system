import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import compression from 'compression';
import hpp from 'hpp';

dotenv.config();

import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import attendanceRoutes from './routes/attendance.js';
import { leavesRouter, locationRouter, deptRouter, reportsRouter } from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import logger from './config/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.set('trust proxy', 1);

/* =========================
Security Middleware
========================= */
app.use(
helmet({
crossOriginResourcePolicy: { policy: 'cross-origin' },
})
);

app.use(
cors({
origin: [
process.env.CLIENT_URL,
process.env.MOBILE_URL,
'http://localhost:5173',
'http://localhost:3000',
].filter(Boolean),
credentials: true,
methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
allowedHeaders: ['Content-Type', 'Authorization'],
})
);

app.use(compression());
app.use(hpp());

/* =========================
Rate Limiting
========================= */
const limiter = rateLimit({
windowMs: Number(process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
max: Number(process.env.RATE_LIMIT_MAX || 100),
standardHeaders: true,
legacyHeaders: false,
message: {
success: false,
message: 'Too many requests, please try again later.',
},
});

const authLimiter = rateLimit({
windowMs: 15 * 60 * 1000,
max: 10,
standardHeaders: true,
legacyHeaders: false,
message: {
success: false,
message: 'Too many login attempts. Please try again later.',
},
});

app.use(limiter);

/* =========================
Request Parsers
========================= */
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Attendance System API Running Successfully"
  });
});

/* =========================
Logging
========================= */
if (process.env.NODE_ENV !== 'test') {
app.use(
morgan('dev', {
stream: {
write: (message) => logger.http(message.trim()),
},
})
);
}

/* =========================
Static Files
========================= */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* =========================
Health Check
========================= */
app.get('/health', (req, res) => {
res.status(200).json({
success: true,
status: 'ok',
uptime: process.uptime(),
timestamp: new Date().toISOString(),
environment: process.env.NODE_ENV,
});
});

/* =========================
API Routes
========================= */
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leavesRouter);
app.use('/api/location', locationRouter);
app.use('/api/departments', deptRouter);
app.use('/api/reports', reportsRouter);

/* =========================
Error Handling
========================= */
app.use(notFound);
app.use(errorHandler);

export default app;
