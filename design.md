# 个性化旅游系统 - 设计文档

## Overview

个性化旅游系统是一个综合性旅游平台，提供从旅游规划到旅游记录的全流程服务。系统的核心特点是基于自主设计的数据结构和算法，实现高性能的个性化推荐、多策略路线规划和智能导航功能。

系统主要解决以下问题：
- 海量景区数据的高效存储和检索
- 基于用户兴趣的个性化推荐
- 复杂道路网络的多策略路径规划
- 室内外一体化导航
- 旅游日记的智能生成和社交分享

系统支持200+景区、4000+景点、10000+服务设施的数据规模，能够处理100个并发用户，提供毫秒级的查询和推荐响应。

## Architecture

### 整体架构

系统采用分层架构设计，分为以下层次：

**表示层（Presentation Layer）**
- Web前端：基于React的单页应用，提供响应式UI
- 移动端：React Native跨平台应用
- 地图可视化：集成Leaflet.js进行地图展示和路径可视化

**业务逻辑层（Business Logic Layer）**
- 推荐引擎：基于自主设计数据结构的多维度推荐算法
- 路径规划引擎：支持多交通工具和多策略的路径算法
- 查询引擎：高性能的模糊查找和全文检索
- 用户行为分析：学习用户偏好并动态调整推荐权重
- AIGC引擎：集成第三方AI服务生成旅游动画

**数据访问层（Data Access Layer）**
- ORM映射：使用TypeORM进行对象关系映射
- 缓存管理：Redis缓存热点数据
- 数据压缩：自主实现的无损压缩算法

**数据层（Data Layer）**
- 关系数据库：PostgreSQL存储结构化数据
- 文件存储：MinIO存储图片和视频
- 图数据库：Neo4j存储道路网络图（可选优化）


### 模块划分

**核心模块**

1. **用户管理模块（User Management）**
   - 用户注册、登录、认证
   - 用户兴趣类型管理（7种类型）
   - 用户行为追踪和学习

2. **景区数据管理模块（Scenic Area Management）**
   - 景区、景点、服务设施的CRUD操作
   - 道路图数据管理
   - 数据导入导出

3. **推荐引擎模块（Recommendation Engine）**
   - 多维度排行榜（热度榜、评分榜、评价榜、个人兴趣榜）
   - 增量推荐系统
   - 创意推荐算法（探索模式、惊喜推荐、时间感知、季节性推荐）
   - 美食推荐

4. **路径规划模块（Path Planning）**
   - 最短距离策略
   - 最短时间策略
   - 多交通工具路径规划（步行、自行车、电瓶车）
   - 多景点路线优化
   - 室内导航（大门到电梯、楼层间、楼层内）

5. **查询模块（Query Module）**
   - 景区查询（名称、类别、关键字）
   - 服务设施查询（类别、距离）
   - 美食模糊查询
   - 日记查询（目的地、名称、全文检索）

6. **旅游日记模块（Travel Diary）**
   - 日记生成和编辑
   - 日记压缩存储
   - 日记分享和评论
   - AIGC动画生成

7. **社交互动模块（Social Interaction）**
   - 实时热点
   - 附近游客
   - 组队游览
   - 签到打卡
   - 成就系统

8. **个性化服务模块（Personalization）**
   - 摄影打卡功能
   - 美食爱好者专属功能
   - 智能时间规划
   - 个性化提醒和建议


### 技术栈选择

**前端技术栈**
- React 18：构建用户界面
- TypeScript：类型安全
- Leaflet.js：地图展示和路径可视化
- Ant Design：UI组件库
- Redux Toolkit：状态管理
- React Router：路由管理
- Axios：HTTP客户端

**后端技术栈**
- Node.js + Express：Web服务器
- TypeScript：类型安全
- TypeORM：ORM框架
- PostgreSQL：关系数据库
- Redis：缓存和会话管理
- MinIO：对象存储
- JWT：身份认证
- Socket.io：实时通信（用于组队功能）

**算法实现语言**
- TypeScript：所有自主设计的数据结构和算法使用TypeScript实现，确保类型安全和可维护性

**开发工具**
- Git：版本控制
- Docker：容器化部署
- Jest：单元测试
- fast-check：属性测试库

**第三方服务**
- AIGC服务：集成Stable Diffusion或类似服务生成动画
- 地图服务：OpenStreetMap数据

## Components and Interfaces

### 核心组件

#### 1. 推荐引擎组件（RecommendationEngine）

**职责**：提供多维度的景区和日记推荐

**接口**：
```typescript
interface RecommendationEngine {
  // 获取排行榜推荐
  getRanking(type: RankingType, userId: string, offset: number): Promise<ScenicArea[]>;
  
  // 获取美食推荐
  getFoodRecommendation(locationId: string, userId: string): Promise<Food[]>;
  
  // 获取日记推荐
  getDiaryRecommendation(userId: string, offset: number): Promise<Diary[]>;
  
  // 探索模式推荐
  getExplorationRecommendation(userId: string): Promise<ScenicArea[]>;
  
  // 惊喜推荐
  getSurpriseRecommendation(userId: string): Promise<ScenicArea[]>;
}

enum RankingType {
  POPULARITY = 'popularity',
  RATING = 'rating',
  REVIEW = 'review',
  PERSONALIZED = 'personalized'
}
```


#### 2. 路径规划组件（PathPlanner）

**职责**：计算景区内和室内的最优路径

**接口**：
```typescript
interface PathPlanner {
  // 单点到单点路径规划
  findPath(
    startId: string,
    endId: string,
    strategy: PathStrategy,
    transportation: Transportation[]
  ): Promise<PathResult>;
  
  // 多点路径优化
  optimizeMultiPointPath(
    points: string[],
    strategy: PathStrategy
  ): Promise<MultiPointPathResult>;
  
  // 室内导航
  findIndoorPath(
    buildingId: string,
    startLocation: IndoorLocation,
    endLocation: IndoorLocation
  ): Promise<IndoorPathResult>;
}

enum PathStrategy {
  SHORTEST_DISTANCE = 'shortest_distance',
  SHORTEST_TIME = 'shortest_time'
}

enum Transportation {
  WALK = 'walk',
  BICYCLE = 'bicycle',
  ELECTRIC_CART = 'electric_cart'
}

interface PathResult {
  path: PathSegment[];
  totalDistance: number;
  totalTime: number;
}

interface PathSegment {
  from: string;
  to: string;
  distance: number;
  time: number;
  transportation: Transportation;
}
```

#### 3. 查询引擎组件（QueryEngine）

**职责**：提供高性能的数据查询功能

**接口**：
```typescript
interface QueryEngine {
  // 景区查询
  searchScenicAreas(query: ScenicAreaQuery): Promise<ScenicArea[]>;
  
  // 服务设施查询
  searchFacilities(query: FacilityQuery): Promise<Facility[]>;
  
  // 美食模糊查询
  fuzzySearchFood(keyword: string, locationId: string): Promise<Food[]>;
  
  // 日记查询
  searchDiaries(query: DiaryQuery): Promise<Diary[]>;
  
  // 日记全文检索
  fullTextSearchDiaries(keywords: string[]): Promise<DiarySearchResult[]>;
}

interface ScenicAreaQuery {
  name?: string;
  category?: string;
  keyword?: string;
  sortBy?: 'popularity' | 'rating';
}

interface FacilityQuery {
  category?: string;
  userLocation: string;
  maxDistance?: number;
}

interface DiaryQuery {
  destination?: string;
  name?: string;
  sortBy?: 'popularity' | 'rating';
}
```


#### 4. 用户行为分析组件（UserBehaviorAnalyzer）

**职责**：学习用户行为并调整推荐权重

**接口**：
```typescript
interface UserBehaviorAnalyzer {
  // 记录用户行为
  recordBehavior(userId: string, behavior: UserBehavior): Promise<void>;
  
  // 计算用户兴趣权重
  calculateInterestWeights(userId: string): Promise<InterestWeights>;
  
  // 更新用户兴趣权重（每周执行）
  updateInterestWeights(userId: string): Promise<void>;
  
  // 获取推荐解释
  getRecommendationExplanation(userId: string, itemId: string): Promise<string>;
}

interface UserBehavior {
  type: 'browse' | 'favorite' | 'rate' | 'dislike';
  targetType: 'scenic_area' | 'diary' | 'food';
  targetId: string;
  duration?: number; // 浏览时长（秒）
  rating?: number; // 评分（1-5）
  timestamp: Date;
}

interface InterestWeights {
  foodie: number;
  photographer: number;
  cultureEnthusiast: number;
  natureLover: number;
  sportsEnthusiast: number;
  relaxationSeeker: number;
  socialSharer: number;
}
```


#### 5. 日记管理组件（DiaryManager）

**职责**：管理旅游日记的生成、存储和分享

**接口**：
```typescript
interface DiaryManager {
  // 生成日记草稿
  generateDraft(userId: string, photos: Photo[], videos: Video[]): Promise<Diary>;
  
  // 保存日记
  saveDiary(diary: Diary): Promise<string>;
  
  // 压缩日记内容
  compressDiary(content: string): Promise<Buffer>;
  
  // 解压缩日记内容
  decompressDiary(compressed: Buffer): Promise<string>;
  
  // 分享日记
  shareDiary(diaryId: string): Promise<void>;
  
  // 生成AIGC动画
  generateAnimation(photos: Photo[], description: string): Promise<string>;
}

interface Photo {
  url: string;
  timestamp: Date;
  location?: GeoLocation;
}

interface Video {
  url: string;
  timestamp: Date;
  duration: number;
}
```

#### 6. 智能规划组件（SmartPlanner）

**职责**：生成一日游计划并动态调整

**接口**：
```typescript
interface SmartPlanner {
  // 生成一日游计划
  generateDayPlan(
    userId: string,
    scenicAreaId: string,
    intensity: 'low' | 'medium' | 'high'
  ): Promise<DayPlan>;
  
  // 动态调整行程
  adjustPlan(
    planId: string,
    currentLocation: string,
    currentTime: Date
  ): Promise<DayPlan>;
}

interface DayPlan {
  id: string;
  attractions: PlannedAttraction[];
  meals: PlannedMeal[];
  totalDistance: number;
  totalTime: number;
}

interface PlannedAttraction {
  attractionId: string;
  arrivalTime: Date;
  stayDuration: number; // 分钟
  isMustVisit: boolean;
}

interface PlannedMeal {
  time: Date;
  duration: number; // 分钟
  suggestedLocation: string;
}
```


## Data Models

### 核心数据结构

#### 1. 景区和景点数据结构

