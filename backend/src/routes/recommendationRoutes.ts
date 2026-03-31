import express from 'express';
import { RecommendationService } from '../services/RecommendationService';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const recommendationService = new RecommendationService();

router.get('/cities', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 12;
    const cities = await recommendationService.getCityDestinationOptions(limit);
    res.status(200).json({
      success: true,
      data: cities,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'RECOMMENDATION_FAILED',
        message: error.message,
      },
    });
  }
});

router.post('/city-itinerary', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { cityLabel, theme, tripDays } = req.body || {};

    if (!cityLabel || typeof cityLabel !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'cityLabel is required',
        },
      });
    }

    const itinerary = await recommendationService.generateCityTravelItinerary(
      userId,
      cityLabel.trim(),
      theme || 'comprehensive',
      Number(tripDays || 1),
    );

    res.status(200).json({
      success: true,
      data: itinerary,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'RECOMMENDATION_FAILED',
        message: error.message,
      },
    });
  }
});

// 热度榜
router.get('/ranking/popularity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const topAreas = await recommendationService.getPopularityRanking(limit);
    res.status(200).json({
      success: true,
      data: topAreas
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

// 评分榜
router.get('/ranking/rating', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const topAreas = await recommendationService.getRatingRanking(limit);
    res.status(200).json({
      success: true,
      data: topAreas
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

// 评价榜
router.get('/ranking/review', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const topAreas = await recommendationService.getReviewRanking(limit);
    res.status(200).json({
      success: true,
      data: topAreas
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

// 个人兴趣榜
router.get('/ranking/personalized', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 10;
    const topAreas = await recommendationService.getPersonalizedRanking(userId, limit);
    res.status(200).json({
      success: true,
      data: topAreas
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

// 获取个性化推荐
router.get('/personalized', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 10;
    const recommendations = await recommendationService.getPersonalizedRecommendations(userId, limit);
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

// 获取增量推荐
router.get('/incremental', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 5;
    const recommendations = await recommendationService.getIncrementalRecommendations(userId, limit);
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

// 学习用户行为
router.post('/learn-behavior', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { itemId, behaviorType, category, rating } = req.body;
    await recommendationService.learnUserBehavior(userId, { itemId, behaviorType, category, rating });
    res.status(200).json({
      success: true,
      message: 'User behavior learned successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'BEHAVIOR_LEARNING_FAILED',
        message: error.message
      }
    });
  }
});

// 探索模式推荐
router.get('/exploration', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 10;
    const recommendations = await recommendationService.getExplorationRecommendation(userId, limit);
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

// 惊喜推荐
router.get('/surprise', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 5;
    const recommendations = await recommendationService.getSurpriseRecommendation(userId, limit);
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

// 时间感知推荐
router.get('/time-aware', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 10;
    const recommendations = await recommendationService.getTimeAwareRecommendation(userId, limit);
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

// 季节性推荐
router.get('/seasonal', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 10;
    const recommendations = await recommendationService.getSeasonalRecommendation(userId, limit);
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

// 美食推荐
router.get('/food', async (req, res) => {
  try {
    const locationId = req.query.locationId as string;
    const userId = (req as any).user?.userId;
    const cuisine = req.query.cuisine as string;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!locationId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'locationId is required'
        }
      });
    }
    
    const recommendations = await recommendationService.getFoodRecommendation(locationId, userId, cuisine, limit);
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

// 日记推荐
router.get('/diary', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 10;
    const recommendations = await recommendationService.getDiaryRecommendation(userId, limit);
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

// 获取推荐解释
router.get('/explanation', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const itemId = req.query.itemId as string;
    
    if (!itemId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'itemId is required'
        }
      });
    }
    
    const explanation = await recommendationService.getRecommendationExplanation(userId, itemId);
    res.status(200).json({
      success: true,
      data: explanation
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'EXPLANATION_FAILED',
        message: error.message
      }
    });
  }
});

export default router;
