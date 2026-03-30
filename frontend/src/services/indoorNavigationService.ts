import api from './api';

export interface IndoorLocation {
  floor: number;
  x: number;
  y: number;
}

export interface IndoorPathPoint extends IndoorLocation {
  type: 'start' | 'end' | 'entrance' | 'elevator' | 'corner';
  label?: string;
}

export interface IndoorPathResult {
  instructions: string[];
  distance: number;
  estimatedTime: number;
  path: IndoorPathPoint[];
  usedElevatorId?: string | null;
}

export interface IndoorEntrance {
  id: string;
  name: string;
  location: IndoorLocation;
  connectedElevators: string[];
}

export interface IndoorElevator {
  id: string;
  name: string;
  location: IndoorLocation;
  floors: number[];
  averageWaitTime: number;
}

export interface IndoorRoom {
  id: string;
  number: string;
  name: string;
  type: string;
  location: IndoorLocation;
}

export interface IndoorFloor {
  number: number;
  width: number;
  height: number;
  rooms: IndoorRoom[];
}

export interface IndoorStructure {
  buildingId: string;
  name: string;
  entrances: IndoorEntrance[];
  elevators: IndoorElevator[];
  floors: IndoorFloor[];
}

export interface IndoorBuildingSummary {
  id: string;
  name: string;
}

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
};

const FALLBACK_WALK_SPEED = 75;

const fallbackStructures: IndoorStructure[] = [
  {
    buildingId: 'building1',
    name: '行政楼',
    entrances: [
      {
        id: 'entrance-main',
        name: '主入口',
        location: { floor: 1, x: 12, y: 42 },
        connectedElevators: ['elevator-a'],
      },
      {
        id: 'entrance-east',
        name: '东入口',
        location: { floor: 1, x: 108, y: 42 },
        connectedElevators: ['elevator-b'],
      },
    ],
    elevators: [
      {
        id: 'elevator-a',
        name: 'A 电梯',
        location: { floor: 1, x: 42, y: 45 },
        floors: [1, 2, 3, 4, 5],
        averageWaitTime: 22,
      },
      {
        id: 'elevator-b',
        name: 'B 电梯',
        location: { floor: 1, x: 78, y: 45 },
        floors: [1, 2, 3, 4, 5],
        averageWaitTime: 18,
      },
    ],
    floors: [
      {
        number: 1,
        width: 120,
        height: 90,
        rooms: [
          { id: 'a-101', number: '101', name: '大厅', type: 'hall', location: { floor: 1, x: 20, y: 18 } },
          { id: 'a-102', number: '102', name: '接待室', type: 'office', location: { floor: 1, x: 20, y: 72 } },
          { id: 'a-103', number: '103', name: '安保室', type: 'office', location: { floor: 1, x: 98, y: 72 } },
          { id: 'a-104', number: '104', name: '财务室', type: 'office', location: { floor: 1, x: 98, y: 18 } },
        ],
      },
      {
        number: 2,
        width: 120,
        height: 90,
        rooms: [
          { id: 'a-201', number: '201', name: '会议室 A', type: 'meeting', location: { floor: 2, x: 18, y: 18 } },
          { id: 'a-202', number: '202', name: '会议室 B', type: 'meeting', location: { floor: 2, x: 18, y: 72 } },
          { id: 'a-203', number: '203', name: '办公区 1', type: 'office', location: { floor: 2, x: 100, y: 18 } },
          { id: 'a-204', number: '204', name: '办公区 2', type: 'office', location: { floor: 2, x: 100, y: 72 } },
        ],
      },
      {
        number: 3,
        width: 120,
        height: 90,
        rooms: [
          { id: 'a-301', number: '301', name: '档案室', type: 'archive', location: { floor: 3, x: 20, y: 18 } },
          { id: 'a-302', number: '302', name: '人事部', type: 'office', location: { floor: 3, x: 20, y: 72 } },
          { id: 'a-303', number: '303', name: '行政部', type: 'office', location: { floor: 3, x: 98, y: 18 } },
        ],
      },
    ],
  },
  {
    buildingId: 'building2',
    name: '图书馆',
    entrances: [
      {
        id: 'entrance-north',
        name: '北入口',
        location: { floor: 1, x: 70, y: 8 },
        connectedElevators: ['elevator-l1'],
      },
      {
        id: 'entrance-south',
        name: '南入口',
        location: { floor: 1, x: 70, y: 92 },
        connectedElevators: ['elevator-l1'],
      },
    ],
    elevators: [
      {
        id: 'elevator-l1',
        name: '中庭电梯',
        location: { floor: 1, x: 70, y: 50 },
        floors: [1, 2, 3, 4],
        averageWaitTime: 16,
      },
    ],
    floors: [
      {
        number: 1,
        width: 140,
        height: 100,
        rooms: [
          { id: 'l-101', number: '101', name: '借阅大厅', type: 'hall', location: { floor: 1, x: 28, y: 20 } },
          { id: 'l-102', number: '102', name: '读者服务台', type: 'service', location: { floor: 1, x: 28, y: 80 } },
          { id: 'l-103', number: '103', name: '自习区', type: 'study', location: { floor: 1, x: 112, y: 80 } },
          { id: 'l-104', number: '104', name: '咖啡角', type: 'food', location: { floor: 1, x: 112, y: 20 } },
        ],
      },
      {
        number: 2,
        width: 140,
        height: 100,
        rooms: [
          { id: 'l-201', number: '201', name: '社科阅览室', type: 'reading', location: { floor: 2, x: 24, y: 18 } },
          { id: 'l-202', number: '202', name: '文学阅览室', type: 'reading', location: { floor: 2, x: 24, y: 82 } },
          { id: 'l-203', number: '203', name: '讨论室 A', type: 'meeting', location: { floor: 2, x: 116, y: 18 } },
        ],
      },
    ],
  },
];

