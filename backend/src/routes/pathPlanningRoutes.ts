import express from 'express';
import { PathPlanningService } from '../services/PathPlanningService';
import { IndoorNavigationService } from '../services/IndoorNavigationService';

const router = express.Router();
const pathPlanningService = new PathPlanningService();

// 获取最短距离路径
router.get('/shortest-distance', async (req, res) => {
  try {
    const { startNodeId, endNodeId } = req.query;
    if (!startNodeId || !endNodeId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'startNodeId and endNodeId are required'
        }
      });
    }
    const path = await pathPlanningService.getShortestDistancePath(startNodeId as string, endNodeId as string);
    res.status(200).json({
      success: true,
      data: path
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PATH_PLANNING_FAILED',
        message: error.message
      }
    });
  }
});

// 获取最短时间路径
router.get('/shortest-time', async (req, res) => {
  try {
    const { startNodeId, endNodeId } = req.query;
    if (!startNodeId || !endNodeId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'startNodeId and endNodeId are required'
        }
      });
    }
    const path = await pathPlanningService.getShortestTimePath(startNodeId as string, endNodeId as string);
    res.status(200).json({
      success: true,
      data: path
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PATH_PLANNING_FAILED',
        message: error.message
      }
    });
  }
});

// 根据交通工具获取路径
router.get('/by-transportation', async (req, res) => {
  try {
    const { startNodeId, endNodeId, transportation } = req.query;
    if (!startNodeId || !endNodeId || !transportation) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'startNodeId, endNodeId, and transportation are required'
        }
      });
    }
    const path = await pathPlanningService.getPathByTransportation(
      startNodeId as string, 
      endNodeId as string, 
      transportation as string
    );
    res.status(200).json({
      success: true,
      data: path
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PATH_PLANNING_FAILED',
        message: error.message
      }
    });
  }
});

// 获取多交通工具路径
router.get('/multi-transportation', async (req, res) => {
  try {
    const { startNodeId, endNodeId } = req.query;
    if (!startNodeId || !endNodeId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'startNodeId and endNodeId are required'
        }
      });
    }
    const path = await pathPlanningService.getMultiTransportationPath(startNodeId as string, endNodeId as string);
    res.status(200).json({
      success: true,
      data: path
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PATH_PLANNING_FAILED',
        message: error.message
      }
    });
  }
});

router.post('/advanced-route', async (req, res) => {
  try {
    const { startNodeId, endNodeId, strategy, transportations } = req.body;
    if (!startNodeId || !endNodeId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'startNodeId and endNodeId are required',
        },
      });
    }

    const path = await pathPlanningService.planAdvancedRoute(
      startNodeId,
      endNodeId,
      strategy || 'shortest_time',
      Array.isArray(transportations) ? transportations : [],
    );

    res.status(200).json({
      success: true,
      data: path,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PATH_PLANNING_FAILED',
        message: error.message,
      },
    });
  }
});

// 获取所有可用的交通工具类型
router.get('/transportation-types', async (req, res) => {
  try {
    const transportationTypes = await pathPlanningService.getAvailableTransportationTypes();
    res.status(200).json({
      success: true,
      data: transportationTypes
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TRANSPORTATION_TYPES_FAILED',
        message: error.message
      }
    });
  }
});

// 查找最近的节点
router.get('/nearest-node', async (req, res) => {
  try {
    const { latitude, longitude, scenicAreaId } = req.query;
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'latitude and longitude are required'
        }
      });
    }
    const nodeId = await pathPlanningService.findNearestNode(
      parseFloat(latitude as string), 
      parseFloat(longitude as string),
      typeof scenicAreaId === 'string' && scenicAreaId.trim() ? scenicAreaId.trim() : undefined,
    );
    res.status(200).json({
      success: true,
      data: { nodeId }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'NEAREST_NODE_FAILED',
        message: error.message
      }
    });
  }
});

// 按名称检索路网节点
router.get('/nodes/search', async (req, res) => {
  try {
    const { keyword, limit, scenicAreaId } = req.query;
    const parsedLimit = Number.parseInt((limit as string) || '12', 10);
    const result = await pathPlanningService.searchNodesByName(
      (keyword as string) || '',
      Number.isFinite(parsedLimit) ? parsedLimit : 12,
      typeof scenicAreaId === 'string' && scenicAreaId.trim() ? scenicAreaId.trim() : undefined,
    );
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'NODE_SEARCH_FAILED',
        message: error.message,
      },
    });
  }
});

