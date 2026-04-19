import express from 'express';
import { FeatureService } from '../services/FeatureService';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const featureService = new FeatureService();

// 摄影打卡
router.post('/photo-checkin', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { attractionId, photoUrl, location, description } = req.body;
    const result = await featureService.addPhotoCheckin(userId, {
      attractionId,
      photoUrl,
      location,
      description
    });
    res.status(201).json({
      success: result.success,
      message: result.message,
      data: {}
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'CHECKIN_FAILED',
        message: error.message
      }
    });
  }
});

// 美食爱好者专属功能 - 美食推荐
router.get('/food-recommendations', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { limit } = req.query;
    const recommendations = await featureService.getFoodRecommendations(
      userId,
      limit ? parseInt(limit as string) : 10
    );
    res.status(200).json({
      success: true,
      data: recommendations
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'RECOMMENDATION_FAILED',
        message: error.message
      }
    });
  }
});

// 美食爱好者专属功能 - 美食路线规划
router.get('/food-route', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { latitude, longitude, duration } = req.query;
    if (!latitude || !longitude || !duration) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'latitude, longitude, and duration are required'
        }
      });
    }
    const route = await featureService.getFoodRoute(
      userId,
      { 
        latitude: parseFloat(latitude as string), 
        longitude: parseFloat(longitude as string) 
      },
      parseInt(duration as string)
    );
    res.status(200).json({
      success: true,
      data: route
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ROUTE_PLANNING_FAILED',
        message: error.message
      }
    });
  }
});

// 个性化提醒
router.get('/personalized-reminders', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const reminders = await featureService.getPersonalizedReminders(userId);
    res.status(200).json({
      success: true,
      data: reminders
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'REMINDERS_FETCH_FAILED',
        message: error.message
      }
    });
  }
});

export default router;