**景区（ScenicArea）**
```typescript
interface ScenicArea {
  id: string;
  name: string;
  category: string; // 自然风光、历史文化、主题公园、校园等
  description: string;
  location: GeoLocation;
  openingHours: OpeningHours;
  ticketPrice: number;
  popularity: number; // 访问量
  averageRating: number; // 平均评分（1-5）
  reviewCount: number; // 评价数量
  attractions: Attraction[]; // 至少20个景点
  facilities: Facility[]; // 至少50个设施
  roadGraph: RoadGraph; // 道路图（至少200条边）
  tags: string[]; // 标签，用于分类和推荐
  createdAt: Date;
  updatedAt: Date;
}

interface Attraction {
  id: string;
  scenicAreaId: string;
  name: string;
  type: string; // 建筑、自然景观、展览馆等
  description: string;
  location: GeoLocation;
  openingHours: OpeningHours;
  averageRating: number;
  reviewCount: number;
  photoSpots: PhotoSpot[]; // 拍照位置
  indoorStructure?: IndoorStructure; // 室内结构（如果是建筑物）
  estimatedVisitDuration: number; // 建议游览时长（分钟）
  congestionFactor: number; // 拥挤度（0-1）
  tags: string[];
}

interface PhotoSpot {
  id: string;
  location: GeoLocation;
  bestTime: string; // 最佳拍照时间，如"早上8-10点"
  description: string;
  examplePhotos: string[]; // 示例照片URL
  popularity: number;
}

interface GeoLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
}

interface OpeningHours {
  monday: TimeRange;
  tuesday: TimeRange;
  wednesday: TimeRange;
  thursday: TimeRange;
  friday: TimeRange;
  saturday: TimeRange;
  sunday: TimeRange;
}

interface TimeRange {
  open: string; // "08:00"
  close: string; // "18:00"
  isClosed: boolean;
}
```


#### 2. 道路图数据结构（自主设计）

道路图使用邻接表表示，支持高效的路径查询和动态更新。

```typescript
// 道路图核心数据结构
class RoadGraph {
  private nodes: Map<string, GraphNode>; // 节点映射
  private edges: Map<string, GraphEdge[]>; // 邻接表
  private edgeCount: number; // 边的数量（至少200条）
  
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.edgeCount = 0;
  }
  
  // 添加节点
  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.edges.has(node.id)) {
      this.edges.set(node.id, []);
    }
  }
  
  // 添加边
  addEdge(edge: GraphEdge): void {
    const fromEdges = this.edges.get(edge.from);
    if (fromEdges) {
      fromEdges.push(edge);
      this.edgeCount++;
    }
  }
  
  // 获取节点的所有邻接边
  getAdjacentEdges(nodeId: string): GraphEdge[] {
    return this.edges.get(nodeId) || [];
  }
  
  // 获取节点
  getNode(nodeId: string): GraphNode | undefined {
    return this.nodes.get(nodeId);
  }
  
  // 获取所有节点
  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }
  
  // 获取边的数量
  getEdgeCount(): number {
    return this.edgeCount;
  }
}

interface GraphNode {
  id: string;
  type: 'attraction' | 'facility' | 'junction'; // 景点、设施或路口
  name: string;
  location: GeoLocation;
}

interface GraphEdge {
  id: string;
  from: string; // 起点节点ID
  to: string; // 终点节点ID
  distance: number; // 距离（米）
  roadType: RoadType;
  congestionFactor: number; // 拥挤度（0-1），真实速度=拥挤度×理想速度
  allowedTransportation: Transportation[]; // 允许的交通工具
  isElectricCartRoute: boolean; // 是否为电瓶车路线
  isBicyclePath: boolean; // 是否为自行车道
}

enum RoadType {
  MAIN_ROAD = 'main_road',
  SIDE_ROAD = 'side_road',
  FOOTPATH = 'footpath',
  BICYCLE_PATH = 'bicycle_path',
  ELECTRIC_CART_ROUTE = 'electric_cart_route'
}
```


#### 3. 室内结构数据结构

```typescript
interface IndoorStructure {
  buildingId: string;
  entrances: Entrance[]; // 大门
  elevators: Elevator[]; // 电梯
  floors: Floor[]; // 楼层
}

interface Entrance {
  id: string;
  name: string;
  location: GeoLocation;
  connectedElevators: string[]; // 可到达的电梯ID
}

interface Elevator {
  id: string;
  location: GeoLocation;
  floors: number[]; // 可到达的楼层
  averageWaitTime: number; // 平均等待时间（秒）
}

interface Floor {
  number: number;
  rooms: Room[];
  layout: FloorLayout; // 楼层平面图
}

interface Room {
  id: string;
  number: string; // 房间号
  name: string;
  type: string; // 教室、办公室、实验室等
  location: IndoorLocation;
}

interface IndoorLocation {
  floor: number;
  x: number; // 平面坐标
  y: number;
}

interface FloorLayout {
  width: number;
  height: number;
  walls: Wall[]; // 墙壁，用于路径规划
  corridors: Corridor[]; // 走廊
}

interface Wall {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

interface Corridor {
  points: { x: number; y: number }[];
  width: number;
}
```


#### 4. 用户数据结构

```typescript
interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  interests: UserInterest[]; // 用户选择的兴趣类型（可多选）
  interestWeights: InterestWeights; // 动态学习的兴趣权重
  behaviorHistory: UserBehavior[]; // 行为历史
  viewedItems: Set<string>; // 已展示的推荐项（用于增量推荐）
  favorites: string[]; // 收藏的景区ID
  dislikedCategories: string[]; // 不感兴趣的类别
  achievements: Achievement[]; // 成就徽章
  createdAt: Date;
  updatedAt: Date;
}

enum UserInterest {
  FOODIE = 'foodie', // 美食爱好者
  PHOTOGRAPHER = 'photographer', // 摄影打卡者
  CULTURE_ENTHUSIAST = 'culture_enthusiast', // 历史文化爱好者
  NATURE_LOVER = 'nature_lover', // 自然风光爱好者
  SPORTS_ENTHUSIAST = 'sports_enthusiast', // 运动健身者
  RELAXATION_SEEKER = 'relaxation_seeker', // 休闲放松者
  SOCIAL_SHARER = 'social_sharer' // 社交分享者
}

interface Achievement {
  id: string;
  type: AchievementType;
  name: string;
  description: string;
  earnedAt: Date;
}

enum AchievementType {
  FOODIE_MASTER = 'foodie_master', // 美食达人
  PHOTOGRAPHY_MASTER = 'photography_master', // 摄影大师
  EXPLORATION_PIONEER = 'exploration_pioneer', // 探索先锋
  SOCIAL_MASTER = 'social_master' // 社交达人
}
```


#### 5. 服务设施和美食数据结构

```typescript
interface Facility {
  id: string;
  scenicAreaId: string;
  name: string;
  category: FacilityCategory;
  location: GeoLocation;
  openingHours: OpeningHours;
  description: string;
}

enum FacilityCategory {
  RESTAURANT = 'restaurant', // 饭店
  FOOD_STALL = 'food_stall', // 美食摊位
  SHOP = 'shop', // 商店
  RESTROOM = 'restroom', // 洗手间
  PARKING = 'parking', // 停车场
  INFO_CENTER = 'info_center', // 游客中心
  MEDICAL = 'medical', // 医疗点
  ATM = 'atm' // ATM
}

interface Food {
  id: string;
  name: string;
  facilityId: string; // 所属饭店或窗口
  cuisine: Cuisine; // 菜系
  price: number;
  description: string;
  popularity: number;
  averageRating: number;
  reviewCount: number;
  tags: string[]; // 辣、甜、素食等标签
  isSeasonalSpecial: boolean; // 是否为应季美食
}

enum Cuisine {
  SICHUAN = 'sichuan', // 川菜
  CANTONESE = 'cantonese', // 粤菜
  SHANDONG = 'shandong', // 鲁菜
  JIANGSU = 'jiangsu', // 苏菜
  ZHEJIANG = 'zhejiang', // 浙菜
  FUJIAN = 'fujian', // 闽菜
  HUNAN = 'hunan', // 湘菜
  ANHUI = 'anhui', // 徽菜
  WESTERN = 'western', // 西餐
  JAPANESE = 'japanese', // 日料
  KOREAN = 'korean', // 韩餐
  SNACK = 'snack' // 小吃
}
```


#### 6. 旅游日记数据结构

```typescript
interface Diary {
  id: string;
  userId: string;
  title: string;
  content: string; // 文字内容
  compressedContent?: Buffer; // 压缩后的内容
  photos: Photo[];
  videos: Video[];
  destination: string; // 旅游目的地
  visitDate: Date;
  route: string[]; // 游览路径（景点ID列表）
  popularity: number; // 浏览量
  averageRating: number;
  reviewCount: number;
  isShared: boolean; // 是否分享到公共空间
  createdAt: Date;
  updatedAt: Date;
}

interface DiaryComment {
  id: string;
  diaryId: string;
  userId: string;
  content: string;
  createdAt: Date;
}
```

#### 7. 推荐系统数据结构（自主设计）

推荐系统使用优先队列（最小堆）实现Top-K推荐，无需完全排序。

```typescript
// 推荐项
interface RecommendationItem {
  id: string;
  score: number; // 推荐分数
  type: 'scenic_area' | 'food' | 'diary';
  data: any; // 实际数据对象
}

// 最小堆实现（用于Top-K推荐）
class MinHeap<T extends { score: number }> {
  private heap: T[];
  private capacity: number; // K值，如10
  
  constructor(capacity: number) {
    this.heap = [];
    this.capacity = capacity;
  }
  
  // 插入元素（如果分数大于堆顶，则替换）
  insert(item: T): void {
    if (this.heap.length < this.capacity) {
      this.heap.push(item);
      this.bubbleUp(this.heap.length - 1);
    } else if (item.score > this.heap[0].score) {
      this.heap[0] = item;
      this.bubbleDown(0);
    }
  }
  
  // 获取Top-K结果（降序）
  getTopK(): T[] {
    return this.heap.sort((a, b) => b.score - a.score);
  }
  
  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].score >= this.heap[parentIndex].score) break;
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }
  
  private bubbleDown(index: number): void {
    while (true) {
      let minIndex = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      
      if (leftChild < this.heap.length && this.heap[leftChild].score < this.heap[minIndex].score) {
        minIndex = leftChild;
      }
      if (rightChild < this.heap.length && this.heap[rightChild].score < this.heap[minIndex].score) {
        minIndex = rightChild;
      }
      
      if (minIndex === index) break;
      [this.heap[index], this.heap[minIndex]] = [this.heap[minIndex], this.heap[index]];
      index = minIndex;
    }
  }
}
```


#### 8. 查找算法数据结构（自主设计）

**Trie树（前缀树）用于快速名称查询**

```typescript
class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  data: any[]; // 存储匹配的数据对象
  
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.data = [];
  }
}

class Trie {
  private root: TrieNode;
  
  constructor() {
    this.root = new TrieNode();
  }
  
  // 插入词条
  insert(word: string, data: any): void {
    let node = this.root;
    for (const char of word.toLowerCase()) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    node.isEndOfWord = true;
    node.data.push(data);
  }
  
  // 精确查找
  search(word: string): any[] {
    let node = this.root;
    for (const char of word.toLowerCase()) {
      if (!node.children.has(char)) {
        return [];
      }
      node = node.children.get(char)!;
    }
    return node.isEndOfWord ? node.data : [];
  }
  
  // 前缀查找
  searchByPrefix(prefix: string): any[] {
    let node = this.root;
    for (const char of prefix.toLowerCase()) {
      if (!node.children.has(char)) {
        return [];
      }
      node = node.children.get(char)!;
    }
    return this.collectAllData(node);
  }
  
  private collectAllData(node: TrieNode): any[] {
    let results: any[] = [];
    if (node.isEndOfWord) {
      results.push(...node.data);
    }
    for (const child of node.children.values()) {
      results.push(...this.collectAllData(child));
    }
    return results;
  }
}
```

**倒排索引用于全文检索**

