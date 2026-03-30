import express from 'express';
import { PhotoSpotService } from '../services/PhotoSpotService';

const router = express.Router();
const photoSpotService = new PhotoSpotService();

router.get('/spots/:photoSpotId/best-time', async (req, res) => {
  try {
    const { photoSpotId } = req.params;
    const bestTime = await photoSpotService.calculateBestPhotoTime(photoSpotId);
    res.status(200).json({
      success: true,
      data: { bestTime },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'BEST_TIME_FAILED',
        message: error.message,
      },
    });
  }
});

router.get('/spots/:photoSpotId/stats', async (req, res) => {
  try {
    const { photoSpotId } = req.params;
    const stats = await photoSpotService.getCheckinStats(photoSpotId);
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'CHECKIN_STATS_FAILED',
        message: error.message,
      },
    });
  }
});

router.post('/spots/:photoSpotId/checkins', async (req, res) => {
  try {
    const { photoSpotId } = req.params;
    const { photoUrl, caption, userId } = req.body;
    if (!photoUrl) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'photoUrl is required',
        },
      });
    }

    const checkin = await photoSpotService.uploadCheckinPhoto(photoSpotId, {
      photoUrl,
      caption,
      userId: userId || null,
    });
    res.status(201).json({
      success: true,
      data: checkin,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'CHECKIN_UPLOAD_FAILED',
        message: error.message,
      },
    });
  }
});

router.get('/:scenicAreaId/spots', async (req, res) => {
  try {
    const { scenicAreaId } = req.params;
    const spots = await photoSpotService.getPhotoSpotsByScenicArea(scenicAreaId);
    res.status(200).json({
      success: true,
      data: spots,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'PHOTO_SPOTS_FAILED',
        message: error.message,
      },
    });
  }
});

router.get('/:scenicAreaId/popular-photos', async (req, res) => {
  try {
    const { scenicAreaId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 9;
    const photos = await photoSpotService.getPopularPhotos(scenicAreaId, limit);
    res.status(200).json({
      success: true,
      data: photos,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'POPULAR_PHOTOS_FAILED',
        message: error.message,
      },
    });
  }
});

export default router;

