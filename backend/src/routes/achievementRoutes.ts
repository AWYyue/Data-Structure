import express from 'express';
import { AchievementService } from '../services/AchievementService';

const router = express.Router();
const achievementService = new AchievementService();

const resolveUserIdFromRequest = (req: express.Request): string | undefined => {
  const headerUserId = req.headers['x-user-id'];
  if (typeof headerUserId === 'string' && headerUserId.trim()) {
    return headerUserId.trim();
  }
  const userId = (req.query.userId ?? req.body?.userId) as string | undefined;
  if (typeof userId === 'string' && userId.trim()) {
    return userId.trim();
  }
  return undefined;
};

router.get('/', async (req, res) => {
  try {
    const data = await achievementService.getUserAchievements(resolveUserIdFromRequest(req));
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ACHIEVEMENT_FETCH_FAILED',
        message: error.message,
      },
    });
  }
});

router.post('/check', async (req, res) => {
  try {
    const data = await achievementService.checkAndUpdateAchievements(resolveUserIdFromRequest(req));
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ACHIEVEMENT_CHECK_FAILED',
        message: error.message,
      },
    });
  }
});

router.get('/:achievementId', async (req, res) => {
  try {
    const data = await achievementService.getAchievementDetails(
      resolveUserIdFromRequest(req),
      req.params.achievementId,
    );
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: {
        code: 'ACHIEVEMENT_DETAIL_NOT_FOUND',
        message: error.message,
      },
    });
  }
});

export default router;