```typescript
class InvertedIndex {
  private index: Map<string, Set<string>>; // 词 -> 文档ID集合
  private documents: Map<string, string>; // 文档ID -> 文档内容
  
  constructor() {
    this.index = new Map();
    this.documents = new Map();
  }
  
  // 添加文档
  addDocument(docId: string, content: string): void {
    this.documents.set(docId, content);
    const words = this.tokenize(content);
    
    for (const word of words) {
      if (!this.index.has(word)) {
        this.index.set(word, new Set());
      }
      this.index.get(word)!.add(docId);
    }
  }
  
  // 搜索关键词
  search(keywords: string[]): string[] {
    if (keywords.length === 0) return [];
    
    const normalizedKeywords = keywords.map(k => k.toLowerCase());
    let resultSet = this.index.get(normalizedKeywords[0]) || new Set<string>();
    
    // 多关键词取交集
    for (let i = 1; i < normalizedKeywords.length; i++) {
      const keywordSet = this.index.get(normalizedKeywords[i]) || new Set<string>();
      resultSet = new Set([...resultSet].filter(id => keywordSet.has(id)));
    }
    
    return Array.from(resultSet);
  }
  
  private tokenize(text: string): string[] {
    // 简单分词：按空格和标点分割
    return text.toLowerCase()
      .split(/[\s,，.。!！?？;；:：、]+/)
      .filter(word => word.length > 0);
  }
}
```


#### 9. 压缩算法数据结构（自主设计）

使用LZ77变体实现无损压缩。

```typescript
// LZ77压缩算法
class LZ77Compressor {
  private windowSize: number = 4096; // 滑动窗口大小
  private lookaheadSize: number = 18; // 前向缓冲区大小
  
  // 压缩
  compress(input: string): Buffer {
    const tokens: CompressionToken[] = [];
    let position = 0;
    
    while (position < input.length) {
      const match = this.findLongestMatch(input, position);
      
      if (match.length > 2) {
        // 找到匹配，输出(offset, length, nextChar)
        tokens.push({
          type: 'match',
          offset: match.offset,
          length: match.length,
          nextChar: input[position + match.length] || ''
        });
        position += match.length + 1;
      } else {
        // 没有匹配，输出字面字符
        tokens.push({
          type: 'literal',
          char: input[position]
        });
        position++;
      }
    }
    
    return this.encodeTokens(tokens);
  }
  
  // 解压缩
  decompress(compressed: Buffer): string {
    const tokens = this.decodeTokens(compressed);
    let output = '';
    
    for (const token of tokens) {
      if (token.type === 'literal') {
        output += token.char;
      } else {
        // 从输出中复制匹配的字符串
        const start = output.length - token.offset;
        for (let i = 0; i < token.length; i++) {
          output += output[start + i];
        }
        output += token.nextChar;
      }
    }
    
    return output;
  }
  
  private findLongestMatch(input: string, position: number): { offset: number; length: number } {
    const windowStart = Math.max(0, position - this.windowSize);
    let bestMatch = { offset: 0, length: 0 };
    
    for (let i = windowStart; i < position; i++) {
      let length = 0;
      while (
        length < this.lookaheadSize &&
        position + length < input.length &&
        input[i + length] === input[position + length]
      ) {
        length++;
      }
      
      if (length > bestMatch.length) {
        bestMatch = { offset: position - i, length };
      }
    }
    
    return bestMatch;
  }
  
  private encodeTokens(tokens: CompressionToken[]): Buffer {
    // 将tokens编码为二进制格式
    // 实现细节省略
    return Buffer.from(JSON.stringify(tokens));
  }
  
  private decodeTokens(compressed: Buffer): CompressionToken[] {
    // 从二进制格式解码tokens
    // 实现细节省略
    return JSON.parse(compressed.toString());
  }
}

interface CompressionToken {
  type: 'literal' | 'match';
  char?: string;
  offset?: number;
  length?: number;
  nextChar?: string;
}
```


### 数据库设计

#### 数据表设计

**scenic_areas表**
```sql
CREATE TABLE scenic_areas (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  opening_hours JSONB,
  ticket_price DECIMAL(10, 2),
  popularity INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_popularity (popularity DESC),
  INDEX idx_rating (average_rating DESC),
  FULLTEXT INDEX idx_name (name)
);
```

**attractions表**
```sql
CREATE TABLE attractions (
  id VARCHAR(36) PRIMARY KEY,
  scenic_area_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  description TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  opening_hours JSONB,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  estimated_visit_duration INTEGER,
  congestion_factor DECIMAL(3, 2) DEFAULT 1.0,
  tags TEXT[],
  indoor_structure JSONB,
  FOREIGN KEY (scenic_area_id) REFERENCES scenic_areas(id) ON DELETE CASCADE,
  INDEX idx_scenic_area (scenic_area_id)
);
```

**facilities表**
```sql
CREATE TABLE facilities (
  id VARCHAR(36) PRIMARY KEY,
  scenic_area_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  opening_hours JSONB,
  description TEXT,
  FOREIGN KEY (scenic_area_id) REFERENCES scenic_areas(id) ON DELETE CASCADE,
  INDEX idx_scenic_area (scenic_area_id),
  INDEX idx_category (category)
);
```

**road_graph_nodes表**
```sql
CREATE TABLE road_graph_nodes (
  id VARCHAR(36) PRIMARY KEY,
  scenic_area_id VARCHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  FOREIGN KEY (scenic_area_id) REFERENCES scenic_areas(id) ON DELETE CASCADE,
  INDEX idx_scenic_area (scenic_area_id)
);
```

**road_graph_edges表**
```sql
CREATE TABLE road_graph_edges (
  id VARCHAR(36) PRIMARY KEY,
  scenic_area_id VARCHAR(36) NOT NULL,
  from_node_id VARCHAR(36) NOT NULL,
  to_node_id VARCHAR(36) NOT NULL,
  distance DECIMAL(10, 2) NOT NULL,
  road_type VARCHAR(50),
  congestion_factor DECIMAL(3, 2) DEFAULT 1.0,
  allowed_transportation TEXT[],
  is_electric_cart_route BOOLEAN DEFAULT FALSE,
  is_bicycle_path BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (scenic_area_id) REFERENCES scenic_areas(id) ON DELETE CASCADE,
  FOREIGN KEY (from_node_id) REFERENCES road_graph_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (to_node_id) REFERENCES road_graph_nodes(id) ON DELETE CASCADE,
  INDEX idx_from_node (from_node_id),
  INDEX idx_scenic_area (scenic_area_id)
);
```


**users表**
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  interests TEXT[],
  interest_weights JSONB,
  viewed_items TEXT[],
  favorites TEXT[],
  disliked_categories TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_username (username)
);
```

**user_behaviors表**
```sql
CREATE TABLE user_behaviors (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  behavior_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(36) NOT NULL,
  duration INTEGER,
  rating INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_timestamp (timestamp DESC)
);
```

**diaries表**
```sql
CREATE TABLE diaries (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  compressed_content BYTEA,
  destination VARCHAR(255),
  visit_date DATE,
  route TEXT[],
  popularity INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_destination (destination),
  INDEX idx_popularity (popularity DESC),
  INDEX idx_shared (is_shared),
  FULLTEXT INDEX idx_title (title),
  FULLTEXT INDEX idx_content (content)
);
```

**foods表**
```sql
CREATE TABLE foods (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  facility_id VARCHAR(36) NOT NULL,
  cuisine VARCHAR(50),
  price DECIMAL(10, 2),
  description TEXT,
  popularity INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  tags TEXT[],
  is_seasonal_special BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
  INDEX idx_facility (facility_id),
  INDEX idx_cuisine (cuisine),
  INDEX idx_popularity (popularity DESC),
  FULLTEXT INDEX idx_name (name)
);
```

**achievements表**
```sql
CREATE TABLE achievements (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
);
```

#### 索引设计

系统使用以下索引策略优化查询性能：

1. **主键索引**：所有表的id字段
2. **外键索引**：所有外键字段，加速JOIN操作
3. **排序索引**：popularity、average_rating等排序字段使用降序索引
4. **全文索引**：name、title、content等文本字段支持全文检索
5. **复合索引**：对于频繁组合查询的字段（如scenic_area_id + category）


### 核心算法设计

#### 1. 排序算法（用于推荐功能）

系统实现两种排序算法用于Top-K推荐：

**方案A：最小堆（MinHeap）**
- 时间复杂度：O(n log k)，其中n是总数据量，k=10
- 空间复杂度：O(k)
- 优点：无需完全排序，内存占用小
- 实现：维护大小为k的最小堆，遍历所有数据，如果当前项分数大于堆顶，则替换堆顶并调整堆

**方案B：快速选择（QuickSelect）**
- 时间复杂度：平均O(n)，最坏O(n²)
- 空间复杂度：O(1)
- 优点：平均性能最优
- 实现：基于快速排序的分区思想，找到第k大的元素，然后对前k个元素排序

#### 2. 查找算法

**方案A：Trie树（前缀树）**
- 用于：景区名称、日记名称的精确和前缀查询
- 时间复杂度：O(m)，m为查询字符串长度
- 空间复杂度：O(ALPHABET_SIZE * N * M)
- 优点：查询速度快，支持前缀匹配
- 支持动态插入和删除

**方案B：哈希表 + 倒排索引**
- 用于：类别查询、关键字查询
- 时间复杂度：O(1)平均查询时间
- 空间复杂度：O(N)
- 优点：查询速度极快
- 支持频繁变化的数据

#### 3. 最短路径算法

**方案A：Dijkstra算法（优先队列优化）**
- 用于：单源最短路径（最短距离和最短时间）
- 时间复杂度：O((V + E) log V)
- 空间复杂度：O(V)
- 优点：适合稀疏图，保证最优解
- 实现：使用最小堆作为优先队列

**方案B：A*算法**
- 用于：单源最短路径（启发式搜索）
- 时间复杂度：O(E)，取决于启发函数
- 空间复杂度：O(V)
- 优点：使用启发函数加速搜索
- 启发函数：使用欧氏距离作为估计

#### 4. 多点路径优化算法

**方案A：贪心算法（最近邻）**
- 时间复杂度：O(n²)
- 空间复杂度：O(n)
- 优点：快速，适合实时计算
- 实现：每次选择距离当前点最近的未访问点

**方案B：动态规划（TSP）**
- 时间复杂度：O(n² * 2^n)
- 空间复杂度：O(n * 2^n)
- 优点：保证最优解（对于小规模问题）
- 实现：状态压缩DP，适用于景点数量<=15的情况

#### 5. 模糊查找算法

**方案A：编辑距离（Levenshtein Distance）**
- 用于：美食名称模糊匹配
- 时间复杂度：O(m * n)
- 空间复杂度：O(m * n)
- 优点：精确度高，支持拼写错误
- 实现：动态规划计算编辑距离

**方案B：N-gram + 倒排索引**
- 用于：快速模糊匹配
- 时间复杂度：O(k)，k为候选数量
- 空间复杂度：O(N * M)
- 优点：查询速度快
- 实现：将字符串分解为n-gram，建立倒排索引

#### 6. 文本搜索算法

**方案A：倒排索引**
- 用于：日记全文检索
- 时间复杂度：O(k)，k为包含关键词的文档数
- 空间复杂度：O(W * D)，W为词汇量，D为文档数
- 优点：查询速度快，支持多关键词
- 实现：分词后建立词到文档的映射

**方案B：KMP算法**
- 用于：单关键词精确匹配
- 时间复杂度：O(n + m)
- 空间复杂度：O(m)
- 优点：线性时间复杂度
- 实现：构建部分匹配表

#### 7. 无损压缩算法

**方案A：LZ77**
- 用于：日记内容压缩
- 压缩率：通常30-50%
- 时间复杂度：O(n * w)，w为窗口大小
- 优点：压缩率高，适合文本
- 实现：滑动窗口 + 前向缓冲区

**方案B：Huffman编码**
- 用于：字符频率压缩
- 压缩率：取决于字符分布
- 时间复杂度：O(n log n)
- 优点：实现简单，解压快
- 实现：构建Huffman树，生成编码表


### API设计

#### 推荐接口

```typescript
// 获取排行榜推荐
GET /api/recommendations/ranking
Query Parameters:
  - type: 'popularity' | 'rating' | 'review' | 'personalized'
  - userId: string
  - offset: number (用于增量推荐)
