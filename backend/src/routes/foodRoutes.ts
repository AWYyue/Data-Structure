import express from 'express';
import { FoodService } from '../services/FoodService';

const router = express.Router();
const foodService = new FoodService();

// 获取美食推荐
router.get('/recommendations', async (req, res) => {
  try {
    const scenicAreaId = req.query.scenicAreaId as string;
    const limit = parseInt(req.query.limit as string) || 10;
    const cuisine = req.query.cuisine as string;

    if (!scenicAreaId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETER',
          message: 'scenicAreaId is required'
        }
      });
    }

    const recommendations = await foodService.getFoodRecommendations(scenicAreaId, limit, cuisine);
    res.status(200).json({
      success: true,
      data: recommendations
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'FOOD_RECOMMENDATION_FAILED',
        message: error.message
      }
    });
  }
});

// 模糊搜索美食
router.get('/search', async (req, res) => {
  try {
    const keyword = req.query.keyword as string;
    const scenicAreaId = req.query.scenicAreaId as string;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!keyword || !scenicAreaId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETER',
          message: 'keyword and scenicAreaId are required'
        }
      });
    }

    const results = await foodService.fuzzySearchFood(keyword, scenicAreaId, limit);
    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'FOOD_SEARCH_FAILED',
        message: error.message
      }
    });
  }
});

// 获取所有菜系
router.get('/cuisines', async (req, res) => {
  try {
    const scenicAreaId = req.query.scenicAreaId as string;

    if (!scenicAreaId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETER',
          message: 'scenicAreaId is required'
        }
      });
    }

    const cuisines = await foodService.getAllCuisines(scenicAreaId);
    res.status(200).json({
      success: true,
      data: cuisines
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CUISINES_FETCH_FAILED',
        message: error.message
      }
    });
  }
});

export default router;
