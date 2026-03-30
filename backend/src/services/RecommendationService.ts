import { AppDataSource, In } from '../config/database';
import { ScenicArea } from '../entities/ScenicArea';
import { UserBehavior } from '../entities/UserBehavior';
import { User } from '../entities/User';
import { Food } from '../entities/Food';
import { Diary } from '../entities/Diary';
import cache from '../config/cache';
import { resolveScenicPresentation, ScenicPresentation } from '../utils/scenicPresentation';

// 获取仓库
function getScenicAreaRepository() {
  if (!AppDataSource) {
    throw new Error('Database not initialized');
  }
  return AppDataSource.getRepository(ScenicArea);
}

function getUserBehaviorRepository() {
  if (!AppDataSource) {
    throw new Error('Database not initialized');
  }
  return AppDataSource.getRepository(UserBehavior);
}

function getUserRepository() {
  if (!AppDataSource) {
    throw new Error('Database not initialized');
  }
  return AppDataSource.getRepository(User);
}

function getFoodRepository() {
  if (!AppDataSource) {
    throw new Error('Database not initialized');
  }
  return AppDataSource.getRepository(Food);
}

function getDiaryRepository() {
  if (!AppDataSource) {
    throw new Error('Database not initialized');
  }
  return AppDataSource.getRepository(Diary);
}

// 简单的最小堆实现
class MinHeap<T> {
  private heap: T[];
  private compare: (a: T, b: T) => number;
  private limit: number;

  constructor(limit: number, compare: (a: T, b: T) => number) {
    this.heap = [];
    this.limit = limit;
    this.compare = compare;
  }

  insert(item: T): void {
    if (this.heap.length < this.limit) {
      this.heap.push(item);
      this.bubbleUp(this.heap.length - 1);
    } else if (this.compare(item, this.heap[0]) > 0) {
      this.heap[0] = item;
      this.bubbleDown(0);
    }
  }

  extract(): T | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();

    const top = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);
    return top;
  }

  peek(): T | undefined {
    return this.heap[0];
  }

  size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  getTopK(): T[] {
    return [...this.heap].sort((a, b) => this.compare(b, a));
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.compare(this.heap[index], this.heap[parentIndex]) >= 0) break;
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    while (true) {
      let minIndex = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < this.heap.length && this.compare(this.heap[leftChild], this.heap[minIndex]) < 0) {
        minIndex = leftChild;
      }
      if (rightChild < this.heap.length && this.compare(this.heap[rightChild], this.heap[minIndex]) < 0) {
        minIndex = rightChild;
      }

      if (minIndex === index) break;
      [this.heap[index], this.heap[minIndex]] = [this.heap[minIndex], this.heap[index]];
      index = minIndex;
    }
  }
}

export class RecommendationService {
  private presentScenicArea<T extends ScenicArea>(area: T): T & ScenicPresentation {
    return {
      ...area,
      ...resolveScenicPresentation(area),
    };
  }

  private presentScenicAreas<T extends ScenicArea>(areas: T[]): Array<T & ScenicPresentation> {
    return areas.map((area) => this.presentScenicArea(area));
  }

  // 热度榜
  async getPopularityRanking(limit: number = 10): Promise<ScenicArea[]> {
    const cacheKey = `popularity_ranking_${limit}`;
    
    // 尝试从缓存获取
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      return this.presentScenicAreas(cachedResult as ScenicArea[]);
    }
    
    const scenicAreaRepository = getScenicAreaRepository();
    // 按照访问量排序
    const topAreas = await scenicAreaRepository.find({
      order: { popularity: 'DESC' },
      take: limit
    });
    
    // 缓存结果，设置10分钟过期
    const result = this.presentScenicAreas(topAreas);
    cache.set(cacheKey, result, 10 * 60 * 1000);
    