Response: {
  items: ScenicArea[],
  hasMore: boolean
}

// 获取美食推荐
GET /api/recommendations/food
Query Parameters:
  - locationId: string
  - userId: string
  - cuisine?: string (可选，按菜系筛选)
Response: {
  items: Food[]
}

// 获取日记推荐
GET /api/recommendations/diary
Query Parameters:
  - userId: string
  - offset: number
Response: {
  items: Diary[],
  hasMore: boolean
}

// 探索模式推荐
GET /api/recommendations/exploration
Query Parameters:
  - userId: string
Response: {
  items: ScenicArea[]
}
```

#### 路线规划接口

```typescript
// 单点到单点路径规划
POST /api/path/single
Body: {
  startId: string,
  endId: string,
  strategy: 'shortest_distance' | 'shortest_time',
  transportation: Transportation[]
}
Response: {
  path: PathSegment[],
  totalDistance: number,
  totalTime: number
}

// 多点路径优化
POST /api/path/multi
Body: {
  points: string[],
  strategy: 'shortest_distance' | 'shortest_time'
}
Response: {
  order: string[],
  path: PathSegment[],
  totalDistance: number,
  totalTime: number
}

// 室内导航
POST /api/path/indoor
Body: {
  buildingId: string,
  startLocation: IndoorLocation,
  endLocation: IndoorLocation
}
Response: {
  instructions: string[],
  distance: number,
  estimatedTime: number
}

// 一日游计划
POST /api/path/day-plan
Body: {
  userId: string,
  scenicAreaId: string,
  intensity: 'low' | 'medium' | 'high'
}
Response: {
  plan: DayPlan
}
```

#### 查询接口

```typescript
// 景区查询
GET /api/scenic-areas/search
Query Parameters:
  - name?: string
  - category?: string
  - keyword?: string
  - sortBy?: 'popularity' | 'rating'
Response: {
  items: ScenicArea[]
}

// 服务设施查询
GET /api/facilities/search
Query Parameters:
  - category?: string
  - userLocation: string
  - maxDistance?: number
Response: {
  items: Facility[]
}

// 美食模糊查询
GET /api/food/search
Query Parameters:
  - keyword: string
  - locationId: string
  - sortBy?: 'popularity' | 'rating' | 'distance'
Response: {
  items: Food[]
}

// 日记查询
GET /api/diaries/search
Query Parameters:
  - destination?: string
  - name?: string
  - sortBy?: 'popularity' | 'rating'
Response: {
  items: Diary[]
}

// 日记全文检索
GET /api/diaries/full-text-search
Query Parameters:
  - keywords: string[] (逗号分隔)
Response: {
  items: DiarySearchResult[]
}
```

#### 日记管理接口

```typescript
// 生成日记草稿
POST /api/diaries/generate-draft
Body: {
  userId: string,
  photos: Photo[],
  videos: Video[]
}
Response: {
  draft: Diary
}

// 保存日记
POST /api/diaries
Body: {
  diary: Diary
}
Response: {
  diaryId: string
}

// 分享日记
PUT /api/diaries/:id/share
Response: {
  success: boolean
}

// 生成AIGC动画
POST /api/diaries/generate-animation
Body: {
  photos: Photo[],
  description: string
}
Response: {
  animationUrl: string
}
```

#### 社交互动接口

```typescript
// 获取实时热点
GET /api/social/trending
Response: {
  attractions: Attraction[],
  topics: string[]
}

// 获取附近游客
GET /api/social/nearby
Query Parameters:
  - userId: string
  - radius: number (默认500米)
Response: {
  users: NearbyUser[]
}

// 创建队伍
POST /api/social/teams
Body: {
  userId: string,
  name: string
}
Response: {
  teamId: string,
  inviteCode: string
}

