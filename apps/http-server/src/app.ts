// app.ts
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import errorHandler from './middleware/globelErrorHandler.middleware';
import ApiError from './utils/ApiError';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Create Express app
const app: Application = express();

const allowedOrigins = process.env.ALLOW_ORIGIN || "http://localhost:3000";

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);


app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Import and use routes
import authRoutes from './routes/auth.routes';
app.use('/api/v1/auth', authRoutes);    

// 404 Handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new ApiError(404, 'Route Not Found'));
});

// Global Error Handler
app.use(errorHandler);

export default app;