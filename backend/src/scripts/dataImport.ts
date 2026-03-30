import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { createDatabaseOptions } from '../config/database';
import { SHARED_REAL_MAP_TEMPLATE } from '../data/realMapTemplates';
import { REAL_SCENIC_CATALOG } from '../data/realScenicCatalog';
import { Achievement } from '../entities/Achievement';
import { Attraction } from '../entities/Attraction';
import { Facility } from '../entities/Facility';
import { Food } from '../entities/Food';
import { PhotoCheckin } from '../entities/PhotoCheckin';
import { PhotoSpot } from '../entities/PhotoSpot';
import { RoadGraphEdge } from '../entities/RoadGraphEdge';
import { RoadGraphNode } from '../entities/RoadGraphNode';
import { ScenicArea } from '../entities/ScenicArea';
import { SocialCheckin } from '../entities/SocialCheckin';
import { SocialTeam } from '../entities/SocialTeam';
import { SocialTeamMember } from '../entities/SocialTeamMember';
import { User } from '../entities/User';
import { fetchSharedRealMapTemplate, SharedRealMapTemplateData } from '../utils/sharedRealMapTemplate';

dotenv.config();

type LatLng = {
  latitude: number;
  longitude: number;
};

type SeedRoadNode = {
  id: string;
  scenicAreaId: string;
  type: string;
  name: string;
  latitude: number;
  longitude: number;
};

const SCENIC_AREA_COUNT = Number(process.env.DATA_IMPORT_SCENIC_COUNT ?? REAL_SCENIC_CATALOG.length);
const ATTRACTIONS_PER_SCENIC = Number(process.env.DATA_IMPORT_ATTRACTIONS_PER_SCENIC ?? 20);
const FACILITIES_PER_SCENIC = Number(process.env.DATA_IMPORT_FACILITIES_PER_SCENIC ?? 50);
const GRID_SIZE = Number(process.env.DATA_IMPORT_GRID_SIZE ?? 11);
const FOOD_PER_SCENIC = Number(process.env.DATA_IMPORT_FOOD_PER_SCENIC ?? 20);
const PHOTO_SPOTS_PER_SCENIC = Number(process.env.DATA_IMPORT_PHOTO_SPOTS_PER_SCENIC ?? 4);
const TARGET_USER_COUNT = Number(process.env.DATA_IMPORT_USER_COUNT ?? 12);
const DATA_IMPORT_MAP_MODE = (process.env.DATA_IMPORT_MAP_MODE ?? 'shared_real_template').trim();

const createId = () => uuidv4();

const CITY_CENTERS: Record<string, LatLng> = {
  北京: { latitude: 39.9042, longitude: 116.4074 },
  上海: { latitude: 31.2304, longitude: 121.4737 },
  广州: { latitude: 23.1291, longitude: 113.2644 },
  成都: { latitude: 30.5728, longitude: 104.0668 },
  杭州: { latitude: 30.2741, longitude: 120.1551 },
  西安: { latitude: 34.3416, longitude: 108.9398 },
  武汉: { latitude: 30.5928, longitude: 114.3055 },
  南京: { latitude: 32.0603, longitude: 118.7969 },
  重庆: { latitude: 29.563, longitude: 106.5516 },
  天津: { latitude: 39.0842, longitude: 117.2009 },
};

const FACILITY_CATEGORIES = [
  '商店',
  '饭店',
  '洗手间',
  '图书馆',
  '食堂',
  '超市',
  '咖啡馆',
  '游客中心',
  '停车场',
  '医疗点',
];

const CAMPUS_BUILDING_CATEGORIES = ['教学楼', '实验楼', '办公楼', '宿舍楼', '图书馆', '体育馆'];
const SCENIC_BUILDING_CATEGORIES = ['景点', '展馆', '观景台', '园林区', '文化馆', '地标建筑'];
const FOOD_CUISINES = ['川菜', '粤菜', '湘菜', '面食', '快餐', '甜品', '火锅', '烧烤', '小吃', '咖啡'];
const ATTRACTION_TYPES = ['landmark', 'museum', 'garden', 'culture', 'viewpoint', 'historic'];
const DEFAULT_OPENING_HOURS = JSON.stringify({
  Monday: '08:00-22:00',
  Tuesday: '08:00-22:00',
  Wednesday: '08:00-22:00',
  Thursday: '08:00-22:00',
  Friday: '08:00-22:00',
  Saturday: '09:00-21:00',
  Sunday: '09:00-21:00',
});

