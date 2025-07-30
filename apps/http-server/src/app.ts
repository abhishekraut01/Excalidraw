// app.ts
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import errorHandler from './middlewares/globelErrorhandler.middleware';
import ApiError from './utils/ApiError';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Create Express app
const app: Application = express();

const allowedOrigins = process.env.ALLOW_ORIGIN?.split(',') || ["https://chat-app-851o.onrender.com"];

app.use(
  cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if(!origin) return callback(null, true);
      
      if(allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
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
import authRoute from './routes/auth.routes';
import messageRoutes from './routes/message.routes';
app.use('/api/v1/auth', authRoute);
app.use('/api/v1/message', messageRoutes);

// 404 Handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new ApiError(404, 'Route Not Found'));
});

// Global Error Handler
app.use(errorHandler);

export default app;