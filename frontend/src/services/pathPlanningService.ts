import api from './api';

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface RouteBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface PlanningProfile {
  kind: 'campus' | 'scenic' | 'generic';
  label: string;
  category: string | null;
  allowedTransportations: Array<'walk' | 'bicycle' | 'electric_cart'>;
  defaultTransportations: Array<'walk' | 'bicycle' | 'electric_cart'>;
  vehicleTransportation: 'walk' | 'bicycle' | 'electric_cart' | null;
  description: string;
}

export interface RouteContext {
  scenicAreaId: string | null;
  scenicAreaName: string | null;
  center: RoutePoint | null;
  bounds: RouteBounds | null;
  mapMode: 'street' | 'scenic';
  isVirtualScenic: boolean;
  planningProfile?: PlanningProfile;
}

export interface PathSegment {
  from: string;
  to: string;
  transportation?: 'walk' | 'bicycle' | 'electric_cart';
  distance: number;
  time?: number;
  roadType: string;
  roadName?: string;
  instruction?: string;
  congestionFactor?: number;
  fromLocation: RoutePoint;
  toLocation: RoutePoint;
  pathPoints?: RoutePoint[];
  isConnector?: boolean;
}

export interface Path {
  path: string[];
  distance: number;
  time: number;
  routeGeometry?: RoutePoint[];
  routeSource?: 'graph' | 'osrm';
  routeContext?: RouteContext;
  segments?: PathSegment[];
  strategy?: MultiPointStrategy;
  transportationModes?: Array<'walk' | 'bicycle' | 'electric_cart'>;
  isMixedTransportation?: boolean;
}

export interface RoadNetworkNode {
  id: string;
  type: string;
  name: string;
  scenicAreaId?: string | null;
  location: RoutePoint;
}

export interface RoadNetworkEdge {
  id: string;
  from: string;
  to: string;
  distance: number;
  roadType: string;
  congestionFactor: number;
  allowedTransportation: string[];
  isElectricCartRoute: boolean;
  isBicyclePath: boolean;
}

export interface RoadNetworkPayload {
  nodes: RoadNetworkNode[];
  edges: RoadNetworkEdge[];
  planningProfile?: PlanningProfile;
}

export interface DayPlanStop {
  attractionId: string;
  name: string;
  arrivalTime: string;
  stayDuration: number;
  isMustVisit: boolean;
}

export type MultiPointStrategy = 'shortest_distance' | 'shortest_time';

export interface MultiPointPath {
  order: string[];
  path: string[];
  totalDistance: number;
  totalTime: number;
  strategy?: MultiPointStrategy;
  transportationModes?: Array<'walk' | 'bicycle' | 'electric_cart'>;
  isMixedTransportation?: boolean;
}

export interface PathPlanningService {
  getShortestDistancePath: (startNodeId: string, endNodeId: string) => Promise<{ success: boolean; data: Path }>;
  getShortestTimePath: (startNodeId: string, endNodeId: string) => Promise<{ success: boolean; data: Path }>;
  getPathByTransportation: (
    startNodeId: string,
    endNodeId: string,
    transportation: string,
  ) => Promise<{ success: boolean; data: Path }>;
  getMultiTransportationPath: (startNodeId: string, endNodeId: string) => Promise<{ success: boolean; data: Path }>;
  planAdvancedRoute: (
    startNodeId: string,
    endNodeId: string,
    strategy: MultiPointStrategy,
    transportations: string[],
  ) => Promise<{ success: boolean; data: Path }>;
  getAvailableTransportationTypes: () => Promise<{ success: boolean; data: string[] }>;
  findNearestNode: (
    latitude: number,
    longitude: number,
    scenicAreaId?: string,
  ) => Promise<{ success: boolean; data: { nodeId: string } }>;
  searchNodesByName: (
    keyword: string,
    limit?: number,
    scenicAreaId?: string,
  ) => Promise<{ success: boolean; data: Array<{ id: string; name: string; type: string; scenicAreaId: string | null; latitude: number; longitude: number }> }>;
  findNearestNodeByAttraction: (
    attractionId: string,
  ) => Promise<{ success: boolean; data: { attractionId: string; nodeId: string; scenicAreaId: string | null } }>;
  optimizeMultiPointPath: (
    nodeIds: string[],
    strategy: MultiPointStrategy,
    transportations?: string[],
  ) => Promise<{ success: boolean; data: MultiPointPath }>;
  getRoadNetwork: (scenicAreaId?: string) => Promise<{ success: boolean; data: RoadNetworkPayload }>;
  generateDayPlan: (
    scenicAreaId: string,
    userId: string,
    intensity: 'low' | 'medium' | 'high',
  ) => Promise<{ success: boolean; data: { plan: DayPlanStop[]; totalDistance: number; totalTime: number } }>;
}