// 签到
POST /api/social/check-in
Body: {
  userId: string,
  attractionId: string,
  photo?: string,
  text?: string
}
Response: {
  checkInId: string
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 景区数据完整性

*For any* 景区对象，该景区应当包含至少20个景点、至少10种服务设施类型、至少50个服务设施实例、以及至少200条边的道路图。

**Validates: Requirements 1.2, 1.3, 1.4, 1.5**

### Property 2: 用户注册和登录

*For any* 有效的注册信息，系统应当成功创建用户账户，并且该用户使用正确的凭证应当能够成功登录。

**Validates: Requirements 2.1, 2.2**

### Property 3: 无效凭证拒绝

*For any* 无效的登录凭证（错误的用户名或密码），系统应当拒绝访问并返回错误信息。

**Validates: Requirements 2.3**

### Property 4: 用户兴趣持久化

*For any* 用户和兴趣类型组合，保存用户兴趣后重新读取应当得到相同的兴趣配置。

**Validates: Requirements 3.5**

### Property 5: 兴趣类型影响推荐权重

*For any* 用户选择的兴趣类型，该用户获得的个性化推荐中相应类别的景区应当具有更高的权重。

**Validates: Requirements 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12**

### Property 6: 排行榜Top-K正确性

*For any* 排行榜类型（热度榜、评分榜、评价榜、个人兴趣榜）和景区数据集，系统返回的前10个景区应当是按照相应指标排序后的前10个最高分景区。

**Validates: Requirements 4.2, 4.3, 4.4, 4.7**

### Property 7: 推荐结果包含必要信息

*For any* 推荐结果，每个景区应当包含热度值和评价分数信息。

**Validates: Requirements 4.9**

### Property 8: 增量推荐不重复

*For any* 用户的连续推荐请求，系统返回的新推荐结果不应当包含已展示过的景区（除非已展示数量超过100个）。

**Validates: Requirements 4.1.3**

### Property 9: 推荐性能要求

*For any* 推荐请求，系统应当在300毫秒内返回结果。

**Validates: Requirements 4.1.10**

### Property 10: 用户行为持久化

*For any* 用户行为（浏览、收藏、评分、不感兴趣），记录后重新读取应当得到相同的行为数据。

**Validates: Requirements 4.1.8**

### Property 11: 景区查询正确性

*For any* 景区查询（按名称、类别或关键字），返回的所有景区应当匹配查询条件。

**Validates: Requirements 4.2.1, 4.2.2, 4.2.3**

### Property 12: 查询结果排序正确性

*For any* 查询结果和排序方式（热度或评价），结果应当按照指定方式降序排列。

**Validates: Requirements 4.2.4, 4.2.5**

### Property 13: 最短距离路径正确性

*For any* 道路图和起点终点对，系统计算的最短距离路径应当是所有可能路径中距离最短的。

**Validates: Requirements 6.1**

### Property 14: 路径规划性能要求

*For any* 路径规划请求，系统应当在300毫秒内返回结果。

**Validates: Requirements 6.2, 6.1.3**

### Property 15: 路径结果包含必要信息

*For any* 路径规划结果，应当包含总距离和总时间信息。

**Validates: Requirements 6.3, 6.1.4**

### Property 16: 最短时间路径考虑拥挤度

*For any* 道路图和起点终点对，系统计算的最短时间路径应当使用公式"真实速度=拥挤度×理想速度"计算通行时间。

**Validates: Requirements 6.1.2**

### Property 17: 多交通工具路径约束

*For any* 校区或景区的多交通工具路径规划，自行车应当仅在自行车道上行驶，电瓶车应当仅在电瓶车路线上行驶。

**Validates: Requirements 6.2.2, 6.3.2**

### Property 18: 多点路径访问所有景点

*For any* 景点列表，系统计算的优化路线应当访问所有指定的景点。

**Validates: Requirements 7.1**

### Property 19: 多点路径性能要求

*For any* 包含超过10个景点的路径规划请求，系统应当在5秒内返回近似最优解。

**Validates: Requirements 7.3**

### Property 20: 照片信息提取

*For any* 上传的旅游照片，系统应当正确提取照片的时间和位置信息（如果存在）。

**Validates: Requirements 10.1**

### Property 21: 日记持久化

*For any* 日记对象，保存后重新读取应当得到相同的日记内容（包括文字、照片、视频）。

**Validates: Requirements 10.6**

### Property 22: 日记分享可见性

*For any* 已分享的日记，其他用户应当能够浏览该日记；取消分享后，其他用户不应当能够浏览该日记。

**Validates: Requirements 11.1, 11.4**

### Property 23: 评论持久化和排序

*For any* 日记的评论列表，评论应当按时间顺序排列，并且保存后重新读取应当得到相同的评论内容。

**Validates: Requirements 12.1, 12.3**

### Property 24: 日记查询性能

*For any* 按名称精确查询日记的请求，系统应当在100毫秒内返回结果。

**Validates: Requirements 12.2.4**

### Property 25: 全文检索正确性

*For any* 关键字列表，全文检索返回的所有日记应当包含所有指定的关键字。

**Validates: Requirements 12.3.2**

### Property 26: 全文检索性能

*For any* 全文检索请求，系统应当在500毫秒内返回结果。

**Validates: Requirements 12.3.5**

### Property 27: 无损压缩round trip

*For any* 有效的日记内容，压缩后解压缩应当产生完全相同的内容。

**Validates: Requirements 12.4.3**

### Property 28: 压缩率要求

*For any* 日记内容，压缩后的大小应当比原始大小减少至少30%。

**Validates: Requirements 12.4.4**

### Property 29: 压缩性能要求

*For any* 单篇日记，压缩或解压缩操作应当在1秒内完成。

**Validates: Requirements 12.4.5**

### Property 30: 评分范围验证

*For any* 用户提交的评分，系统应当只接受1到5星范围内的评分。

**Validates: Requirements 13.2**

### Property 31: 平均评分更新

*For any* 景区，当用户提交新评分后，景区的平均评分应当正确更新为所有评分的平均值。

**Validates: Requirements 13.4**

### Property 32: 数据导入导出round trip

*For any* 有效的景区数据对象，导入后导出再导入应当产生等效的数据对象。

**Validates: Requirements 14.4**

### Property 33: 数据导出完整性

*For any* 导出请求，导出的JSON文件应当包含所有景区、景点、设施和道路图数据。

**Validates: Requirements 15.2**

### Property 34: 数据导出性能

*For any* 包含200个景区的数据导出请求，系统应当在10秒内完成导出。

**Validates: Requirements 15.3**

### Property 35: 美食推荐Top-K正确性

*For any* 美食数据集和位置，系统返回的前10个美食应当是按照推荐分数（综合热度、评价和距离）排序后的前10个最高分美食。

**Validates: Requirements 16.3**

### Property 36: 美食查询性能

*For any* 美食模糊查询请求，系统应当在200毫秒内返回结果。

**Validates: Requirements 16.1.8**

### Property 37: 服务设施距离计算

*For any* 服务设施查询，返回的设施距离应当基于道路图的实际路径距离，而非直线距离。

**Validates: Requirements 9.2**

### Property 38: 服务设施排序正确性

*For any* 服务设施查询结果，设施应当按照到用户位置的实际距离从近到远排序。

**Validates: Requirements 9.3**


## Error Handling

### 错误分类

系统采用分层错误处理策略，将错误分为以下类别：

#### 1. 客户端错误（4xx）

**400 Bad Request**
- 无效的请求参数（如评分不在1-5范围内）
- 缺少必需参数
- 数据格式错误（如JSON解析失败）

**401 Unauthorized**
- 未提供认证令牌
- 认证令牌过期或无效

**403 Forbidden**
- 用户无权访问资源（如访问他人的私密日记）
- 用户无权执行操作（如删除他人的评论）

**404 Not Found**
- 请求的资源不存在（如景区ID、日记ID不存在）
- 路径规划中起点或终点不存在

**409 Conflict**
- 用户名或邮箱已存在
- 重复的收藏或评分操作

**422 Unprocessable Entity**
- 业务逻辑验证失败（如路径规划中起点和终点不连通）
- 数据导入格式验证失败

#### 2. 服务器错误（5xx）

**500 Internal Server Error**
- 未预期的系统错误
- 数据库连接失败
- 算法执行异常

**503 Service Unavailable**
- 系统过载（并发用户超过100）
- 依赖服务不可用（如AIGC服务）

**504 Gateway Timeout**
- 路径规划超时（超过5秒）
- 数据导出超时（超过10秒）

### 错误响应格式

所有错误响应使用统一的JSON格式：

```typescript
interface ErrorResponse {
  error: {
    code: string; // 错误代码，如 "INVALID_RATING"
    message: string; // 用户友好的错误消息
    details?: any; // 详细错误信息（可选）
    timestamp: string; // ISO 8601格式的时间戳
    requestId: string; // 请求ID，用于追踪
  }
}
```

### 错误处理策略

#### 1. 输入验证

所有API端点在处理请求前进行输入验证：
- 参数类型检查
- 参数范围检查（如评分1-5）
- 必需参数检查
- 数据格式验证（如JSON、日期格式）

#### 2. 业务逻辑验证

在执行业务逻辑前进行验证：
- 资源存在性检查
- 权限检查
- 业务规则验证（如路径连通性）

#### 3. 异常捕获和日志

所有异常都被捕获并记录：
- 使用try-catch包裹关键代码
- 记录错误堆栈和上下文信息
- 使用日志级别（ERROR、WARN、INFO）
- 敏感信息脱敏

#### 4. 降级策略

当系统负载过高或依赖服务不可用时：
- 推荐服务：返回缓存的热门推荐
- 路径规划：使用简化算法（如贪心算法）
- AIGC服务：返回错误提示，允许用户稍后重试
- 全文检索：降级为简单的关键字匹配

#### 5. 重试机制

对于临时性错误，实现自动重试：
- 数据库连接失败：最多重试3次，指数退避
- 外部服务调用：最多重试2次
- 网络超时：重试1次

#### 6. 事务管理

对于涉及多个数据操作的业务逻辑，使用数据库事务：
- 用户注册（创建用户 + 初始化兴趣）
- 日记分享（更新日记状态 + 更新统计）
- 评分提交（记录评分 + 更新平均分）

失败时自动回滚，保证数据一致性。


## Testing Strategy

### 测试方法

系统采用双重测试策略，结合单元测试和属性测试，确保全面的代码覆盖和正确性验证。

#### 单元测试（Unit Tests）

单元测试用于验证特定示例、边缘情况和错误条件：

**测试范围**：
- 数据结构的基本操作（插入、删除、查询）
- API端点的输入验证
- 错误处理逻辑
- 边缘情况（空输入、极大值、极小值）
- 集成点（数据库连接、外部服务调用）

**测试框架**：Jest

**示例测试用例**：
```typescript
describe('User Registration', () => {
  test('should create user with valid registration data', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'SecurePass123'
    };
    const user = await userService.register(userData);
    expect(user.id).toBeDefined();
    expect(user.username).toBe('testuser');
  });

  test('should reject registration with existing username', async () => {
    await expect(
      userService.register({ username: 'existing', email: 'new@example.com', password: 'pass' })
    ).rejects.toThrow('Username already exists');
  });

  test('should reject invalid email format', async () => {
    await expect(
      userService.register({ username: 'user', email: 'invalid-email', password: 'pass' })
    ).rejects.toThrow('Invalid email format');
  });
});
```

#### 属性测试（Property-Based Tests）

属性测试用于验证通用属性在所有输入下都成立：

**测试范围**：
- 所有Correctness Properties
- 算法正确性（排序、查找、路径规划）
- 数据持久化（round trip properties）
- 性能要求

**测试框架**：fast-check

**配置**：
- 每个属性测试运行最少100次迭代
- 使用随机生成器生成测试数据
- 每个测试标注对应的设计文档属性

**示例测试用例**：
```typescript
import * as fc from 'fast-check';

describe('Property Tests', () => {
  // Feature: personalized-tourism-system, Property 6: 排行榜Top-K正确性
  test('ranking should return top 10 items by score', () => {
    fc.assert(
      fc.property(
        fc.array(scenicAreaArbitrary(), { minLength: 20, maxLength: 100 }),
        fc.constantFrom('popularity', 'rating', 'review'),
        async (scenicAreas, rankingType) => {
          // 插入测试数据
          await db.insertScenicAreas(scenicAreas);
          
          // 获取推荐
          const result = await recommendationEngine.getRanking(rankingType, 'user1', 0);
          
          // 验证返回10个结果
          expect(result.length).toBe(10);
          
          // 验证结果是前10个最高分
          const allScores = scenicAreas.map(sa => getScore(sa, rankingType)).sort((a, b) => b - a);
          const top10Scores = allScores.slice(0, 10);
          const resultScores = result.map(sa => getScore(sa, rankingType));
          
          expect(resultScores).toEqual(top10Scores);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: personalized-tourism-system, Property 27: 无损压缩round trip
  test('compression should be lossless', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 100, maxLength: 10000 }),
        async (content) => {
          const compressor = new LZ77Compressor();
          const compressed = compressor.compress(content);
          const decompressed = compressor.decompress(compressed);
          
          expect(decompressed).toBe(content);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: personalized-tourism-system, Property 13: 最短距离路径正确性
  test('shortest path should be optimal', () => {
    fc.assert(
      fc.property(
        roadGraphArbitrary(),
        fc.tuple(fc.string(), fc.string()),
        async (graph, [start, end]) => {
          // 确保起点和终点在图中
          if (!graph.hasNode(start) || !graph.hasNode(end)) return;
          
          const pathPlanner = new PathPlanner(graph);
          const result = await pathPlanner.findPath(start, end, 'shortest_distance', ['walk']);
          
          // 验证路径确实是最短的（通过暴力搜索所有路径）
          const allPaths = findAllPaths(graph, start, end);
          const shortestDistance = Math.min(...allPaths.map(p => p.distance));
          
          expect(result.totalDistance).toBe(shortestDistance);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// 自定义生成器
function scenicAreaArbitrary() {
  return fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 5, maxLength: 50 }),
    category: fc.constantFrom('自然风光', '历史文化', '主题公园', '校园'),
    popularity: fc.integer({ min: 0, max: 100000 }),
    averageRating: fc.float({ min: 1, max: 5 }),
    reviewCount: fc.integer({ min: 0, max: 10000 })
  });
}

function roadGraphArbitrary() {
  return fc.record({
    nodes: fc.array(fc.record({
      id: fc.uuid(),
      type: fc.constantFrom('attraction', 'facility', 'junction'),
      name: fc.string()
    }), { minLength: 10, maxLength: 50 }),
    edges: fc.array(fc.record({
      from: fc.string(),
      to: fc.string(),
      distance: fc.float({ min: 10, max: 1000 }),
      congestionFactor: fc.float({ min: 0.5, max: 1.0 })
    }), { minLength: 200, maxLength: 500 })
  });
}
```


### 测试覆盖目标

- 代码覆盖率：>80%
- 分支覆盖率：>75%
- 所有Correctness Properties都有对应的属性测试
- 所有API端点都有单元测试
- 所有错误处理路径都有测试

### 性能测试

使用专门的性能测试验证系统满足性能要求：

```typescript
describe('Performance Tests', () => {
  test('recommendation should respond within 300ms', async () => {
    const startTime = Date.now();
    await recommendationEngine.getRanking('personalized', 'user1', 0);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(300);
  });

  test('path planning should respond within 300ms', async () => {
    const startTime = Date.now();
    await pathPlanner.findPath('node1', 'node2', 'shortest_distance', ['walk']);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(300);
  });

  test('multi-point path with >10 points should complete within 5s', async () => {
    const points = generateRandomPoints(15);
    const startTime = Date.now();
    await pathPlanner.optimizeMultiPointPath(points, 'shortest_distance');
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(5000);
  });

  test('system should handle 100 concurrent users', async () => {
    const requests = Array(100).fill(null).map(() => 
      recommendationEngine.getRanking('popularity', `user${Math.random()}`, 0)
    );
    
    const startTime = Date.now();
    await Promise.all(requests);
    const duration = Date.now() - startTime;
    
    // 所有请求应在合理时间内完成
    expect(duration).toBeLessThan(5000);
  });
});
```

### 集成测试

验证各模块之间的集成：

```typescript
describe('Integration Tests', () => {
  test('end-to-end user journey', async () => {
    // 1. 用户注册
    const user = await userService.register({
      username: 'traveler',
      email: 'traveler@example.com',
      password: 'pass123'
    });

    // 2. 设置兴趣
    await userService.updateInterests(user.id, ['foodie', 'photographer']);

    // 3. 获取个性化推荐
    const recommendations = await recommendationEngine.getRanking('personalized', user.id, 0);
    expect(recommendations.length).toBe(10);

    // 4. 查看景区详情
    const scenicArea = await scenicAreaService.getById(recommendations[0].id);
    expect(scenicArea).toBeDefined();

    // 5. 规划路线
    const path = await pathPlanner.findPath(
      scenicArea.attractions[0].id,
      scenicArea.attractions[1].id,
      'shortest_time',
      ['walk']
    );
    expect(path.path.length).toBeGreaterThan(0);

    // 6. 创建日记
    const diary = await diaryManager.saveDiary({
      userId: user.id,
      title: 'My Trip',
      content: 'Great experience!',
      destination: scenicArea.name,
      visitDate: new Date()
    });
    expect(diary).toBeDefined();

    // 7. 分享日记
    await diaryManager.shareDiary(diary);
    const sharedDiary = await diaryService.getById(diary);
    expect(sharedDiary.isShared).toBe(true);
  });
});
```

### 算法性能比较测试

验证不同算法实现的性能差异：

```typescript
describe('Algorithm Performance Comparison', () => {
  test('compare sorting algorithms for Top-K', async () => {
    const data = generateRandomScenicAreas(1000);
    
    // 方案A：最小堆
    const heapStart = Date.now();
    const heapResult = await topKWithMinHeap(data, 10);
    const heapDuration = Date.now() - heapStart;
    
    // 方案B：快速选择
    const quickSelectStart = Date.now();
    const quickSelectResult = await topKWithQuickSelect(data, 10);
    const quickSelectDuration = Date.now() - quickSelectStart;
    
    console.log(`MinHeap: ${heapDuration}ms, QuickSelect: ${quickSelectDuration}ms`);
    
    // 验证两种算法结果一致
    expect(heapResult).toEqual(quickSelectResult);
  });

  test('compare path finding algorithms', async () => {
    const graph = generateLargeGraph(1000, 5000);
    
    // 方案A：Dijkstra
    const dijkstraStart = Date.now();
    const dijkstraPath = await dijkstraAlgorithm(graph, 'start', 'end');
    const dijkstraDuration = Date.now() - dijkstraStart;
    
    // 方案B：A*
    const aStarStart = Date.now();
    const aStarPath = await aStarAlgorithm(graph, 'start', 'end');
    const aStarDuration = Date.now() - aStarStart;
    
    console.log(`Dijkstra: ${dijkstraDuration}ms, A*: ${aStarDuration}ms`);
    
    // 验证路径长度相同（都是最优解）
    expect(dijkstraPath.totalDistance).toBe(aStarPath.totalDistance);
  });
});
```

### 测试数据管理

- 使用测试数据库，与生产数据库隔离
- 每个测试前重置数据库状态
- 使用工厂模式生成测试数据
- 使用fixtures管理常用测试数据

### 持续集成

- 所有测试在CI/CD流程中自动运行
- 代码提交前必须通过所有测试
- 性能测试结果记录和监控
- 测试失败时阻止部署


## 特色功能实现设计

### 1. 多维度排行榜实现

**实现方案**：
- 使用最小堆（MinHeap）实现Top-K推荐，无需完全排序
- 维护大小为10的最小堆，遍历所有数据
- 对于每个景区，计算推荐分数并与堆顶比较
- 如果分数大于堆顶，替换堆顶并调整堆

**推荐分数计算**：
```typescript
function calculateRecommendationScore(
  scenicArea: ScenicArea,
  rankingType: RankingType,
  userInterests?: InterestWeights
): number {
  switch (rankingType) {
    case 'popularity':
      return scenicArea.popularity;
    
    case 'rating':
      return scenicArea.averageRating;
    
    case 'review':
      // 综合评价数量和质量
      return scenicArea.averageRating * Math.log(scenicArea.reviewCount + 1);
    
    case 'personalized':
      // 综合多个因素
      let score = 0;
      score += scenicArea.popularity * 0.3;
      score += scenicArea.averageRating * 20 * 0.3;
      score += scenicArea.reviewCount * 0.2;
      
      // 加入用户兴趣权重
      if (userInterests) {
        const interestScore = calculateInterestMatch(scenicArea, userInterests);
        score += interestScore * 0.2;
      }
      
      return score;
  }
}

function calculateInterestMatch(
  scenicArea: ScenicArea,
  userInterests: InterestWeights
): number {
  let score = 0;
  
  // 根据景区标签和用户兴趣计算匹配度
  if (scenicArea.tags.includes('美食') && userInterests.foodie > 0) {
    score += userInterests.foodie * 100;
  }
  if (scenicArea.tags.includes('摄影') && userInterests.photographer > 0) {
    score += userInterests.photographer * 100;
  }
  // ... 其他兴趣类型
  
  return score;
}
```

### 2. 增量推荐系统实现

**实现方案**：
- 在用户对象中维护已展示项集合（Set<string>）
- 每次推荐时过滤已展示的项
- 当已展示数量超过100时，清空集合重新开始
- 使用Redis缓存已展示项，支持分布式部署

**代码示例**：
```typescript
async function getIncrementalRecommendation(
  userId: string,
  rankingType: RankingType,
  offset: number
): Promise<ScenicArea[]> {
  // 获取已展示项
  const viewedItems = await redis.smembers(`user:${userId}:viewed`);
  
  // 如果超过100个，重置
  if (viewedItems.length >= 100) {
    await redis.del(`user:${userId}:viewed`);
    viewedItems.length = 0;
  }
  
  // 获取所有候选项
  const allItems = await scenicAreaRepository.findAll();
  
  // 过滤已展示项
  const candidates = allItems.filter(item => !viewedItems.includes(item.id));
  
  // 计算推荐分数并获取Top-10
  const recommendations = getTopK(candidates, 10, rankingType, userId);
  
  // 标记为已展示
  const newViewedIds = recommendations.map(r => r.id);
  await redis.sadd(`user:${userId}:viewed`, ...newViewedIds);
  
  return recommendations;
}
```

### 3. 用户行为学习机制

**实现方案**：
- 记录所有用户行为（浏览、收藏、评分、不感兴趣）
- 每周运行批处理任务，分析用户行为并更新兴趣权重
- 使用加权平均算法，近期行为权重更高

**权重更新算法**：
```typescript
async function updateInterestWeights(userId: string): Promise<void> {
  const behaviors = await userBehaviorRepository.findByUserId(userId);
  
  // 初始化权重（基于用户选择的兴趣）
  const weights = await getUserInitialWeights(userId);
  
  // 分析行为
  const categoryScores = new Map<string, number>();
  
  for (const behavior of behaviors) {
    const item = await getItemById(behavior.targetId, behavior.targetType);
    const categories = extractCategories(item);
    
    // 根据行为类型计算分数
    let score = 0;
    switch (behavior.type) {
      case 'browse':
        score = behavior.duration / 60; // 浏览时长（分钟）
        break;
      case 'favorite':
        score = 10;
        break;
      case 'rate':
        score = behavior.rating * 2;
        break;
      case 'dislike':
        score = -5;
        break;
    }
    
    // 时间衰减（近期行为权重更高）
    const daysSince = (Date.now() - behavior.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const timeWeight = Math.exp(-daysSince / 30); // 30天半衰期
    score *= timeWeight;
    
    // 累加到类别分数
    for (const category of categories) {
      categoryScores.set(category, (categoryScores.get(category) || 0) + score);
    }
  }
  
  // 归一化权重
  const totalScore = Array.from(categoryScores.values()).reduce((a, b) => a + b, 0);
  for (const [category, score] of categoryScores) {
    weights[category] = score / totalScore;
  }
  
  // 保存更新后的权重
  await userRepository.updateInterestWeights(userId, weights);
}
```

### 4. 摄影打卡功能实现

**实现方案**：
- 为每个景点维护拍照位置列表
- 基于光线条件和人流量计算最佳拍照时间
- 使用照片点赞数和浏览量计算热门照片排名

**最佳拍照时间计算**：
```typescript
function calculateBestPhotoTime(
  photoSpot: PhotoSpot,
  attraction: Attraction
): string {
  // 考虑光线条件
  const lightingScore = {
    '06:00-08:00': 0.9, // 晨光
    '08:00-10:00': 0.8,
    '10:00-14:00': 0.5, // 正午光线过强
    '14:00-16:00': 0.7,
    '16:00-18:00': 0.9, // 黄昏
    '18:00-20:00': 0.6
  };
  
  // 考虑人流量（拥挤度）
  const congestionScore = 1 - attraction.congestionFactor;
  
  // 综合评分
  let bestTime = '';
  let bestScore = 0;
  
  for (const [timeRange, lightScore] of Object.entries(lightingScore)) {
    const score = lightScore * 0.6 + congestionScore * 0.4;
    if (score > bestScore) {
      bestScore = score;
      bestTime = timeRange;
    }
  }
  
  return bestTime;
}
```

### 5. 美食爱好者专属功能实现

**美食地图**：
- 在地图上标注所有美食位置
- 使用不同颜色区分饭店、窗口和摊位
- 点击标注显示美食详情和评价

**美食路线规划**：
```typescript
async function planFoodRoute(
  scenicAreaId: string,
  userId: string
): Promise<PathResult> {
  // 获取景区内所有美食点
  const foodFacilities = await facilityRepository.findByCategory(
    scenicAreaId,
    FacilityCategory.RESTAURANT
  );
  
  // 根据用户偏好和评分筛选
  const userPreferences = await getUserFoodPreferences(userId);
  const selectedFoods = selectTopFoods(foodFacilities, userPreferences, 5);
  
  // 规划访问路线（多点路径优化）
  const foodLocations = selectedFoods.map(f => f.location);
  const route = await pathPlanner.optimizeMultiPointPath(
    foodLocations,
    'shortest_distance'
  );
  
  return route;
}
```

**美食组合推荐**：
```typescript
function recommendFoodCombination(
  selectedFood: Food,
  allFoods: Food[]
): Food[] {
  const recommendations: Food[] = [];
  
  // 基于菜系搭配
  const complementaryCuisines = getCuisineComplements(selectedFood.cuisine);
  
  // 基于口味平衡
  const selectedTags = selectedFood.tags;
  
  for (const food of allFoods) {
    if (food.id === selectedFood.id) continue;
    
    let score = 0;
    
    // 菜系搭配分数
    if (complementaryCuisines.includes(food.cuisine)) {
      score += 0.5;
    }
    
    // 口味平衡分数（避免重复口味）
    const commonTags = food.tags.filter(t => selectedTags.includes(t));
    score += (1 - commonTags.length / food.tags.length) * 0.3;
    
    // 评分分数
    score += food.averageRating / 5 * 0.2;
    
    recommendations.push({ ...food, score });
  }
  
  // 返回前3个推荐
  return recommendations.sort((a, b) => b.score - a.score).slice(0, 3);
}
```

### 6. 智能时间规划实现

**一日游计划生成**：
```typescript
async function generateDayPlan(
  userId: string,
  scenicAreaId: string,
  intensity: 'low' | 'medium' | 'high'
): Promise<DayPlan> {
  const user = await userRepository.findById(userId);
  const scenicArea = await scenicAreaRepository.findById(scenicAreaId);
  
  // 根据用户兴趣选择景点
  const attractions = selectAttractionsByInterest(
    scenicArea.attractions,
    user.interestWeights
  );
  
  // 根据强度确定景点数量和休息时间
  const config = {
    low: { attractionCount: 4, restDuration: 30, mealDuration: 60 },
    medium: { attractionCount: 6, restDuration: 20, mealDuration: 45 },
    high: { attractionCount: 8, restDuration: 10, mealDuration: 30 }
  }[intensity];
  
  // 选择景点
  const selectedAttractions = attractions.slice(0, config.attractionCount);
  
  // 优化访问顺序
  const order = await optimizeVisitOrder(selectedAttractions);
  
  // 生成时间表
  const schedule: PlannedAttraction[] = [];
  let currentTime = new Date();
  currentTime.setHours(9, 0, 0, 0); // 从早上9点开始
  
  for (let i = 0; i < order.length; i++) {
    const attraction = order[i];
    
    schedule.push({
      attractionId: attraction.id,
      arrivalTime: new Date(currentTime),
      stayDuration: attraction.estimatedVisitDuration,
      isMustVisit: false
    });
    
    // 更新当前时间
    currentTime = new Date(currentTime.getTime() + attraction.estimatedVisitDuration * 60000);
    
    // 添加休息时间
    if (i < order.length - 1) {
      currentTime = new Date(currentTime.getTime() + config.restDuration * 60000);
    }
    
    // 添加用餐时间（中午12点和下午6点）
    const hour = currentTime.getHours();
    if (hour >= 12 && hour < 13) {
      currentTime.setHours(13, 0, 0, 0);
    } else if (hour >= 18 && hour < 19) {
      currentTime.setHours(19, 0, 0, 0);
    }
  }
  
  return {
    id: generateId(),
    attractions: schedule,
    meals: generateMealPlan(config.mealDuration),
    totalDistance: calculateTotalDistance(order),
    totalTime: (currentTime.getTime() - schedule[0].arrivalTime.getTime()) / 60000
  };
}
```

**动态行程调整**：
```typescript
async function adjustPlan(
  planId: string,
  currentLocation: string,
  currentTime: Date
): Promise<DayPlan> {
  const plan = await dayPlanRepository.findById(planId);
  
  // 找到当前应该在的景点
  const currentIndex = plan.attractions.findIndex(
    a => a.arrivalTime <= currentTime && 
         new Date(a.arrivalTime.getTime() + a.stayDuration * 60000) > currentTime
  );
  
  // 计算延迟时间
  const expectedTime = plan.attractions[currentIndex].arrivalTime;
  const delay = (currentTime.getTime() - expectedTime.getTime()) / 60000;
  
  // 如果延迟超过30分钟，调整后续行程
  if (delay > 30) {
    const remainingAttractions = plan.attractions.slice(currentIndex + 1);
    
    // 移除非必去景点
    const adjustedAttractions = remainingAttractions.filter(a => a.isMustVisit);
    
    // 重新计算时间
    let newTime = new Date(currentTime);
    for (const attraction of adjustedAttractions) {
      attraction.arrivalTime = new Date(newTime);
      newTime = new Date(newTime.getTime() + attraction.stayDuration * 60000);
    }
    
    plan.attractions = [
      ...plan.attractions.slice(0, currentIndex + 1),
      ...adjustedAttractions
    ];
  }
  
  return plan;
}
```

### 7. 社交互动和成就系统实现

**实时热点计算**：
```typescript
async function calculateTrending(): Promise<{ attractions: Attraction[], topics: string[] }> {
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  
  // 统计最近1小时的浏览量和签到数
  const recentViews = await analyticsRepository.getViewsSince(oneHourAgo);
  const recentCheckIns = await checkInRepository.findSince(oneHourAgo);
  
  // 计算热度分数
  const attractionScores = new Map<string, number>();
  
  for (const view of recentViews) {
    attractionScores.set(
      view.attractionId,
      (attractionScores.get(view.attractionId) || 0) + 1
    );
  }
  
  for (const checkIn of recentCheckIns) {
    attractionScores.set(
      checkIn.attractionId,
      (attractionScores.get(checkIn.attractionId) || 0) + 5 // 签到权重更高
    );
  }
  
  // 获取前10个热门景点
  const topAttractions = Array.from(attractionScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);
  
  const attractions = await attractionRepository.findByIds(topAttractions);
  
  // 提取热门话题（从签到文字中）
  const topics = extractTopics(recentCheckIns);
  
  return { attractions, topics };
}
```

**成就系统**：
```typescript
async function checkAndAwardAchievements(userId: string): Promise<Achievement[]> {
  const newAchievements: Achievement[] = [];
  
  // 检查美食达人成就
  const foodCount = await countUserFoodTasted(userId);
  if (foodCount >= 10 && !await hasAchievement(userId, 'foodie_master')) {
    newAchievements.push(await awardAchievement(userId, 'foodie_master'));
  }
  
  // 检查摄影大师成就
  const photoCount = await countUserPhotosShared(userId);
  if (photoCount >= 20 && !await hasAchievement(userId, 'photography_master')) {
    newAchievements.push(await awardAchievement(userId, 'photography_master'));
  }
  
  // 检查探索先锋成就
  const visitedAreas = await countVisitedScenicAreas(userId);
  if (visitedAreas >= 10 && !await hasAchievement(userId, 'exploration_pioneer')) {
    newAchievements.push(await awardAchievement(userId, 'exploration_pioneer'));
  }
  
  // 检查社交达人成就
  const socialScore = await calculateSocialScore(userId);
  if (socialScore >= 100 && !await hasAchievement(userId, 'social_master')) {
    newAchievements.push(await awardAchievement(userId, 'social_master'));
  }
  
  return newAchievements;
}
```

### 8. 室内导航实现

**室内路径规划**：
```typescript
async function findIndoorPath(
  buildingId: string,
  start: IndoorLocation,
  end: IndoorLocation
): Promise<IndoorPathResult> {
  const building = await buildingRepository.findById(buildingId);
  const indoorStructure = building.indoorStructure;
  
  // 如果在同一楼层，使用A*算法规划平面路径
  if (start.floor === end.floor) {
    const floor = indoorStructure.floors.find(f => f.number === start.floor);
    const path = await findFloorPath(floor, start, end);
    return {
      instructions: generateInstructions(path),
      distance: calculateDistance(path),
      estimatedTime: calculateTime(path)
    };
  }
  
  // 如果在不同楼层，需要使用电梯
  // 1. 从起点到最近的电梯
  const nearestElevator = findNearestElevator(indoorStructure, start);
  const pathToElevator = await findFloorPath(
    indoorStructure.floors.find(f => f.number === start.floor),
    start,
    { floor: start.floor, x: nearestElevator.location.x, y: nearestElevator.location.y }
  );
  
  // 2. 乘坐电梯
  const elevatorTime = nearestElevator.averageWaitTime + 
                       Math.abs(end.floor - start.floor) * 3; // 每层3秒
  
  // 3. 从电梯到终点
  const pathFromElevator = await findFloorPath(
    indoorStructure.floors.find(f => f.number === end.floor),
    { floor: end.floor, x: nearestElevator.location.x, y: nearestElevator.location.y },
    end
  );
  
  return {
    instructions: [
      ...generateInstructions(pathToElevator),
      `乘坐电梯到${end.floor}楼`,
      ...generateInstructions(pathFromElevator)
    ],
    distance: calculateDistance(pathToElevator) + calculateDistance(pathFromElevator),
    estimatedTime: calculateTime(pathToElevator) + elevatorTime + calculateTime(pathFromElevator)
  };
}
```

### 9. AIGC动画生成实现

**集成第三方AIGC服务**：
```typescript
async function generateAnimation(
  photos: Photo[],
  description: string
): Promise<string> {
  // 准备输入数据
  const imageUrls = photos.map(p => p.url);
  
  // 调用AIGC服务API
  const response = await fetch('https://aigc-service.example.com/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.AIGC_API_KEY}`
    },
    body: JSON.stringify({
      images: imageUrls,
      prompt: description,
      style: 'travel',
      duration: 60, // 1分钟
      transitions: 'smooth'
    })
  });
  
  if (!response.ok) {
    throw new Error('AIGC service failed');
  }
  
  const result = await response.json();
  
  // 轮询检查生成状态
  let animationUrl = '';
  let attempts = 0;
  while (attempts < 30) { // 最多等待30秒
    const statusResponse = await fetch(
      `https://aigc-service.example.com/api/status/${result.taskId}`
    );
    const status = await statusResponse.json();
    
    if (status.state === 'completed') {
      animationUrl = status.videoUrl;
      break;
    } else if (status.state === 'failed') {
      throw new Error('Animation generation failed');
    }
    
    await sleep(1000);
    attempts++;
  }
  
  if (!animationUrl) {
    throw new Error('Animation generation timeout');
  }
  
  // 下载并存储到本地
  const localUrl = await downloadAndStore(animationUrl);
  
  return localUrl;
}
```


## 性能优化设计

### 1. 算法性能优化策略

#### 推荐算法优化

**问题**：遍历所有景区计算推荐分数，数据量大时性能差

**优化方案**：
- 使用最小堆（MinHeap）实现Top-K，时间复杂度从O(n log n)降至O(n log k)
- 预计算部分分数（如热度、评分），存储在数据库索引中
- 对于个性化推荐，使用用户兴趣向量和景区特征向量的点积快速计算匹配度

```typescript
// 优化前：完全排序
const sorted = allItems.sort((a, b) => b.score - a.score);
return sorted.slice(0, 10); // O(n log n)

