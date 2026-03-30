import express from 'express';
import { SocialService } from '../services/SocialService';

const router = express.Router();
const socialService = new SocialService();

const resolveUserIdFromRequest = (req: express.Request): string | undefined => {
  const headerUserId = req.headers['x-user-id'];
  if (typeof headerUserId === 'string' && headerUserId.trim()) {
    return headerUserId.trim();
  }
  const bodyUserId = (req.body?.userId ?? req.query?.userId) as string | undefined;
  if (typeof bodyUserId === 'string' && bodyUserId.trim()) {
    return bodyUserId.trim();
  }
  return undefined;
};

router.get('/trending', async (req, res) => {
  try {
    const scenicAreaId = (req.query.scenicAreaId as string | undefined)?.trim();
    const limit = Number(req.query.limit ?? 6);
    const data = await socialService.getTrending(
      scenicAreaId || undefined,
      Number.isFinite(limit) && limit > 0 ? Math.min(limit, 20) : 6,
    );
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SOCIAL_TRENDING_FAILED',
        message: error.message,
      },
    });
  }
});

router.get('/nearby', async (req, res) => {
  try {
    const latitude = Number(req.query.latitude ?? 39.9042);
    const longitude = Number(req.query.longitude ?? 116.4074);
    const radius = Number(req.query.radius ?? 500);
    const limit = Number(req.query.limit ?? 12);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_LOCATION',
          message: 'latitude and longitude must be valid numbers',
        },
      });
    }

    const data = await socialService.getNearbyUsers(
      latitude,
      longitude,
      Number.isFinite(radius) && radius > 0 ? radius : 500,
      Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 12,
      resolveUserIdFromRequest(req),
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SOCIAL_NEARBY_FAILED',
        message: error.message,
      },
    });
  }
});

router.post('/teams', async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    const scenicAreaId = typeof req.body?.scenicAreaId === 'string' ? req.body.scenicAreaId.trim() : undefined;
    if (!name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TEAM_NAME',
          message: 'name is required',
        },
      });
    }
    const data = await socialService.createTeam(resolveUserIdFromRequest(req), name, scenicAreaId);
    res.status(201).json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'SOCIAL_CREATE_TEAM_FAILED',
        message: error.message,
      },
    });
  }
});

router.post('/teams/join', async (req, res) => {
  try {
    const inviteCode = String(req.body?.inviteCode ?? '').trim();
    if (!inviteCode) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_INVITE_CODE',
          message: 'inviteCode is required',
        },
      });
    }
    const data = await socialService.joinTeam(resolveUserIdFromRequest(req), inviteCode);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'SOCIAL_JOIN_TEAM_FAILED',
        message: error.message,
      },
    });
  }
});

router.get('/teams/:teamId', async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const data = await socialService.getTeamInfo(teamId);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: {
        code: 'SOCIAL_TEAM_NOT_FOUND',
        message: error.message,
      },
    });
  }
});

router.get('/my-teams', async (req, res) => {
  try {
    const data = await socialService.getMyTeams(resolveUserIdFromRequest(req));
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SOCIAL_MY_TEAMS_FAILED',
        message: error.message,
      },
    });
  }
});

router.post('/check-in', async (req, res) => {
  try {
    const attractionId = String(req.body?.attractionId ?? '').trim();
    const photo = typeof req.body?.photo === 'string' ? req.body.photo : undefined;
    const text = typeof req.body?.text === 'string' ? req.body.text : undefined;
    if (!attractionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ATTRACTION_ID',
          message: 'attractionId is required',
        },
      });
    }

    const data = await socialService.checkIn(resolveUserIdFromRequest(req), {
      attractionId,
      photo,
      text,
    });
    res.status(201).json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'SOCIAL_CHECKIN_FAILED',
        message: error.message,
      },
    });
  }
});

router.get('/check-ins', async (req, res) => {
  try {
    const attractionId = (req.query.attractionId as string | undefined)?.trim();
    const limit = Number(req.query.limit ?? 20);
    const data = await socialService.getCheckIns(
      attractionId || undefined,
      Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20,
    );
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SOCIAL_CHECKINS_FETCH_FAILED',
        message: error.message,
      },
    });
  }
});

export default router;