const DEMO_USERS = [
  { username: 'travel_admin', email: 'travel_admin@example.com', interests: ['摄影', '文化', '自然'] },
  { username: 'beijing_guest', email: 'beijing_guest@example.com', interests: ['校园', '历史', '美食'] },
  { username: 'shanghai_guest', email: 'shanghai_guest@example.com', interests: ['城市漫游', '博物馆', '咖啡'] },
  { username: 'guangzhou_guest', email: 'guangzhou_guest@example.com', interests: ['美食', '街区', '夜景'] },
  { username: 'chengdu_guest', email: 'chengdu_guest@example.com', interests: ['熊猫', '古镇', '火锅'] },
  { username: 'hangzhou_guest', email: 'hangzhou_guest@example.com', interests: ['湖景', '园林', '摄影'] },
  { username: 'xian_guest', email: 'xian_guest@example.com', interests: ['古迹', '历史', '博物馆'] },
  { username: 'wuhan_guest', email: 'wuhan_guest@example.com', interests: ['校园', '湖景', '建筑'] },
  { username: 'nanjing_guest', email: 'nanjing_guest@example.com', interests: ['民国建筑', '博物馆', '美食'] },
  { username: 'chongqing_guest', email: 'chongqing_guest@example.com', interests: ['山城', '夜景', '索道'] },
  { username: 'tianjin_guest', email: 'tianjin_guest@example.com', interests: ['老街区', '近代建筑', '海河'] },
  { username: 'campus_guide', email: 'campus_guide@example.com', interests: ['校园', '图书馆', '打卡'] },
];

const randomInRange = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const jitterCoord = (base: LatLng, degreeRange: number): LatLng => ({
  latitude: Number((base.latitude + randomInRange(-degreeRange, degreeRange)).toFixed(8)),
  longitude: Number((base.longitude + randomInRange(-degreeRange, degreeRange)).toFixed(8)),
});

const haversineMeter = (a: LatLng, b: LatLng): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const c =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
};

const roadTypeByGrid = (row: number, col: number) => {
  if (row % 3 === 0 || col % 3 === 0) return 'main_road';
  if (row % 2 === 0) return 'bicycle_path';
  return 'footpath';
};

const allowedTransportByRoadType = (roadType: string): string[] => {
  if (roadType === 'main_road') return ['walk', 'bicycle', 'electric_cart'];
  if (roadType === 'bicycle_path') return ['walk', 'bicycle'];
  return ['walk'];
};

const buildIndoorStructure = (buildingName: string) =>
  JSON.stringify({
    buildingName,
    floors: [
      { number: 1, rooms: ['入口大厅', '服务台', '休息区'] },
      { number: 2, rooms: ['功能区A', '多媒体室', '观景区'] },
    ],
    elevators: [{ id: 'e1', floors: [1, 2] }],
  });

const buildScenicDescription = (name: string, city: string, isCampus: boolean) =>
  isCampus
    ? `${name}位于${city}，用于演示校园浏览、建筑查询、室内导航与校园服务联动。`
    : `${name}位于${city}，用于演示景区推荐、景点游览、设施查询与路径规划联动。`;

const buildAttractionDescription = (buildingCategory: string, scenicName: string, isCampus: boolean) =>
  isCampus
    ? `${buildingCategory}服务于${scenicName}的教学、办公、住宿与公共活动。`
    : `${buildingCategory}是${scenicName}内部的重要游览节点和停留空间。`;

const buildFacilityDescription = (category: string, scenicName: string) =>
  `${category}服务于${scenicName}内部游客、访客与日常使用人群。`;

const buildFoodDescription = (cuisine: string, scenicName: string) =>
  `${cuisine}餐饮点，服务于${scenicName}内部游客、师生或访客。`;