const fallbackById = new Map(fallbackStructures.map((item) => [item.buildingId, item]));

const extractData = <T>(response: ApiEnvelope<T> | T): T | null => {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as ApiEnvelope<T>).data ?? null;
  }
  return (response as T) ?? null;
};

const cloneStructure = (structure: IndoorStructure): IndoorStructure =>
  JSON.parse(JSON.stringify(structure)) as IndoorStructure;

const normalizePath = (points: IndoorPathPoint[]): IndoorPathPoint[] => {
  const deduped: IndoorPathPoint[] = [];

  for (const point of points) {
    const previous = deduped[deduped.length - 1];
    if (
      previous &&
      previous.floor === point.floor &&
      previous.x === point.x &&
      previous.y === point.y
    ) {
      deduped[deduped.length - 1] = { ...point };
      continue;
    }
    deduped.push({ ...point });
  }

  const compacted: IndoorPathPoint[] = [];
  for (let index = 0; index < deduped.length; index += 1) {
    const current = deduped[index];
    const previous = compacted[compacted.length - 1];
    const next = deduped[index + 1];

    if (!previous || !next) {
      compacted.push(current);
      continue;
    }

    const sameFloor =
      previous.floor === current.floor && current.floor === next.floor;
    const collinear =
      (previous.x === current.x && current.x === next.x) ||
      (previous.y === current.y && current.y === next.y);

    if (sameFloor && collinear && current.type === 'corner') {
      continue;
    }

    compacted.push(current);
  }

  return compacted;
};

const pathDistance = (path: IndoorPathPoint[]): number => {
  let distance = 0;

  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1];
    const current = path[index];

    if (previous.floor !== current.floor) {
      continue;
    }

    distance += Math.abs(previous.x - current.x) + Math.abs(previous.y - current.y);
  }

  return distance;
};

const buildFloorPath = (
  floor: IndoorFloor,
  start: IndoorLocation,
  end: IndoorLocation,
  startType: IndoorPathPoint['type'],
  endType: IndoorPathPoint['type'],
): IndoorPathPoint[] => {
  const viaCenterX = normalizePath([
    { ...start, type: startType },
    { floor: start.floor, x: floor.width / 2, y: start.y, type: 'corner' },
    { floor: start.floor, x: floor.width / 2, y: end.y, type: 'corner' },
    { ...end, type: endType },
  ]);

  const viaCenterY = normalizePath([
    { ...start, type: startType },
    { floor: start.floor, x: start.x, y: floor.height / 2, type: 'corner' },
    { floor: start.floor, x: end.x, y: floor.height / 2, type: 'corner' },
    { ...end, type: endType },
  ]);

  return pathDistance(viaCenterX) <= pathDistance(viaCenterY) ? viaCenterX : viaCenterY;
};

const buildStepInstructions = (path: IndoorPathPoint[]): string[] =>
  path
    .slice(1)
    .map((current, index) => {
      const previous = path[index];
      if (previous.floor !== current.floor) {
        return '';
      }

      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      const distance = Math.abs(dx) + Math.abs(dy);

      if (distance <= 0) {
        return '';
      }

      const direction =
        Math.abs(dx) >= Math.abs(dy)
          ? dx >= 0
            ? '向东'
            : '向西'
          : dy >= 0
            ? '向南'
            : '向北';

      return `${direction}步行约 ${distance.toFixed(0)} 米。`;
    })
    .filter(Boolean);