// 优化后：最小堆
const heap = new MinHeap<RecommendationItem>(10);
for (const item of allItems) {
  heap.insert({ id: item.id, score: calculateScore(item) });
} // O(n log k)
return heap.getTopK();
```

#### 路径规划算法优化

**问题**：Dijkstra算法在大规模图上性能不佳

**优化方案**：
- 使用优先队列（最小堆）优化Dijkstra，时间复杂度O((V+E) log V)
- 对于A*算法，使用欧氏距离作为启发函数
- 预计算常用路径并缓存
- 使用双向搜索加速

```typescript
// 优化的Dijkstra实现
function dijkstra(graph: RoadGraph, start: string, end: string): PathResult {
  const distances = new Map<string, number>();
  const previous = new Map<string, string>();
  const pq = new MinPriorityQueue<{ nodeId: string; distance: number }>();
  
  distances.set(start, 0);
  pq.enqueue({ nodeId: start, distance: 0 });
  
  while (!pq.isEmpty()) {
    const { nodeId, distance } = pq.dequeue();
    
    // 提前终止：找到目标节点
    if (nodeId === end) break;
    
    // 跳过已处理的节点
    if (distance > (distances.get(nodeId) || Infinity)) continue;
    
    // 遍历邻接边
    for (const edge of graph.getAdjacentEdges(nodeId)) {
      const newDistance = distance + edge.distance;
      
      if (newDistance < (distances.get(edge.to) || Infinity)) {
        distances.set(edge.to, newDistance);
        previous.set(edge.to, nodeId);
        pq.enqueue({ nodeId: edge.to, distance: newDistance });
      }
    }
  }
  
  return reconstructPath(previous, start, end);
}
```

#### 查找算法优化

**问题**：全表扫描查询性能差

**优化方案**：
- 使用Trie树实现O(m)时间复杂度的前缀查询
- 使用倒排索引实现O(k)时间复杂度的全文检索
- 使用哈希表实现O(1)时间复杂度的精确查询
- 数据库层面使用B-tree索引和全文索引

#### 多点路径优化算法

**问题**：TSP问题是NP-hard，精确解时间复杂度指数级

**优化方案**：
- 对于<=10个景点，使用动态规划求精确解
- 对于>10个景点，使用贪心算法求近似解
- 使用2-opt局部搜索改进贪心解
- 设置5秒超时限制

```typescript
function optimizeMultiPointPath(points: string[]): PathResult {
  if (points.length <= 10) {
    // 使用DP求精确解
    return tspDynamicProgramming(points);
  } else {
    // 使用贪心+2-opt求近似解
    let route = greedyTSP(points);
    route = twoOptImprovement(route, 5000); // 5秒超时
    return route;
  }
}
```

### 2. 缓存策略

#### 多层缓存架构

**L1缓存：内存缓存（应用层）**
- 使用LRU缓存热点数据
- 缓存大小：100MB
- 缓存内容：热门景区、推荐结果、路径规划结果
- TTL：5分钟

**L2缓存：Redis（分布式缓存）**
- 缓存用户会话、已展示项、实时热点
- TTL：1小时
- 使用Redis的Set、Hash、Sorted Set数据结构

**L3缓存：数据库查询缓存**
- PostgreSQL查询结果缓存
- 使用物化视图缓存复杂查询结果

#### 缓存更新策略

**写穿（Write-Through）**：
- 用于用户数据（兴趣、行为）
- 同时更新缓存和数据库

**写回（Write-Back）**：
- 用于统计数据（浏览量、热度）
- 先更新缓存，异步批量写入数据库

**缓存失效**：
- 使用TTL自动过期
- 数据更新时主动失效相关缓存
- 使用发布订阅模式通知所有节点失效缓存

```typescript
class CacheManager {
  private l1Cache: LRUCache;
  private redis: Redis;
  