const buildPhotoSpotDescription = (attractionName: string) =>
  `${attractionName}附近视野较好，适合拍摄景观、人像和打卡照片。`;

const ensureDemoUsers = async (dataSource: DataSource) => {
  const userRepo = dataSource.getRepository(User);
  await userRepo.delete({ id: '' });
  const existingCount = await userRepo.count();
  if (existingCount >= TARGET_USER_COUNT) {
    return;
  }

  const passwordHash = await bcrypt.hash('123456', 10);
  for (const user of DEMO_USERS.slice(0, TARGET_USER_COUNT)) {
    const exists = await userRepo.findOne({ where: [{ username: user.username }, { email: user.email }] });
    if (exists) {
      continue;
    }

    await userRepo.save({
      id: createId(),
      username: user.username,
      email: user.email,
      passwordHash,
      interests: user.interests,
      interestWeights: {
        foodie: Math.random(),
        photographer: Math.random(),
        cultureEnthusiast: Math.random(),
        natureLover: Math.random(),
        sportsEnthusiast: Math.random(),
        relaxationSeeker: Math.random(),
        socialSharer: Math.random(),
      },
      viewedItems: [],
      favorites: [],
      dislikedCategories: [],
    });
  }
};

const createGridNodes = (scenicId: string, scenicName: string, center: LatLng): SeedRoadNode[] => {
  const gridSpan = 0.016;
  const step = gridSpan / (GRID_SIZE - 1);
  const startLat = center.latitude - gridSpan / 2;
  const startLng = center.longitude - gridSpan / 2;

  return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, gridIndex) => {
    const row = Math.floor(gridIndex / GRID_SIZE);
    const col = gridIndex % GRID_SIZE;
    return {
      id: createId(),
      scenicAreaId: scenicId,
      type: 'junction',
      name: `${scenicName}-路口-${row}-${col}`,
      latitude: Number((startLat + row * step).toFixed(8)),
      longitude: Number((startLng + col * step).toFixed(8)),
    };
  });
};

const pickTemplatePoint = (
  points: Array<{ latitude: number; longitude: number; sourceCategory: string }>,
  index: number,
  fallback: LatLng,
): { latitude: number; longitude: number; sourceCategory: string } =>
  points.length
    ? points[index % points.length]
    : {
        latitude: fallback.latitude,
        longitude: fallback.longitude,
        sourceCategory: 'fallback',
      };

const cloneSharedTemplateRoadNodes = (
  template: SharedRealMapTemplateData,
  scenicId: string,
  scenicName: string,
) => {
  const nodeIdMap = new Map<string, string>();
  const nodes: SeedRoadNode[] = template.roadNodes.map((node, index) => {
    const id = createId();
    nodeIdMap.set(node.key, id);
    return {
      id,
      scenicAreaId: scenicId,
      type: node.type,
      name: `${scenicName}-真实路网节点-${index + 1}`,
      latitude: node.latitude,
      longitude: node.longitude,
    };
  });

  return { nodes, nodeIdMap };
};

const cloneSharedTemplateRoadEdges = (
  template: SharedRealMapTemplateData,
  scenicId: string,
  nodeIdMap: Map<string, string>,
) =>
  template.roadEdges
    .map((edge) => {
      const fromNodeId = nodeIdMap.get(edge.fromKey);
      const toNodeId = nodeIdMap.get(edge.toKey);
      if (!fromNodeId || !toNodeId) {
        return null;
      }

      return {
        id: createId(),
        scenicAreaId: scenicId,
        fromNodeId,
        toNodeId,
        distance: edge.distance,
        roadType: edge.roadType,
        congestionFactor: edge.congestionFactor,
        allowedTransportation: JSON.stringify(edge.allowedTransportation),
        isElectricCartRoute: edge.isElectricCartRoute,
        isBicyclePath: edge.isBicyclePath,
        transportation: 'mixed',
      };
    })
    .filter(
      (
        edge,
      ): edge is {
        id: string;
        scenicAreaId: string;
        fromNodeId: string;
        toNodeId: string;
        distance: number;
        roadType: string;
        congestionFactor: number;
        allowedTransportation: string;
        isElectricCartRoute: boolean;
        isBicyclePath: boolean;
        transportation: string;
      } => Boolean(edge),
    );

