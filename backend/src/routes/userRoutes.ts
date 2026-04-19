import express from 'express';
import { UserService } from '../services/UserService';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const userService = new UserService();

const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '[object Object]') {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // fall through to delimiter parsing
    }

    return trimmed
      .replace(/^\[|\]$/g, '')
      .split(/[,\uFF0C|]/)
      .map((item) => item.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }

  return [];
};

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await userService.register({ username, password });
    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: error.message
      }
    });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const { user, token } = await userService.login({ username, password });
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          interests: normalizeStringArray(user.interests),
          interestWeights: user.interestWeights,
          favorites: normalizeStringArray(user.favorites),
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        token
      }
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: {
        code: 'LOGIN_FAILED',
        message: error.message
      }
    });
  }
});

// 获取当前用户信息
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }
    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        interests: normalizeStringArray(user.interests),
        interestWeights: user.interestWeights,
        favorites: normalizeStringArray(user.favorites),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

router.put('/password', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { currentPassword, newPassword } = req.body;
    const user = await userService.updatePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'PASSWORD_UPDATE_FAILED',
        message: error.message,
      },
    });
  }
});

// 更新用户兴趣
router.put('/interests', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { interests } = req.body;
    const user = await userService.updateInterests(userId, interests);
    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        interests: normalizeStringArray(user.interests)
      }
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'UPDATE_FAILED',
        message: error.message
      }
    });
  }
});

// 记录用户行为
router.post('/behaviors', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const behavior = req.body;
    const behaviorRecord = await userService.recordBehavior(userId, behavior);
    res.status(201).json({
      success: true,
      data: behaviorRecord
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'BEHAVIOR_RECORD_FAILED',
        message: error.message
      }
    });
  }
});

// 获取用户行为历史
router.get('/behaviors', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const behaviors = await userService.getUserBehaviors(userId);
    res.status(200).json({
      success: true,
      data: behaviors
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'BEHAVIORS_FETCH_FAILED',
        message: error.message
      }
    });
  }
});

// 更新用户兴趣权重
router.put('/interest-weights', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const user = await userService.updateInterestWeights(userId);
    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        interestWeights: user.interestWeights
      }
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'WEIGHTS_UPDATE_FAILED',
        message: error.message
      }
    });
  }
});

export default router;