  async get(key: string): Promise<any> {
    // L1缓存
    let value = this.l1Cache.get(key);
    if (value) return value;
    
    // L2缓存
    value = await this.redis.get(key);
    if (value) {
      this.l1Cache.set(key, value);
      return value;
    }
    
    // 数据库
    value = await this.database.query(key);
    if (value) {
      await this.redis.setex(key, 3600, value);
      this.l1Cache.set(key, value);
    }
    
    return value;
  }
  
  async invalidate(key: string): Promise<void> {
    this.l1Cache.delete(key);
    await this.redis.del(key);
    await this.pubsub.publish('cache:invalidate', key);
  }
}
```

### 3. 并发处理

#### 支持100个并发用户

**连接池**：
- 数据库连接池：最大50个连接
- Redis连接池：最大20个连接

**请求队列**：
- 使用消息队列（RabbitMQ）处理耗时任务
- 路径规划、AIGC生成等异步处理

**负载均衡**：
- 使用Nginx进行负载均衡
- 部署多个应用实例（至少3个）
- 使用健康检查自动剔除故障节点

**限流**：
- 使用令牌桶算法限制API调用频率
- 每个用户每秒最多10个请求
- 超过限制返回429 Too Many Requests

```typescript
class RateLimiter {
  private tokens: Map<string, { count: number; lastRefill: number }>;
  private maxTokens = 10;
  private refillRate = 10; // 每秒
  