const fallbackRoadNetwork: RoadNetworkPayload = {
  nodes: [
    { id: '1', type: 'junction', name: '主入口', scenicAreaId: null, location: { latitude: 39.9042, longitude: 116.4074 } },
    { id: '2', type: 'junction', name: '中心广场', scenicAreaId: null, location: { latitude: 39.9052, longitude: 116.4084 } },
    { id: '3', type: 'attraction', name: '景点A', scenicAreaId: null, location: { latitude: 39.9062, longitude: 116.4094 } },
    { id: '4', type: 'attraction', name: '景点B', scenicAreaId: null, location: { latitude: 39.9072, longitude: 116.4104 } },
    { id: '5', type: 'junction', name: '东出口', scenicAreaId: null, location: { latitude: 39.9082, longitude: 116.4114 } },
  ],
  edges: [
    {
      id: '1',
      from: '1',
      to: '2',
      distance: 100,
      roadType: 'main_road',
      congestionFactor: 1,
      allowedTransportation: ['walk', 'bicycle', 'electric_cart'],
      isElectricCartRoute: true,
      isBicyclePath: true,
    },
    {
      id: '2',
      from: '2',
      to: '3',
      distance: 150,
      roadType: 'main_road',
      congestionFactor: 1,
      allowedTransportation: ['walk', 'bicycle', 'electric_cart'],
      isElectricCartRoute: true,
      isBicyclePath: true,
    },
    {
      id: '3',
      from: '3',
      to: '4',
      distance: 180,
      roadType: 'bicycle_path',
      congestionFactor: 0.9,
      allowedTransportation: ['walk', 'bicycle'],
      isElectricCartRoute: false,
      isBicyclePath: true,
    },
    {
      id: '4',
      from: '4',
      to: '5',
      distance: 120,
      roadType: 'main_road',
      congestionFactor: 1,
      allowedTransportation: ['walk', 'bicycle', 'electric_cart'],
      isElectricCartRoute: true,
      isBicyclePath: true,
    },
  ],
  planningProfile: {
    kind: 'generic',
    label: '通用',
    category: null,
    allowedTransportations: ['walk', 'bicycle', 'electric_cart'],
    defaultTransportations: ['walk'],
    vehicleTransportation: null,
    description: '当前使用本地示例路网，保留通用交通方式。',
  },
};

const pathPlanningService: PathPlanningService = {
  getShortestDistancePath: async (startNodeId, endNodeId) =>
    api.get(`/path-planning/shortest-distance?startNodeId=${startNodeId}&endNodeId=${endNodeId}`),

  getShortestTimePath: async (startNodeId, endNodeId) =>
    api.get(`/path-planning/shortest-time?startNodeId=${startNodeId}&endNodeId=${endNodeId}`),

  getPathByTransportation: async (startNodeId, endNodeId, transportation) =>
    api.get(
      `/path-planning/by-transportation?startNodeId=${startNodeId}&endNodeId=${endNodeId}&transportation=${encodeURIComponent(
        transportation,
      )}`,
    ),

  getMultiTransportationPath: async (startNodeId, endNodeId) =>
    api.get(`/path-planning/multi-transportation?startNodeId=${startNodeId}&endNodeId=${endNodeId}`),

  planAdvancedRoute: async (startNodeId, endNodeId, strategy, transportations) =>
    api.post('/path-planning/advanced-route', {
      startNodeId,
      endNodeId,
      strategy,
      transportations,
    }),

  getAvailableTransportationTypes: async () => api.get('/path-planning/transportation-types'),

  findNearestNode: async (latitude, longitude, scenicAreaId) => {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
    });
    if (scenicAreaId) {
      params.set('scenicAreaId', scenicAreaId);
    }
    return api.get(`/path-planning/nearest-node?${params.toString()}`);
  },

  searchNodesByName: async (keyword, limit = 12, scenicAreaId) => {
    const params = new URLSearchParams({
      keyword,
      limit: String(limit),
    });
    if (scenicAreaId) {
      params.set('scenicAreaId', scenicAreaId);
    }
    return api.get(`/path-planning/nodes/search?${params.toString()}`);
  },

  findNearestNodeByAttraction: async (attractionId) =>
    api.get(`/path-planning/nearest-node-by-attraction?attractionId=${encodeURIComponent(attractionId)}`),

  optimizeMultiPointPath: async (nodeIds, strategy, transportations = []) =>
    api.post('/path-planning/multi-point', {
      nodeIds,
      strategy,
      transportations,
    }),

  getRoadNetwork: async (scenicAreaId) => {
    try {
      const query = scenicAreaId ? `?scenicAreaId=${encodeURIComponent(scenicAreaId)}` : '';
      return (await api.get(`/path-planning/road-network${query}`)) as {
        success: boolean;
        data: RoadNetworkPayload;
      };
    } catch (error) {
      console.error('获取道路网络失败，已回退到本地示例路网。', error);
      return {
        success: true,
        data: fallbackRoadNetwork,
      };
    }
  },

  generateDayPlan: async (scenicAreaId, userId, intensity) =>
    api.post('/path-planning/day-plan', {
      scenicAreaId,
      userId,
      intensity,
    }),
};

export default pathPlanningService;