    return result;
  }

  // 评分榜
  async getRatingRanking(limit: number = 10): Promise<ScenicArea[]> {
    const cacheKey = `rating_ranking_${limit}`;
    
    // 尝试从缓存获取
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      return this.presentScenicAreas(cachedResult as ScenicArea[]);
    }
    
    const scenicAreaRepository = getScenicAreaRepository();
    // 按照评分排序
    const topAreas = await scenicAreaRepository.find({
      order: { averageRating: 'DESC' },
      take: limit
    });
    
    // 缓存结果，设置10分钟过期
    const result = this.presentScenicAreas(topAreas);
    cache.set(cacheKey, result, 10 * 60 * 1000);
    
    return result;
  }

  // 评价榜
  async getReviewRanking(limit: number = 10): Promise<ScenicArea[]> {
    const cacheKey = `review_ranking_${limit}`;
    
    // 尝试从缓存获取
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      return this.presentScenicAreas(cachedResult as ScenicArea[]);
    }
    
    const scenicAreaRepository = getScenicAreaRepository();
    // 按照评价数量排序
    const topAreas = await scenicAreaRepository.find({
      order: { reviewCount: 'DESC' },
      take: limit
    });
    
    // 缓存结果，设置10分钟过期
    const result = this.presentScenicAreas(topAreas);
    cache.set(cacheKey, result, 10 * 60 * 1000);
    
    return result;
  }

  // 个人兴趣榜
  async getPersonalizedRanking(userId: string, limit: number = 10): Promise<ScenicArea[]> {
    const userRepository = getUserRepository();
    const scenicAreaRepository = getScenicAreaRepository();
    
    // 获取用户信息
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // 获取所有景区
    const allScenicAreas = await scenicAreaRepository.find();

    // 使用最小堆进行Top-K推荐
    const minHeap = new MinHeap<{ score: number; area: ScenicArea }>(limit, (a, b) => a.score - b.score);

    // 构建推荐列表
    for (const area of allScenicAreas) {
      // 跳过用户已经收藏的景区
      if (user.favorites && user.favorites.includes(area.id)) {
        continue;
      }

      const score = this.calculatePersonalizedScore(area, user);
      minHeap.insert({ score, area });
    }

    // 从堆中提取结果
    const recommendations = minHeap.getTopK().map(item => item.area);
    
    return this.presentScenicAreas(recommendations);
  }

  // 基于用户行为的个性化推荐
  async getPersonalizedRecommendations(userId: string, limit: number = 10): Promise<ScenicArea[]> {
    const userRepository = getUserRepository();
    const userBehaviorRepository = getUserBehaviorRepository();
    const scenicAreaRepository = getScenicAreaRepository();
    // 获取用户信息
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // 获取用户行为数据
    const userBehaviors = await userBehaviorRepository.find({
      where: { userId },
      order: { timestamp: 'DESC' },
      take: 50
    });

    // 计算兴趣权重
    const interestScores = await this.calculateInterestScores(user, userBehaviors);

    // 获取所有景区
    const allScenicAreas = await scenicAreaRepository.find();

    // 使用最小堆进行Top-K推荐
    const minHeap = new MinHeap<{ score: number; area: ScenicArea }>(limit, (a, b) => a.score - b.score);

    // 构建推荐列表
    for (const area of allScenicAreas) {
      // 跳过用户已经收藏的景区
      if (user.favorites && user.favorites.includes(area.id)) {
        continue;
      }

      const score = this.calculateRecommendationScore(area, interestScores);
      minHeap.insert({ score, area });
    }

    // 从堆中提取结果
    const recommendations = minHeap.getTopK().map(item => item.area);
    
    return this.presentScenicAreas(recommendations);
  }

  // 增量推荐（基于最近行为）
  async getIncrementalRecommendations(userId: string, limit: number = 5): Promise<ScenicArea[]> {
    const userBehaviorRepository = getUserBehaviorRepository();
    const scenicAreaRepository = getScenicAreaRepository();
    // 获取用户最近的行为
    const recentBehaviors = await userBehaviorRepository.find({
      where: { userId, targetType: 'scenic_area' },
      order: { timestamp: 'DESC' },
      take: 10
    });

    if (recentBehaviors.length === 0) {
      // 如果没有行为数据，返回热门推荐
      return this.getTopAttractions(limit);
    }

    // 获取最近访问的景区
    const recentAreaIds = recentBehaviors.map(b => b.targetId);
    const recentAreas = await scenicAreaRepository.find({
      where: { id: In(recentAreaIds) }
    });

    // 提取最近访问的景区类型
    const recentCategories = new Set<string>();
    for (const area of recentAreas) {
      recentCategories.add(area.category);
    }

    // 基于最近类型推荐
    const recommendations = await scenicAreaRepository.find({
      where: {
        category: In(Array.from(recentCategories))
      },
      order: { rating: 'DESC' },
      take: limit * 2 // 获取更多结果以便过滤
    });

    // 过滤掉用户已经访问过的
    const viewedIds = new Set(recentAreaIds);
    const filteredRecommendations = recommendations.filter(area => !viewedIds.has(area.id));

    return this.presentScenicAreas(filteredRecommendations.slice(0, limit));
  }

  // 学习用户行为
  async learnUserBehavior(userId: string, behavior: {
    itemId: string;
    behaviorType: 'view' | 'favorite' | 'rate' | 'comment';
    category?: string;
    rating?: number;
  }): Promise<void> {
    const userBehaviorRepository = getUserBehaviorRepository();
    // 记录用户行为
    const userBehavior = userBehaviorRepository.create({
      userId,
      behaviorType: behavior.behaviorType,
      targetType: 'scenic_area',
      targetId: behavior.itemId,
      rating: behavior.rating,
      timestamp: new Date()
    });

    await userBehaviorRepository.save(userBehavior);

    // 更新用户兴趣权重
    await this.updateUserInterestWeights(userId);
  }

  // 计算兴趣权重
  private async calculateInterestScores(user: User, behaviors: UserBehavior[]): Promise<Record<string, number>> {
    const scenicAreaRepository = getScenicAreaRepository();
    const scores: Record<string, number> = {
      foodie: user.interestWeights?.foodie || 0,
      photographer: user.interestWeights?.photographer || 0,
      cultureEnthusiast: user.interestWeights?.cultureEnthusiast || 0,
      natureLover: user.interestWeights?.natureLover || 0,
      sportsEnthusiast: user.interestWeights?.sportsEnthusiast || 0,
      relaxationSeeker: user.interestWeights?.relaxationSeeker || 0,
      socialSharer: user.interestWeights?.socialSharer || 0
    };

    // 获取行为相关的景区信息
    const scenicAreaIds = behaviors
      .filter(b => b.targetType === 'scenic_area')
      .map(b => b.targetId);
    
    const scenicAreas = await scenicAreaRepository.find({
      where: { id: In(scenicAreaIds) }
    });
    
    const areaMap = new Map<string, ScenicArea>();
    for (const area of scenicAreas) {
      areaMap.set(area.id, area);
    }

    // 根据行为调整权重
    for (const behavior of behaviors) {
      if (behavior.targetType === 'scenic_area') {
        const area = areaMap.get(behavior.targetId);
        if (area) {
          switch (behavior.behaviorType) {
            case 'view':
              this.adjustInterestScores(scores, area.category, 0.1);
              break;
            case 'favorite':
              this.adjustInterestScores(scores, area.category, 0.5);
              break;
            case 'rate':
              if (behavior.rating && behavior.rating >= 4) {
                this.adjustInterestScores(scores, area.category, 0.8);
              }
              break;
            case 'comment':
              this.adjustInterestScores(scores, area.category, 0.3);
              break;
          }
        }
      }
    }

    return scores;
  }

  // 调整兴趣权重
  private adjustInterestScores(scores: Record<string, number>, category?: string, weight: number = 0.1): void {
    if (!category) return;

    // 根据分类调整对应兴趣权重
    const categoryToInterest: Record<string, string> = {
      '美食': 'foodie',
      '摄影': 'photographer',
      '文化': 'cultureEnthusiast',
      '自然': 'natureLover',
      '运动': 'sportsEnthusiast',
      '休闲': 'relaxationSeeker',
      '社交': 'socialSharer'
    };

    const interest = categoryToInterest[category];
    if (interest) {
      scores[interest] += weight;
    }
  }

  // 计算推荐分数
  private calculateRecommendationScore(area: ScenicArea, interestScores: Record<string, number>): number {
    let score = area.averageRating * 0.5; // 基础分数：评分占50%

    // 根据兴趣权重调整分数
    const categoryToInterest: Record<string, string> = {
      '美食': 'foodie',
      '摄影': 'photographer',
      '文化': 'cultureEnthusiast',
      '自然': 'natureLover',
      '运动': 'sportsEnthusiast',
      '休闲': 'relaxationSeeker',
      '社交': 'socialSharer'
    };

    const interest = categoryToInterest[area.category];
    if (interest) {
      score += (interestScores[interest] || 0) * 0.3; // 兴趣权重占30%
    }

    // 热门程度占20%
    score += (area.popularity || 0) / 10000 * 0.2;

    return score;
  }

  // 计算个人化推荐分数
  private calculatePersonalizedScore(area: ScenicArea, user: User): number {
    let score = 0;

    // 基础分数：评分 * 0.3
    score += (area.averageRating || 0) * 0.3;

    // 热门程度：访问量 * 0.2
    score += (area.popularity || 0) / 100000 * 0.2;

    // 评价数量：评论数 * 0.1
    score += (area.reviewCount || 0) / 100 * 0.1;

    // 兴趣匹配：根据用户兴趣权重调整
    if (user.interestWeights) {
      // 根据景区类别匹配兴趣
      const categoryWeights: Record<string, string> = {
        '校园': 'cultureEnthusiast',
        '景区': 'natureLover',
        '文化古迹': 'cultureEnthusiast',
        '自然风光': 'natureLover',
        '主题公园': 'socialSharer',
        '美食': 'foodie',
        '购物': 'socialSharer'
      };

      const interestKey = categoryWeights[area.category] || 'relaxationSeeker';
      score += (user.interestWeights[interestKey] || 0) * 0.4;
    }

    return score;
  }

  // 更新用户兴趣权重
  private async updateUserInterestWeights(userId: string): Promise<void> {
    const userRepository = getUserRepository();
    const userBehaviorRepository = getUserBehaviorRepository();
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const behaviors = await userBehaviorRepository.find({ where: { userId } });
    const interestScores = await this.calculateInterestScores(user, behaviors);

    user.interestWeights = interestScores;
    await userRepository.save(user);
  }

  // 探索模式推荐（推荐用户未尝试过的类型）
  async getExplorationRecommendation(userId: string, limit: number = 10): Promise<ScenicArea[]> {
    const userRepository = getUserRepository();
    const userBehaviorRepository = getUserBehaviorRepository();
    const scenicAreaRepository = getScenicAreaRepository();

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // 获取用户已访问的景区类型
    const userBehaviors = await userBehaviorRepository.find({ where: { userId, targetType: 'scenic_area' } });
    const visitedAreaIds = userBehaviors.map(b => b.targetId);
    const visitedAreas = await scenicAreaRepository.find({ where: { id: In(visitedAreaIds) } });
    const visitedCategories = new Set(visitedAreas.map(a => a.category));

    // 获取未访问过的类型的景区
    const allScenicAreas = await scenicAreaRepository.find();
    const unvisitedTypeAreas = allScenicAreas.filter(a => !visitedCategories.has(a.category));

    // 如果没有未访问的类型，返回随机推荐
    if (unvisitedTypeAreas.length === 0) {
      return this.getTopAttractions(limit);
    }

    // 使用最小堆进行Top-K推荐
    const minHeap = new MinHeap<{ score: number; area: ScenicArea }>(limit, (a, b) => a.score - b.score);

    for (const area of unvisitedTypeAreas) {
      const score = this.calculatePersonalizedScore(area, user);
      minHeap.insert({ score, area });
    }

    return this.presentScenicAreas(minHeap.getTopK().map(item => item.area));
  }

  // 惊喜推荐（推荐与用户兴趣不完全匹配但可能喜欢的内容）
  async getSurpriseRecommendation(userId: string, limit: number = 5): Promise<ScenicArea[]> {
    const userRepository = getUserRepository();
    const scenicAreaRepository = getScenicAreaRepository();

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // 获取所有景区
    const allScenicAreas = await scenicAreaRepository.find();

    // 计算每个景区的惊喜度分数（结合评分和与用户兴趣的差异）
    const minHeap = new MinHeap<{ score: number; area: ScenicArea }>(limit, (a, b) => a.score - b.score);

    for (const area of allScenicAreas) {
      // 基础分数：评分
      let score = area.rating * 0.7;
      
      // 惊喜度：与用户兴趣的差异
      if (user.interestWeights) {
        const categoryWeights: Record<string, string> = {
          '校园': 'cultureEnthusiast',
          '景区': 'natureLover',
          '文化古迹': 'cultureEnthusiast',
          '自然风光': 'natureLover',
          '主题公园': 'socialSharer',
          '美食': 'foodie',
          '购物': 'socialSharer'
        };

        const interestKey = categoryWeights[area.category] || 'relaxationSeeker';
        const interestScore = user.interestWeights[interestKey] || 0;
        
        // 兴趣分数越低，惊喜度越高
        score += (1 - Math.min(interestScore, 1)) * 0.3;
      }

      minHeap.insert({ score, area });
    }

    return this.presentScenicAreas(minHeap.getTopK().map(item => item.area));
  }

  // 时间感知推荐
  async getTimeAwareRecommendation(userId: string, limit: number = 10): Promise<ScenicArea[]> {
    const userRepository = getUserRepository();
    const scenicAreaRepository = getScenicAreaRepository();

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const now = new Date();
    const hour = now.getHours();
    const allScenicAreas = await scenicAreaRepository.find();

    // 根据时间调整推荐
    const minHeap = new MinHeap<{ score: number; area: ScenicArea }>(limit, (a, b) => a.score - b.score);

    for (const area of allScenicAreas) {
      let score = this.calculatePersonalizedScore(area, user);

      // 早上6-9点：推荐早餐店和晨景观赏点
      if (hour >= 6 && hour < 9) {
        if (area.category === '美食' || area.category === '自然风光') {
          score *= 1.2;
        }
      }
      // 傍晚17-19点：推荐观景台和日落观赏点
      else if (hour >= 17 && hour < 19) {
        if (area.category === '自然风光' || area.category === '景区') {
          score *= 1.2;
        }
      }

      minHeap.insert({ score, area });
    }

    return this.presentScenicAreas(minHeap.getTopK().map(item => item.area));
  }

  // 季节性推荐
  async getSeasonalRecommendation(userId: string, limit: number = 10): Promise<ScenicArea[]> {
    const userRepository = getUserRepository();
    const scenicAreaRepository = getScenicAreaRepository();

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const allScenicAreas = await scenicAreaRepository.find();

    // 根据季节调整推荐
    const minHeap = new MinHeap<{ score: number; area: ScenicArea }>(limit, (a, b) => a.score - b.score);

    for (const area of allScenicAreas) {
      let score = this.calculatePersonalizedScore(area, user);

      // 春季（3-5月）：推荐赏花景点
      if (month >= 3 && month <= 5) {
        if (area.category === '自然风光' || area.tags?.includes('赏花')) {
          score *= 1.2;
        }
      }
      // 秋季（9-11月）：推荐赏枫景点
      else if (month >= 9 && month <= 11) {
        if (area.category === '自然风光' || area.tags?.includes('赏枫')) {
          score *= 1.2;
        }
      }
      // 冬季（12-2月）：推荐温泉和室内景点
      else if ((month >= 12 && month <= 12) || (month >= 1 && month <= 2)) {
        if (area.category === '景区' || area.tags?.includes('温泉') || area.tags?.includes('室内')) {
          score *= 1.2;
        }
      }

      minHeap.insert({ score, area });
    }

    return this.presentScenicAreas(minHeap.getTopK().map(item => item.area));
  }

  // 美食推荐
  async getFoodRecommendation(locationId: string, userId?: string, cuisine?: string, limit: number = 10): Promise<Food[]> {
    const foodRepository = getFoodRepository();
    const userRepository = getUserRepository();

    // 构建查询
    const query: any = {};
    if (cuisine) {
      query.cuisine = cuisine;
    }

    // 获取美食数据
    const allFoods = await foodRepository.find({ where: query });

    // 如果有用户ID，考虑用户兴趣
    let user;
    if (userId) {
      user = await userRepository.findOne({ where: { id: userId } });
    }

    // 使用最小堆进行Top-K推荐
    const minHeap = new MinHeap<{ score: number; food: Food }>(limit, (a, b) => a.score - b.score);

    for (const food of allFoods) {
      let score = 0;

      // 基础分数：评分 * 0.5
      score += (food.averageRating || 0) * 0.5;

      // 热门程度：访问量 * 0.3
      score += (food.popularity || 0) / 1000 * 0.3;

      // 评价数量：评论数 * 0.2
      score += (food.reviewCount || 0) / 10 * 0.2;

      // 如果有用户，考虑用户兴趣
      if (user && user.interestWeights) {
        if (user.interestWeights.foodie > 0) {
          score *= (1 + user.interestWeights.foodie * 0.5);
        }
      }

      minHeap.insert({ score, food });
    }

    return minHeap.getTopK().map(item => item.food);
  }

  // 日记推荐
  async getDiaryRecommendation(userId: string, limit: number = 10): Promise<Diary[]> {
    const diaryRepository = getDiaryRepository();
    const userRepository = getUserRepository();

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // 获取分享的日记
    const sharedDiaries = await diaryRepository.find({ where: { isShared: true } });

    // 使用最小堆进行Top-K推荐
    const minHeap = new MinHeap<{ score: number; diary: Diary }>(limit, (a, b) => a.score - b.score);

    for (const diary of sharedDiaries) {
      let score = 0;

      // 基础分数：评分 * 0.4
      score += (diary.averageRating || 0) * 0.4;

      // 热门程度：访问量 * 0.3
      score += (diary.popularity || 0) / 100 * 0.3;

      // 评价数量：评论数 * 0.2
      score += (diary.reviewCount || 0) / 10 * 0.2;

      // 时间因素：越新的日记分数越高
      const daysSinceCreated = (new Date().getTime() - diary.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 1 - daysSinceCreated / 30) * 0.1;

      minHeap.insert({ score, diary });
    }

    return minHeap.getTopK().map(item => item.diary);
  }

  // 获取热门景点（作为备选推荐）
  private async getTopAttractions(limit: number = 10): Promise<ScenicArea[]> {
    const scenicAreaRepository = getScenicAreaRepository();
    const areas = await scenicAreaRepository.find({
      order: { averageRating: 'DESC' },
      take: limit
    });
    return this.presentScenicAreas(areas);
  }

  // 获取推荐解释
  async getRecommendationExplanation(userId: string, itemId: string): Promise<{ factors: Array<{ name: string; weight: number; explanation: string }>; totalScore: number }> {
    const userRepository = getUserRepository();
    const scenicAreaRepository = getScenicAreaRepository();

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const area = await scenicAreaRepository.findOne({ where: { id: itemId } });
    if (!area) {
      throw new Error('Scenic area not found');
    }

    const factors = [];
    let totalScore = 0;

    // 评分因素
    const ratingScore = (area.averageRating || 0) * 0.3;
    factors.push({
      name: '评分',
      weight: ratingScore,
      explanation: `该景区评分为 ${area.averageRating || 0} 分，占推荐权重的 30%`
    });
    totalScore += ratingScore;

    // 热度因素
    const popularityScore = (area.popularity || 0) / 100000 * 0.2;
    factors.push({
      name: '热度',
      weight: popularityScore,
      explanation: `该景区访问量为 ${area.popularity || 0}，占推荐权重的 20%`
    });
    totalScore += popularityScore;

    // 评价数量因素
    const reviewScore = (area.reviewCount || 0) / 100 * 0.1;
    factors.push({
      name: '评价数量',
      weight: reviewScore,
      explanation: `该景区有 ${area.reviewCount || 0} 条评价，占推荐权重的 10%`
    });
    totalScore += reviewScore;

    // 兴趣匹配因素
    if (user.interestWeights) {
      const categoryWeights: Record<string, string> = {
        '校园': 'cultureEnthusiast',
        '景区': 'natureLover',
        '文化古迹': 'cultureEnthusiast',
        '自然风光': 'natureLover',
        '主题公园': 'socialSharer',
        '美食': 'foodie',
        '购物': 'socialSharer'
      };

      const interestKey = categoryWeights[area.category] || 'relaxationSeeker';
      const interestScore = (user.interestWeights[interestKey] || 0) * 0.4;
      factors.push({
        name: '兴趣匹配',
        weight: interestScore,
        explanation: `根据您的兴趣偏好，该景区与您的${interestKey === 'foodie' ? '美食' : interestKey === 'photographer' ? '摄影' : interestKey === 'cultureEnthusiast' ? '历史文化' : interestKey === 'natureLover' ? '自然风光' : interestKey === 'sportsEnthusiast' ? '运动健身' : interestKey === 'relaxationSeeker' ? '休闲放松' : '社交分享'}兴趣匹配度高，占推荐权重的 40%`
      });
      totalScore += interestScore;
    }

    return {
      factors,
      totalScore
    };
  }
}
