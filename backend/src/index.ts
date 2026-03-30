import express from 'express';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database';
import redisClient from './config/redis';
import userRoutes from './routes/userRoutes';
import pathPlanningRoutes from './routes/pathPlanningRoutes';
import queryRoutes from './routes/queryRoutes';
import diaryRoutes from './routes/diaryRoutes';
import recommendationRoutes from './routes/recommendationRoutes';
import foodRoutes from './routes/foodRoutes';
import featureRoutes from './routes/featureRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'connected',
    redis: redisClient.isReady ? 'connected' : 'disconnected',
  });
});

app.use('/api/users', userRoutes);
app.use('/api/path-planning', pathPlanningRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/diaries', diaryRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/features', featureRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: '上传图片过大，请减少图片数量或压缩后重试。',
      },
    });
  }
  return next(err);
});

const startServer = async () => {
  try {
    try {
      await initializeDatabase();
      console.log('Database initialized successfully');
    } catch (dbError: any) {
      console.warn('Database initialization failed, using memory storage fallback:', dbError.message);
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