const insertInChunks = async (repository: { insert: (values: any[]) => Promise<unknown> }, items: any[], chunkSize = 400) => {
  for (let index = 0; index < items.length; index += chunkSize) {
    await repository.insert(items.slice(index, index + chunkSize));
  }
};

async function importData() {
  const dataSource = new DataSource(createDatabaseOptions());

  try {
    await dataSource.initialize();
    console.log('开始导入真实景区与校园数据...');

    const scenicRepo = dataSource.getRepository(ScenicArea);
    const attractionRepo = dataSource.getRepository(Attraction);
    const facilityRepo = dataSource.getRepository(Facility);
    const foodRepo = dataSource.getRepository(Food);
    const nodeRepo = dataSource.getRepository(RoadGraphNode);
    const edgeRepo = dataSource.getRepository(RoadGraphEdge);
    const photoSpotRepo = dataSource.getRepository(PhotoSpot);
    const photoCheckinRepo = dataSource.getRepository(PhotoCheckin);
    const socialTeamRepo = dataSource.getRepository(SocialTeam);
    const socialTeamMemberRepo = dataSource.getRepository(SocialTeamMember);
    const socialCheckinRepo = dataSource.getRepository(SocialCheckin);
    const achievementRepo = dataSource.getRepository(Achievement);
    const userRepo = dataSource.getRepository(User);
    const existingScenicAreas = await scenicRepo.find({
      select: {
        name: true,
        coverImageUrl: true,
        coverSource: true,
        coverAuthor: true,
        coverLicense: true,
        coverPageUrl: true,
      },
    });
    const existingCoverMap = new Map(
      existingScenicAreas.map((item) => [
        item.name,
        {
          coverImageUrl: item.coverImageUrl || null,
          coverSource: item.coverSource || null,
          coverAuthor: item.coverAuthor || null,
          coverLicense: item.coverLicense || null,
          coverPageUrl: item.coverPageUrl || null,
        },
      ]),
    );

    await achievementRepo.clear();
    await socialTeamMemberRepo.clear();
    await socialTeamRepo.clear();
    await socialCheckinRepo.clear();
    await photoCheckinRepo.clear();
    await photoSpotRepo.clear();
    await edgeRepo.clear();
    await nodeRepo.clear();
    await foodRepo.clear();
    await facilityRepo.clear();
    await attractionRepo.clear();
    await scenicRepo.clear();

    await ensureDemoUsers(dataSource);

    const catalog = REAL_SCENIC_CATALOG.slice(0, Math.min(SCENIC_AREA_COUNT, REAL_SCENIC_CATALOG.length));
    let sharedRealMapTemplate: SharedRealMapTemplateData | null = null;

    if (DATA_IMPORT_MAP_MODE === 'shared_real_template') {
      try {
        sharedRealMapTemplate = await fetchSharedRealMapTemplate(SHARED_REAL_MAP_TEMPLATE);
        console.log(
          `已加载真实地图模板：${sharedRealMapTemplate.label}，路网节点 ${sharedRealMapTemplate.roadNodes.length}，路网边 ${sharedRealMapTemplate.roadEdges.length}，建筑 ${sharedRealMapTemplate.buildingPoints.length}，设施 ${sharedRealMapTemplate.facilityPoints.length}`,
        );
      } catch (templateError) {
        sharedRealMapTemplate = null;
        console.warn('真实地图模板加载失败，当前导入将回退到网格路网模式。', templateError);
      }
    }

    for (let index = 0; index < catalog.length; index += 1) {
      const item = catalog[index];
      const cityCenter = CITY_CENTERS[item.city] ?? CITY_CENTERS['北京'];
      const center = sharedRealMapTemplate
        ? {
            latitude: sharedRealMapTemplate.center.latitude,
            longitude: sharedRealMapTemplate.center.longitude,
          }
        : jitterCoord(cityCenter, 0.05 + (index % 10) * 0.002);
      const isCampus = item.category === '校园';
      const scenicId = createId();
      const scenicName = item.name;
      const preservedCover = existingCoverMap.get(scenicName);

      await scenicRepo.insert({
        id: scenicId,
        name: scenicName,
        category: item.category,
        description: buildScenicDescription(scenicName, item.city, isCampus),
        latitude: center.latitude,
        longitude: center.longitude,
        openingHours: DEFAULT_OPENING_HOURS,
        ticketPrice: isCampus ? 0 : Number(randomInRange(20, 180).toFixed(2)),
        popularity: Math.floor(randomInRange(3000, 180000)),
        averageRating: Number(randomInRange(4.0, 4.9).toFixed(2)),
        reviewCount: Math.floor(randomInRange(200, 8000)),
        tags: isCampus ? `校园,${item.city},教学,生活服务` : `景区,${item.city},观光,文旅`,
        rating: Number(randomInRange(4.0, 4.9).toFixed(2)),
        visitorCount: Math.floor(randomInRange(12000, 600000)),
        coverImageUrl: preservedCover?.coverImageUrl || null,
        coverSource: preservedCover?.coverSource || null,
        coverAuthor: preservedCover?.coverAuthor || null,
        coverLicense: preservedCover?.coverLicense || null,
        coverPageUrl: preservedCover?.coverPageUrl || null,
      });

      const buildingCategories = isCampus ? CAMPUS_BUILDING_CATEGORIES : SCENIC_BUILDING_CATEGORIES;
      const attractions = Array.from({ length: ATTRACTIONS_PER_SCENIC }, (_, attractionIndex) => {
        const templatePoint = sharedRealMapTemplate
          ? pickTemplatePoint(sharedRealMapTemplate.buildingPoints, attractionIndex, center)
          : null;
        const coord = templatePoint
          ? { latitude: templatePoint.latitude, longitude: templatePoint.longitude }
          : jitterCoord(center, 0.01);
        const buildingCategory = buildingCategories[attractionIndex % buildingCategories.length];
        return {
          id: createId(),
          scenicAreaId: scenicId,
          name: `${scenicName}-${buildingCategory}${String(attractionIndex + 1).padStart(2, '0')}`,
          type: pick(ATTRACTION_TYPES),
          category: buildingCategory,
          description: buildAttractionDescription(buildingCategory, scenicName, isCampus),
          latitude: coord.latitude,
          longitude: coord.longitude,
          openingHours: '{"default":"08:30-20:30"}',
          averageRating: Number(randomInRange(3.8, 5).toFixed(2)),
          reviewCount: Math.floor(randomInRange(20, 4000)),
          estimatedVisitDuration: Math.floor(randomInRange(20, 120)),
          congestionFactor: Number(randomInRange(0.7, 1.2).toFixed(2)),
          tags: [item.city, item.category, buildingCategory],
          indoorStructure:
            attractionIndex % 5 === 0
              ? buildIndoorStructure(`${scenicName}-${buildingCategory}${attractionIndex + 1}`)
              : '{}',
        };
      });
      await insertInChunks(attractionRepo, attractions);

      const photoSpots = attractions.slice(0, PHOTO_SPOTS_PER_SCENIC).map((attraction, photoIndex) => ({
        id: createId(),
        scenicAreaId: scenicId,
        attractionId: attraction.id,
        name: `${attraction.name}-摄影位`,
        description: buildPhotoSpotDescription(attraction.name),
        latitude: Number(attraction.latitude ?? center.latitude),
        longitude: Number(attraction.longitude ?? center.longitude),
        bestTime: ['07:00-09:30', '16:30-18:30', '09:00-11:00', '17:00-19:00'][photoIndex % 4],
        popularity: Math.floor(randomInRange(40, 600)),
        crowdLevel: ['low', 'medium', 'high', 'medium'][photoIndex % 4] as 'low' | 'medium' | 'high',
        lightingCondition: ['excellent', 'good', 'fair', 'good'][photoIndex % 4] as 'excellent' | 'good' | 'fair',
        examplePhotos: JSON.stringify([
          `https://picsum.photos/seed/${scenicId}-${photoIndex + 1}-a/900/600`,
          `https://picsum.photos/seed/${scenicId}-${photoIndex + 1}-b/900/600`,
        ]),
      }));
      if (photoSpots.length > 0) {
        await insertInChunks(photoSpotRepo, photoSpots);
      }

      const facilities = Array.from({ length: FACILITIES_PER_SCENIC }, (_, facilityIndex) => {
        const templatePoint = sharedRealMapTemplate
          ? pickTemplatePoint(sharedRealMapTemplate.facilityPoints, facilityIndex, center)
          : null;
        const coord = templatePoint
          ? { latitude: templatePoint.latitude, longitude: templatePoint.longitude }
          : jitterCoord(center, 0.012);
        const category = FACILITY_CATEGORIES[facilityIndex % FACILITY_CATEGORIES.length];
        return {
          id: createId(),
          scenicAreaId: scenicId,
          name: `${scenicName}-${category}${String(facilityIndex + 1).padStart(2, '0')}`,
          category,
          latitude: coord.latitude,
          longitude: coord.longitude,
          openingHours: '{"default":"07:00-23:00"}',
          description: buildFacilityDescription(category, scenicName),
        };
      });
      await insertInChunks(facilityRepo, facilities);

      const foodFacilityCount = Math.min(facilities.length, Math.max(10, Math.floor(FOOD_PER_SCENIC / 2)));
      const foods = Array.from({ length: FOOD_PER_SCENIC }, (_, foodIndex) => {
        const facility = facilities[foodIndex % foodFacilityCount];
        const cuisine = pick(FOOD_CUISINES);
        return {
          id: createId(),
          name: `${scenicName}-${cuisine}${String(foodIndex + 1).padStart(2, '0')}`,
          facilityId: facility.id,
          cuisine,
          price: Number(randomInRange(12, 188).toFixed(2)),
          description: buildFoodDescription(cuisine, scenicName),
          popularity: Math.floor(randomInRange(100, 20000)),
          averageRating: Number(randomInRange(3.6, 4.9).toFixed(2)),
          reviewCount: Math.floor(randomInRange(15, 3000)),
          tags: [cuisine, item.category, item.city],
          isSeasonalSpecial: Math.random() < 0.15,
        };
      });
      await insertInChunks(foodRepo, foods);

      const routeNodeSource = sharedRealMapTemplate
        ? cloneSharedTemplateRoadNodes(sharedRealMapTemplate, scenicId, scenicName)
        : {
            nodes: createGridNodes(scenicId, scenicName, center),
            nodeIdMap: null,
          };
      const routeNodes = routeNodeSource.nodes;
      await insertInChunks(nodeRepo, routeNodes);

      const poiNodes = [
        ...attractions.slice(0, 10).map((attraction) => ({
          id: createId(),
          scenicAreaId: scenicId,
          type: 'attraction',
          name: attraction.name,
          latitude: attraction.latitude,
          longitude: attraction.longitude,
        })),
        ...facilities.slice(0, 10).map((facility) => ({
          id: createId(),
          scenicAreaId: scenicId,
          type: 'facility',
          name: facility.name,
          latitude: facility.latitude,
          longitude: facility.longitude,
        })),
      ];
      await insertInChunks(nodeRepo, poiNodes);

      const edges = [] as Array<{
        id: string;
        scenicAreaId: string;
        fromNodeId: string;
        toNodeId: string;
        distance: number;
        roadType: string;
        congestionFactor: number;
        allowedTransportation: string;
        isElectricCartRoute: boolean;
        isBicyclePath: boolean;
        transportation: string;
      }>;

      if (sharedRealMapTemplate && routeNodeSource.nodeIdMap) {
        edges.push(...cloneSharedTemplateRoadEdges(sharedRealMapTemplate, scenicId, routeNodeSource.nodeIdMap));
      } else {
        const indexByRowCol = (row: number, col: number) => row * GRID_SIZE + col;
        for (let row = 0; row < GRID_SIZE; row += 1) {
          for (let col = 0; col < GRID_SIZE; col += 1) {
            const current = routeNodes[indexByRowCol(row, col)];
            if (col + 1 < GRID_SIZE) {
              const right = routeNodes[indexByRowCol(row, col + 1)];
              const roadType = roadTypeByGrid(row, col);
              edges.push({
                id: createId(),
                scenicAreaId: scenicId,
                fromNodeId: current.id,
                toNodeId: right.id,
                distance: Number(
                  haversineMeter(
                    { latitude: current.latitude, longitude: current.longitude },
                    { latitude: right.latitude, longitude: right.longitude },
                  ).toFixed(2),
                ),
                roadType,
                congestionFactor: Number(randomInRange(0.75, 1.15).toFixed(2)),
                allowedTransportation: JSON.stringify(allowedTransportByRoadType(roadType)),
                isElectricCartRoute: roadType === 'main_road' && Math.random() < 0.75,
                isBicyclePath: roadType === 'bicycle_path' || (roadType === 'main_road' && Math.random() < 0.35),
                transportation: 'mixed',
              });
            }

            if (row + 1 < GRID_SIZE) {
              const down = routeNodes[indexByRowCol(row + 1, col)];
              const roadType = roadTypeByGrid(row, col);
              edges.push({
                id: createId(),
                scenicAreaId: scenicId,
                fromNodeId: current.id,
                toNodeId: down.id,
                distance: Number(
                  haversineMeter(
                    { latitude: current.latitude, longitude: current.longitude },
                    { latitude: down.latitude, longitude: down.longitude },
                  ).toFixed(2),
                ),
                roadType,
                congestionFactor: Number(randomInRange(0.75, 1.15).toFixed(2)),
                allowedTransportation: JSON.stringify(allowedTransportByRoadType(roadType)),
                isElectricCartRoute: roadType === 'main_road' && Math.random() < 0.75,
                isBicyclePath: roadType === 'bicycle_path' || (roadType === 'main_road' && Math.random() < 0.35),
                transportation: 'mixed',
              });
            }
          }
        }
      }

      const nearestGridNode = (coord: LatLng) => {
        let nearest = routeNodes[0];
        let minDistance = Number.POSITIVE_INFINITY;

        for (const node of routeNodes) {
          const distance = haversineMeter(
            { latitude: node.latitude, longitude: node.longitude },
            coord,
          );
          if (distance < minDistance) {
            minDistance = distance;
            nearest = node;
          }
        }

        return nearest;
      };

      for (const poiNode of poiNodes) {
        const anchor = nearestGridNode({
          latitude: Number(poiNode.latitude),
          longitude: Number(poiNode.longitude),
        });

        edges.push({
          id: createId(),
          scenicAreaId: scenicId,
          fromNodeId: poiNode.id,
          toNodeId: anchor.id,
          distance: Number(
            haversineMeter(
              { latitude: Number(poiNode.latitude), longitude: Number(poiNode.longitude) },
              { latitude: anchor.latitude, longitude: anchor.longitude },
            ).toFixed(2),
          ),
          roadType: 'connector',
          congestionFactor: Number(randomInRange(0.7, 1.05).toFixed(2)),
          allowedTransportation: JSON.stringify(['walk']),
          isElectricCartRoute: false,
          isBicyclePath: false,
          transportation: 'walk',
        });
      }

      await insertInChunks(edgeRepo, edges);

      if ((index + 1) % 10 === 0 || index + 1 === catalog.length) {
        console.log(
          `导入进度 ${index + 1}/${catalog.length}：${scenicName}，建筑 ${attractions.length}，设施 ${facilities.length}，路网边 ${edges.length}`,
        );
      }
    }

    const [scenicCount, attractionCount, facilityCount, foodCount, photoSpotCount, nodeCount, edgeCount, userCount] =
      await Promise.all([
        scenicRepo.count(),
        attractionRepo.count(),
        facilityRepo.count(),
        foodRepo.count(),
        photoSpotRepo.count(),
        nodeRepo.count(),
        edgeRepo.count(),
        userRepo.count(),
      ]);

    console.log('真实数据导入完成');
    console.log(
      `统计：景区/校园 ${scenicCount}，内部建筑 ${attractionCount}，设施 ${facilityCount}，美食 ${foodCount}，摄影点 ${photoSpotCount}，路网节点 ${nodeCount}，路网边 ${edgeCount}，用户 ${userCount}`,
    );
  } catch (error) {
    console.error('数据导入失败:', error);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void importData();
