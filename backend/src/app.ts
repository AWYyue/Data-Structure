import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { initializeDatabase } from './config/database';
import userRoutes from './routes/userRoutes';
import recommendationRoutes from './routes/recommendationRoutes';
import pathPlanningRoutes from './routes/pathPlanningRoutes';
import queryRoutes from './routes/queryRoutes';
import diaryRoutes from './routes/diaryRoutes';
import featureRoutes from './routes/featureRoutes';
import foodRoutes from './routes/foodRoutes';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '20mb' }));

app.use('/api/users', userRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/path-planning', pathPlanningRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/diaries', diaryRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/food', foodRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: '上传图片过大，请减少图片数量或压缩后重试。',
        timestamp: new Date().toISOString(),
      },
    });
  }

  console.error(err.stack);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    },
  });
});

async function startServer() {
  try {
    try {
      await initializeDatabase();
    } catch (dbError) {
      console.warn(
        'Database connection failed, starting server without database:',
        dbError instanceof Error ? dbError.message : String(dbError),
      );
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