const localNavigate = (
  building: IndoorStructure,
  start: IndoorLocation,
  end: IndoorLocation,
): IndoorPathResult => {
  const startFloor = building.floors.find((item) => item.number === start.floor);
  const endFloor = building.floors.find((item) => item.number === end.floor);

  if (!startFloor || !endFloor) {
    throw new Error('起点或终点所在楼层不存在。');
  }

  if (start.floor === end.floor) {
    const floorPath = buildFloorPath(startFloor, start, end, 'start', 'end');
    const distance = pathDistance(floorPath);

    return {
      instructions: [
        `已为你规划 ${start.floor} 层室内路线，全程约 ${distance.toFixed(0)} 米。`,
        ...buildStepInstructions(floorPath),
        '你已到达目的地。',
      ],
      distance: Number(distance.toFixed(2)),
      estimatedTime: Number((distance / FALLBACK_WALK_SPEED).toFixed(1)),
      path: floorPath,
      usedElevatorId: null,
    };
  }

  const availableElevators = building.elevators.filter(
    (item) => item.floors.includes(start.floor) && item.floors.includes(end.floor),
  );

  if (!availableElevators.length) {
    throw new Error('当前起终楼层之间没有可用电梯。');
  }

  let bestElevator = availableElevators[0];
  let bestCost = Number.POSITIVE_INFINITY;

  for (const elevator of availableElevators) {
    const startDistance =
      Math.abs(start.x - elevator.location.x) + Math.abs(start.y - elevator.location.y);
    const endDistance =
      Math.abs(end.x - elevator.location.x) + Math.abs(end.y - elevator.location.y);
    const cost = startDistance + endDistance + elevator.averageWaitTime;

    if (cost < bestCost) {
      bestCost = cost;
      bestElevator = elevator;
    }
  }

  const startElevatorLocation: IndoorLocation = {
    floor: start.floor,
    x: bestElevator.location.x,
    y: bestElevator.location.y,
  };
  const endElevatorLocation: IndoorLocation = {
    floor: end.floor,
    x: bestElevator.location.x,
    y: bestElevator.location.y,
  };

  const startPath = buildFloorPath(startFloor, start, startElevatorLocation, 'start', 'elevator');
  const endPath = buildFloorPath(endFloor, endElevatorLocation, end, 'elevator', 'end');
  const walkDistance = pathDistance(startPath) + pathDistance(endPath);
  const elevatorTravelSeconds = Math.abs(start.floor - end.floor) * 12;
  const estimatedTime =
    walkDistance / FALLBACK_WALK_SPEED +
    bestElevator.averageWaitTime / 60 +
    elevatorTravelSeconds / 60;

  return {
    instructions: [
      `先前往 ${bestElevator.name}。`,
      ...buildStepInstructions(startPath),
      `乘坐电梯前往 ${end.floor} 层，预计等待约 ${bestElevator.averageWaitTime} 秒。`,
      ...buildStepInstructions(endPath),
      '你已到达目的地。',
    ],
    distance: Number(walkDistance.toFixed(2)),
    estimatedTime: Number(estimatedTime.toFixed(1)),
    path: [...startPath, ...endPath.slice(1)],
    usedElevatorId: bestElevator.id,
  };
};

const indoorNavigationService = {
  getBuildings: async (): Promise<IndoorBuildingSummary[]> => {
    try {
      const response = await api.get('/path-planning/indoor/buildings');
      const data = extractData<IndoorBuildingSummary[]>(response);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (error) {
      console.warn('获取室内建筑列表失败，已回退到本地示例数据。', error);
    }

    return fallbackStructures.map((item) => ({ id: item.buildingId, name: item.name }));
  },

  getBuildingDetails: async (buildingId: string): Promise<IndoorStructure> => {
    try {
      const response = await api.get(`/path-planning/indoor/buildings/${buildingId}`);
      const data = extractData<IndoorStructure>(response);
      if (data?.buildingId) {
        return data;
      }
    } catch (error) {
      console.warn('获取室内建筑详情失败，已回退到本地示例数据。', error);
    }

    const fallback = fallbackById.get(buildingId) || fallbackStructures[0];
    return cloneStructure(fallback);
  },

  navigateIndoor: async (
    buildingId: string,
    start: IndoorLocation,
    end: IndoorLocation,
  ): Promise<IndoorPathResult> => {
    try {
      const response = await api.post('/path-planning/indoor/navigate', {
        buildingId,
        start,
        end,
      });
      const data = extractData<IndoorPathResult>(response);
      if (data?.path?.length || data?.instructions?.length) {
        return data;
      }
    } catch (error) {
      console.warn('室内导航接口不可用，已回退到本地路线算法。', error);
    }

    const building = fallbackById.get(buildingId) || fallbackStructures[0];
    return localNavigate(cloneStructure(building), start, end);
  },
};

export default indoorNavigationService;