// 根据景点ID查找最近路网节点
router.get('/nearest-node-by-attraction', async (req, res) => {
  try {
    const { attractionId } = req.query;
    if (!attractionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'attractionId is required'
        }
      });
    }
    const result = await pathPlanningService.findNearestNodeByAttraction(attractionId as string);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'NEAREST_NODE_FAILED',
        message: error.message
      }
    });
  }
});

// 获取道路网络信息
router.get('/road-network', async (req, res) => {
  try {
    const scenicAreaId = typeof req.query.scenicAreaId === 'string' ? req.query.scenicAreaId : undefined;
    const roadNetwork = await pathPlanningService.getRoadNetwork(scenicAreaId);
    res.status(200).json({
      success: true,
      data: roadNetwork
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ROAD_NETWORK_FAILED',
        message: error.message
      }
    });
  }
});

// 室内导航相关端点
const indoorNavigationService = new IndoorNavigationService();

// 获取建筑物列表
router.get('/indoor/buildings', async (req, res) => {
  try {
    const buildings = await indoorNavigationService.getBuildings();
    res.status(200).json({
      success: true,
      data: buildings
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'BUILDINGS_FETCH_FAILED',
        message: error.message
      }
    });
  }
});

// 获取建筑物详情
router.get('/indoor/buildings/:buildingId', async (req, res) => {
  try {
    const { buildingId } = req.params;
    const buildingDetails = await indoorNavigationService.getBuildingDetails(buildingId);
    if (!buildingDetails) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BUILDING_NOT_FOUND',
          message: `Building ${buildingId} not found`
        }
      });
    }
    res.status(200).json({
      success: true,
      data: buildingDetails
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'BUILDING_DETAILS_FAILED',
        message: error.message
      }
    });
  }
});

// 室内导航
router.post('/indoor/navigate', async (req, res) => {
  try {
    const { buildingId, start, end } = req.body;
    if (!buildingId || !start || !end) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'buildingId, start, and end are required'
        }
      });
    }
    const path = await indoorNavigationService.navigateIndoor(buildingId, start, end);
    res.status(200).json({
      success: true,
      data: path
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INDOOR_NAVIGATION_FAILED',
        message: error.message
      }
    });
  }
});

// 多点路径优化
router.post('/multi-point', async (req, res) => {
  try {
    const { nodeIds, strategy, transportations } = req.body;
    if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'nodeIds must be an array with at least 2 nodes'
        }
      });
    }
    const result = await pathPlanningService.optimizeMultiPointPath(
      nodeIds,
      strategy || 'shortest_time',
      Array.isArray(transportations) ? transportations : [],
    );
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'MULTI_POINT_OPTIMIZATION_FAILED',
        message: error.message
      }
    });
  }
});

// 智能时间规划（一日游计划）
router.post('/day-plan', async (req, res) => {
  try {
    const { scenicAreaId, userId, intensity } = req.body;
    if (!scenicAreaId || !userId || !intensity) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'scenicAreaId, userId, and intensity are required'
        }
      });
    }
    if (!['low', 'medium', 'high'].includes(intensity)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: 'intensity must be one of: low, medium, high'
        }
      });
    }
    const plan = await pathPlanningService.generateDayPlan(scenicAreaId, userId, intensity as 'low' | 'medium' | 'high');
    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DAY_PLAN_GENERATION_FAILED',
        message: error.message
      }
    });
  }
});

// 动态行程调整
router.post('/adjust-plan', async (req, res) => {
  try {
    const { plan, currentAttractionId, currentTime } = req.body;
    if (!plan || !currentAttractionId || !currentTime) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'plan, currentAttractionId, and currentTime are required'
        }
      });
    }
    if (!Array.isArray(plan)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: 'plan must be an array'
        }
      });
    }
    const adjustedPlan = await pathPlanningService.adjustPlan(plan, currentAttractionId, currentTime);
    res.status(200).json({
      success: true,
      data: adjustedPlan
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PLAN_ADJUSTMENT_FAILED',
        message: error.message
      }
    });
  }
});

export default router;
