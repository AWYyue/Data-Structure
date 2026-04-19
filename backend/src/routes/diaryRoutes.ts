import express from 'express';
import { DiaryService } from '../services/DiaryService';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = express.Router();
const diaryService = new DiaryService();

router.get('/generated-animation/:id', async (req, res) => {
  const animation = diaryService.getGeneratedAnimation(req.params.id);
  if (!animation) {
    return res.status(404).send('动画预览不存在或已失效。');
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(animation.html);
});

// 创建日记
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { title, content, destination, visitDate, route, imageUrls, videoUrls, isShared } = req.body;
    const diary = await diaryService.createDiary({
      userId,
      title,
      content,
      destination,
      visitDate: visitDate ? new Date(visitDate) : undefined,
      route,
      imageUrls,
      videoUrls,
      isShared
    });
    res.status(201).json({
      success: true,
      data: diary
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'DIARY_CREATION_FAILED',
        message: error.message
      }
    });
  }
});

// 获取日记详情
router.get('/:id', optionalAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const viewerUserId = (req as any).user?.userId;
    await diaryService.incrementDiaryPopularity(id, viewerUserId);
    const diary = await diaryService.getDiaryById(id);
    if (!diary) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DIARY_NOT_FOUND',
          message: 'Diary not found'
        }
      });
    }
    // 增加日记热度
    res.status(200).json({
      success: true,
      data: diary
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DIARY_FETCH_FAILED',
        message: error.message
      }
    });
  }
});

// 获取用户的日记列表
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit, offset } = req.query;
    const diaries = await diaryService.getUserDiaries(
      userId,
      limit ? parseInt(limit as string) : 10,
      offset ? parseInt(offset as string) : 0
    );
    res.status(200).json({
      success: true,
      data: diaries
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DIARIES_FETCH_FAILED',
        message: error.message
      }
    });
  }
});

// 获取分享的日记列表
router.get('/shared/list', async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const diaries = await diaryService.getSharedDiaries(
      limit ? parseInt(limit as string) : 10,
      offset ? parseInt(offset as string) : 0
    );
    res.status(200).json({
      success: true,
      data: diaries
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DIARIES_FETCH_FAILED',
        message: error.message
      }
    });
  }
});

// 更新日记
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const actorUserId = (req as any).user.userId;
    const { title, content, destination, visitDate, route, imageUrls, videoUrls, isShared } = req.body;
    const diary = await diaryService.updateDiary(id, {
      title,
      content,
      destination,
      visitDate: visitDate ? new Date(visitDate) : undefined,
      route,
      imageUrls,
      videoUrls,
      isShared
    }, actorUserId);
    res.status(200).json({
      success: true,
      data: diary
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'DIARY_UPDATE_FAILED',
        message: error.message
      }
    });
  }
});

// 删除日记
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const actorUserId = (req as any).user.userId;
    await diaryService.deleteDiary(id, actorUserId);
    res.status(200).json({
      success: true,
      message: 'Diary deleted successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'DIARY_DELETION_FAILED',
        message: error.message
      }
    });
  }
});

// 分享日记
router.post('/:id/share', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const actorUserId = (req as any).user.userId;
    const diary = await diaryService.shareDiary(id, actorUserId);
    res.status(200).json({
      success: true,
      data: diary
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'DIARY_SHARE_FAILED',
        message: error.message
      }
    });
  }
});

// 添加评论
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const { content, rating, parentCommentId } = req.body;
    const comment = await diaryService.addComment({
      diaryId: id,
      userId,
      content,
      rating,
      parentCommentId
    });
    res.status(201).json({
      success: true,
      data: comment
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'COMMENT_CREATION_FAILED',
        message: error.message
      }
    });
  }
});

// 获取日记评论
router.delete('/:id/comments/:commentId', authMiddleware, async (req, res) => {
  try {
    const actorUserId = (req as any).user.userId;
    const { commentId } = req.params;
    const comment = await diaryService.deleteComment(commentId, actorUserId);
    res.status(200).json({
      success: true,
      data: comment
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'COMMENT_DELETE_FAILED',
        message: error.message
      }
    });
  }
});

router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit, offset } = req.query;
    const comments = await diaryService.getDiaryComments(
      id,
      limit ? parseInt(limit as string) : 20,
      offset ? parseInt(offset as string) : 0
    );
    res.status(200).json({
      success: true,
      data: comments
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'COMMENTS_FETCH_FAILED',
        message: error.message
      }
    });
  }
});

// 搜索日记
router.get('/search/query', async (req, res) => {
  try {
    const { query, limit, mode } = req.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'query is required'
        }
      });
    }
    const diaries = await diaryService.searchDiaries(
      query as string,
      limit ? parseInt(limit as string) : 10,
      mode === 'all' ? 'all' : 'any'
    );
    res.status(200).json({
      success: true,
      data: diaries
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DIARY_SEARCH_FAILED',
        message: error.message
      }
    });
  }
});

// 根据目的地搜索日记
router.get('/search/title', async (req, res) => {
  try {
    const { title, limit } = req.query;
    if (!title) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'title is required'
        }
      });
    }
    const diaries = await diaryService.searchDiariesByExactTitle(
      title as string,
      limit ? parseInt(limit as string) : 10
    );
    res.status(200).json({
      success: true,
      data: diaries
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DIARY_SEARCH_FAILED',
        message: error.message
      }
    });
  }
});

router.get('/search/destination', async (req, res) => {
  try {
    const { destination, limit } = req.query;
    if (!destination) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'destination is required'
        }
      });
    }
    const diaries = await diaryService.searchDiariesByDestination(
      destination as string,
      limit ? parseInt(limit as string) : 10
    );
    res.status(200).json({
      success: true,
      data: diaries
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DIARY_SEARCH_FAILED',
        message: error.message
      }
    });
  }
});

// 生成AIGC动画
router.post('/generate-animation', authMiddleware, async (req, res) => {
  try {
    const { photos, description } = req.body;
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'photos is required and must be an array'
        }
      });
    }
    if (!description) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'description is required'
        }
      });
    }
    const animationId = await diaryService.generateAnimation(photos, description);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const animationUrl = `${baseUrl}/api/diaries/generated-animation/${animationId}`;
    res.status(200).json({
      success: true,
      data: {
        animationUrl
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ANIMATION_GENERATION_FAILED',
        message: error.message
      }
    });
  }
});

export default router;