  async checkLimit(userId: string): Promise<boolean> {
    const now = Date.now();
    let bucket = this.tokens.get(userId);
    
    if (!bucket) {
      bucket = { count: this.maxTokens, lastRefill: now };
      this.tokens.set(userId, bucket);
    }
    
    // 补充令牌
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.count = Math.min(
      this.maxTokens,
      bucket.count + elapsed * this.refillRate
    );
    bucket.lastRefill = now;
    
    // 消耗令牌
    if (bucket.count >= 1) {
      bucket.count -= 1;
      return true;
    }
    
    return false;
  }
}
```

#### 数据库优化

**索引优化**：
- 为所有外键创建索引
- 为排序字段创建降序索引
- 为全文搜索创建全文索引
- 定期分析和优化索引

**查询优化**：
- 使用EXPLAIN分析慢查询
- 避免N+1查询，使用JOIN或批量查询
- 使用分页减少数据传输量
- 使用SELECT指定字段，避免SELECT *

**连接优化**：
- 使用连接池复用连接
- 设置合理的超时时间
- 使用预编译语句防止SQL注入

**分区**：
- 对大表（如user_behaviors）按时间分区
- 每月一个分区，自动归档旧数据

### 4. 前端性能优化

**代码分割**：
- 使用React.lazy和Suspense按需加载组件
- 路由级别的代码分割

**资源优化**：
- 图片懒加载
- 使用WebP格式压缩图片
- 使用CDN加速静态资源

**渲染优化**：
- 使用React.memo避免不必要的重渲染
- 使用虚拟滚动处理长列表
- 使用Web Worker处理复杂计算

**网络优化**：
- 使用HTTP/2多路复用
- 启用Gzip压缩
- 使用Service Worker缓存资源

### 5. 监控和调优

**性能监控**：
- 使用Prometheus收集指标
- 监控API响应时间、错误率、吞吐量
- 监控数据库查询时间、连接数
- 监控缓存命中率

**日志分析**：
- 使用ELK Stack（Elasticsearch + Logstash + Kibana）
- 记录所有API请求和响应
- 记录慢查询和错误

**告警**：
- API响应时间超过1秒告警
- 错误率超过1%告警
- 数据库连接数超过80%告警
- 缓存命中率低于70%告警

**性能测试**：
- 使用JMeter进行压力测试
- 模拟100个并发用户
- 测试各API端点的性能
- 定期回归测试


## 图形界面设计

### 地图展示和路径可视化

#### 地图组件

使用Leaflet.js实现交互式地图：

**基础地图**：
- 使用OpenStreetMap作为底图
- 支持缩放、平移、旋转
- 响应式设计，适配移动端

**图层管理**：
```typescript
interface MapLayers {
  baseLayer: TileLayer; // 底图
  attractionLayer: MarkerClusterGroup; // 景点标记（聚合）
  facilityLayer: LayerGroup; // 服务设施标记
  pathLayer: Polyline; // 路径线
  heatmapLayer: HeatLayer; // 热力图（显示拥挤度）
}
```

**标记样式**：
- 景点：蓝色图标，大小根据热度调整
- 服务设施：不同颜色图标（餐厅红色、洗手间绿色等）
- 当前位置：脉冲动画的圆点
- 拍照位置：相机图标

**路径可视化**：
```typescript
function visualizePath(path: PathSegment[]): void {
  const coordinates = path.map(segment => [
    segment.from.latitude,
    segment.from.longitude
  ]);
  
  // 创建路径线
  const polyline = L.polyline(coordinates, {
    color: '#3388ff',
    weight: 5,
    opacity: 0.7,
    smoothFactor: 1
  });
  
  // 添加箭头指示方向
  const decorator = L.polylineDecorator(polyline, {
    patterns: [
      {
        offset: 25,
        repeat: 50,
        symbol: L.Symbol.arrowHead({
          pixelSize: 10,
          pathOptions: { fillOpacity: 1, weight: 0, color: '#3388ff' }
        })
      }
    ]
  });
  
  // 添加到地图
  map.addLayer(polyline);
  map.addLayer(decorator);
  
  // 自动调整视图以显示完整路径
  map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
}
```

**交互功能**：
- 点击景点显示详情弹窗
- 点击地图上任意点设置起点/终点
- 拖拽标记调整位置
- 长按地图添加途经点

#### 导航界面设计

**导航模式**：
```typescript
interface NavigationUI {
  topBar: {
    remainingDistance: string; // "还有1.2公里"
    remainingTime: string; // "预计15分钟"
    nextTurn: string; // "前方100米右转"
  };
  
  mapView: {
    currentLocation: Marker;
    destination: Marker;
    route: Polyline;
    compass: Control; // 指南针
  };
  
  bottomSheet: {
    instructions: string[]; // 分步导航指令
    alternativeRoutes: PathResult[]; // 备选路线
  };
}
```

**实时导航**：
- 使用Geolocation API获取用户位置
- 每5秒更新一次位置
- 自动旋转地图使前进方向朝上
- 偏离路线时自动重新规划

**语音导航**：
```typescript
function speakInstruction(instruction: string): void {
  const utterance = new SpeechSynthesisUtterance(instruction);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.9;
  speechSynthesis.speak(utterance);
}

// 导航指令示例
const instructions = [
  "导航开始，沿当前道路直行200米",
  "前方路口右转",
  "继续直行500米",
  "目的地在您的左侧"
];
```

**室内导航界面**：
- 显示建筑物平面图
- 高亮当前楼层
- 显示电梯和楼梯位置
- 使用不同颜色区分不同房间类型

```typescript
function renderIndoorMap(floor: Floor): void {
  const canvas = document.getElementById('indoor-canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  
  // 绘制楼层平面图
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, floor.layout.width, floor.layout.height);
  
  // 绘制墙壁
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  for (const wall of floor.layout.walls) {
    ctx.beginPath();
    ctx.moveTo(wall.start.x, wall.start.y);
    ctx.lineTo(wall.end.x, wall.end.y);
    ctx.stroke();
  }
  
  // 绘制走廊
  ctx.fillStyle = '#fff';
  for (const corridor of floor.layout.corridors) {
    ctx.beginPath();
    ctx.moveTo(corridor.points[0].x, corridor.points[0].y);
    for (let i = 1; i < corridor.points.length; i++) {
      ctx.lineTo(corridor.points[i].x, corridor.points[i].y);
    }
    ctx.lineWidth = corridor.width;
    ctx.stroke();
  }
  
  // 绘制房间
  for (const room of floor.rooms) {
    ctx.fillStyle = getRoomColor(room.type);
    ctx.fillRect(room.location.x - 10, room.location.y - 10, 20, 20);
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.fillText(room.number, room.location.x - 5, room.location.y + 5);
  }
  
  // 绘制导航路径
  if (currentPath) {
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(currentPath[0].x, currentPath[0].y);
    for (let i = 1; i < currentPath.length; i++) {
      ctx.lineTo(currentPath[i].x, currentPath[i].y);
    }
    ctx.stroke();
  }
}
```

### 用户界面布局

**主页**：
- 顶部：搜索框、用户头像
- 中部：推荐景区卡片（横向滚动）
- 底部：导航栏（首页、探索、日记、我的）

**景区详情页**：
- 顶部：景区大图轮播
- 信息区：名称、评分、热度、简介
- 标签页：景点列表、服务设施、美食推荐、用户评价
- 底部：路线规划按钮、收藏按钮

**路线规划页**：
- 顶部：起点、终点输入框
- 中部：地图视图
- 底部：路线详情（距离、时间、交通工具）
- 侧边栏：备选路线

**日记编辑页**：
- 顶部：标题输入
- 中部：富文本编辑器
- 照片墙：网格布局显示照片
- 底部：保存、分享按钮

**社交页面**：
- 顶部：实时热点标签
- 中部：日记流（瀑布流布局）
- 侧边栏：附近游客、队伍列表

### 响应式设计

**断点**：
- 移动端：<768px
- 平板：768px-1024px
- 桌面：>1024px

**适配策略**：
- 移动端：单列布局，底部导航
- 平板：双列布局，侧边导航
- 桌面：三列布局，顶部导航

**触摸优化**：
- 按钮最小尺寸44x44px
- 支持手势操作（滑动、捏合缩放）
- 使用触觉反馈

### 可访问性

**ARIA标签**：
- 为所有交互元素添加aria-label
- 使用语义化HTML标签
- 支持键盘导航

**对比度**：
- 文字与背景对比度至少4.5:1
- 重要按钮对比度至少7:1

**字体大小**：
- 基础字体16px
- 支持用户调整字体大小

## 总结

本设计文档详细描述了个性化旅游系统的技术架构、数据模型、核心算法、API接口和特色功能实现。系统基于自主设计的数据结构和算法，提供高性能的个性化推荐、多策略路线规划和智能导航功能。通过多层缓存、并发优化和性能监控，系统能够支持100个并发用户，满足毫秒级的响应时间要求。

系统的核心优势：
1. 自主设计的数据结构（最小堆、Trie树、倒排索引、LZ77压缩）
2. 高效的算法实现（Top-K推荐、Dijkstra路径规划、TSP优化）
3. 完善的测试策略（单元测试+属性测试）
4. 丰富的特色功能（摄影打卡、美食推荐、智能规划、社交互动）
5. 优秀的性能表现（300ms推荐响应、5s多点路径规划）

