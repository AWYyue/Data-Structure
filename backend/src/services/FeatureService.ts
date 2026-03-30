import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { ScenicArea } from '../entities/ScenicArea';
import { Attraction } from '../entities/Attraction';
import { Food } from '../entities/Food';
import { UserBehavior } from '../entities/UserBehavior';
import { Achievement } from '../entities/Achievement';
import { PhotoSpot } from '../entities/PhotoSpot';
import { PhotoCheckin } from '../entities/PhotoCheckin';
import { Not, In } from 'typeorm';

// 获取仓库
function getUserRepository() {
  if (!AppDataSource) {
    throw new Error('Database not initialized');
  }
  return AppDataSource.getRepository(User);
}

function getScenicAreaRepository() {
  if (!AppDataSource) {
    throw new Error('Database not initialized');
  }
  return AppDataSource.getRepository(ScenicArea);
}

function getAttractionRepository() {
  if (!AppDataSource) {
    throw new Error('Database not initialized');
  }
  return AppDataSource.getRepository(Attraction);
}

function getFoodRepository() {
  if (!AppDataSource) {
    throw new Error('Database not initialized');
  }
  return AppDataSource.getRepository(Food);
}

function getUserBehaviorRepository() {
  if (!AppDataSource) {
    throw new Error('Database not initialized');
  }
  return AppDataSource.getRepository(UserBehavior);
}

function getAchievementRepository() {
  if (!AppDataSource) {
    throw new Error('Database not initialized');
  }
  return AppDataSource.getRepository(Achievement);
}

function getPhotoSpotRepository() {
  if (!AppDataSource) {
    throw new Error('Database not initialized');
  }
  return AppDataSource.getRepository(PhotoSpot);
}

function getPhotoCheckinRepository() {
  if (!AppDataSource) {
    throw new Error('Database not initialized');
  }
  return AppDataSource.getRepository(PhotoCheckin);
}

export class FeatureService {
  // 摄影打卡
  async addPhotoCheckin(userId: string, data: {
    attractionId: string;
    photoUrl: string;
    location: { latitude: number; longitude: number };
    description?: string;
  }): Promise<{
    success: boolean;
    message: string;
    achievement?: Achievement;
  }> {
    const attractionRepository = getAttractionRepository();
    const userBehaviorRepository = getUserBehaviorRepository();
    const photoSpotRepository = getPhotoSpotRepository();
    const photoCheckinRepository = getPhotoCheckinRepository();
    // 检查景点是否存在
    const attraction = await attractionRepository.findOne({ where: { id: data.attractionId } });
    if (!attraction) {
      return {
        success: false,
        message: 'Attraction not found'
      };
    }

    let spot = await photoSpotRepository.findOne({
      where: {
        scenicAreaId: attraction.scenicAreaId,
        attractionId: attraction.id,
      },
    });

    if (!spot) {
      spot = await photoSpotRepository.save(
        photoSpotRepository.create({
          scenicAreaId: attraction.scenicAreaId,
          attractionId: attraction.id,
          name: `${attraction.name}摄影位`,
          description: data.description || `${attraction.name}附近推荐拍摄点`,
          latitude: Number(data.location?.latitude ?? attraction.latitude ?? 0),
          longitude: Number(data.location?.longitude ?? attraction.longitude ?? 0),
          bestTime: '07:00-09:30 / 16:30-18:30',
          popularity: 0,
          crowdLevel: 'medium',
          lightingCondition: 'good',
          examplePhotos: '[]',
        }),
      );
    }

    await photoCheckinRepository.save(
      photoCheckinRepository.create({
        photoSpotId: spot.id,
        userId,
        photoUrl: data.photoUrl,
        caption: data.description || '',
        likes: 0,
      }),
    );

    spot.popularity = (spot.popularity || 0) + 1;
    await photoSpotRepository.save(spot);

    // 记录用户行为
    const behavior = userBehaviorRepository.create({
      userId,
      behaviorType: 'checkin',
      targetType: 'attraction',
      targetId: data.attractionId,
      timestamp: new Date()
    });
    await userBehaviorRepository.save(behavior);

    // 检查是否获得摄影成就
    const achievement = await this.checkPhotographyAchievement(userId);

    return {
      success: true,
      message: 'Photo checkin added successfully',
      achievement
    };
  }

  // 美食爱好者专属功能 - 美食推荐
  async getFoodRecommendations(userId: string, limit: number = 10): Promise<Food[]> {
    const userRepository = getUserRepository();
    const foodRepository = getFoodRepository();
    const userBehaviorRepository = getUserBehaviorRepository();
    // 获取用户信息
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // 检查用户是否是美食爱好者
    if (!user.interestWeights || user.interestWeights.foodie < 1.0) {
      // 如果不是美食爱好者，返回热门美食
      return await foodRepository.find({
        order: { popularity: 'DESC' },
        take: limit
      });
    }

    // 获取用户的美食行为
    const foodBehaviors = await userBehaviorRepository.find({
      where: {
        userId,
        targetType: 'food'
      },
      order: { timestamp: 'DESC' },
      take: 20
    });

    // 分析用户的美食偏好
    const cuisinePreferences = new Map<string, number>();
    for (const behavior of foodBehaviors) {
      const food = await foodRepository.findOne({ where: { id: behavior.targetId } });
      if (food) {
        cuisinePreferences.set(food.cuisine, (cuisinePreferences.get(food.cuisine) || 0) + 1);
      }
    }

    // 按偏好排序
    const sortedCuisines = Array.from(cuisinePreferences.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cuisine]) => cuisine);

    // 根据偏好推荐美食
    const recommendations: Food[] = [];
    for (const cuisine of sortedCuisines) {
      const foods = await foodRepository.find({
        where: { cuisine },
        order: { averageRating: 'DESC' },
        take: Math.ceil(limit / sortedCuisines.length)
      });
      recommendations.push(...foods);
      if (recommendations.length >= limit) break;
    }

    // 如果推荐不足，补充热门美食
    if (recommendations.length < limit) {
      const popularFoods = await foodRepository.find({
        where: {
          id: Not(In(recommendations.map(f => f.id)))
        },
        order: { popularity: 'DESC' },
        take: limit - recommendations.length
      });
      recommendations.push(...popularFoods);
    }

    return recommendations.slice(0, limit);
  }

  // 美食爱好者专属功能 - 美食路线规划
  async getFoodRoute(userId: string, startLocation: { latitude: number; longitude: number }, duration: number): Promise<{
    route: Food[];
    totalDistance: number;
    estimatedTime: number;
  }> {
    const foodRepository = getFoodRepository();
    // 获取附近的美食
    const nearbyFoods = await foodRepository.find({
      // 这里应该根据位置查询附近的美食，暂时返回热门美食
      order: { popularity: 'DESC' },
      take: 10
    });

    // 简单的路线规划（实际项目中应该使用路径规划算法）
    const route = nearbyFoods.slice(0, 5);
    const totalDistance = route.length * 0.5; // 假设每个美食点之间距离0.5公里
    const estimatedTime = duration; // 使用用户指定的时长

    return {
      route,
      totalDistance,
      estimatedTime
    };
  }

  // 个性化提醒
  async getPersonalizedReminders(userId: string): Promise<Array<{
    type: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
    data?: any;
  }>> {
    const userRepository = getUserRepository();
    const attractionRepository = getAttractionRepository();
    const foodRepository = getFoodRepository();
    const achievementRepository = getAchievementRepository();
    // 获取用户信息
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const reminders: Array<{
      type: string;
      message: string;
      priority: 'high' | 'medium' | 'low';
      data?: any;
    }> = [];

    // 检查用户的兴趣
    const interests = user.interestWeights || {};

    // 摄影爱好者提醒
    if (interests.photographer && interests.photographer > 1.0) {
      // 推荐摄影景点
      const photographySpots = await attractionRepository.find({
        where: { category: '摄影' },
        order: { averageRating: 'DESC' },
        take: 3
      });

      if (photographySpots.length > 0) {
        reminders.push({
          type: 'photography',
          message: `推荐您去这些摄影景点：${photographySpots.map(s => s.name).join('、')}`,
          priority: 'medium',
          data: { spots: photographySpots }
        });
      }
    }

    // 美食爱好者提醒
    if (interests.foodie && interests.foodie > 1.0) {
      // 推荐新美食
      const newFoods = await foodRepository.find({
        order: { createdAt: 'DESC' },
        take: 3
      });

      if (newFoods.length > 0) {
        reminders.push({
          type: 'food',
          message: `新上线的美食：${newFoods.map(f => f.name).join('、')}`,
          priority: 'medium',
          data: { foods: newFoods }
        });
      }
    }

    // 文化爱好者提醒
    if (interests.cultureEnthusiast && interests.cultureEnthusiast > 1.0) {
      // 推荐文化景点
      const cultureSpots = await attractionRepository.find({
        where: { category: '文化' },
        order: { averageRating: 'DESC' },
        take: 3
      });

      if (cultureSpots.length > 0) {
        reminders.push({
          type: 'culture',
          message: `推荐您去这些文化景点：${cultureSpots.map(s => s.name).join('、')}`,
          priority: 'medium',
          data: { spots: cultureSpots }
        });
      }
    }

    // 自然爱好者提醒
    if (interests.natureLover && interests.natureLover > 1.0) {
      // 推荐自然景点
      const natureSpots = await attractionRepository.find({
        where: { category: '自然' },
        order: { averageRating: 'DESC' },
        take: 3
      });

      if (natureSpots.length > 0) {
        reminders.push({
          type: 'nature',
          message: `推荐您去这些自然景点：${natureSpots.map(s => s.name).join('、')}`,
          priority: 'medium',
          data: { spots: natureSpots }
        });
      }
    }

    // 检查用户的成就
    const achievements = await achievementRepository.find({
      where: { userId }
    });

    if (achievements.length > 0) {
      reminders.push({
        type: 'achievement',
        message: `您已获得${achievements.length}个成就`,
        priority: 'low',
        data: { achievements }
      });
    }

    return reminders;
  }

  // 检查摄影成就
  private async checkPhotographyAchievement(userId: string): Promise<Achievement | undefined> {
    const userBehaviorRepository = getUserBehaviorRepository();
    const achievementRepository = getAchievementRepository();
    // 获取用户的摄影打卡次数
    const checkinCount = await userBehaviorRepository.count({
      where: {
        userId,
        behaviorType: 'checkin',
        targetType: 'attraction'
      }
    });

    // 检查是否达到“摄影大师”成就条件（统一成就体系）
    const achievementType = 'photography_master';
    if (checkinCount >= 20) {
      const existingAchievement = await achievementRepository.findOne({
        where: { userId, type: achievementType }
      });
      if (!existingAchievement) {
        const achievement = achievementRepository.create({
          userId,
          type: achievementType,
          name: this.getAchievementName(achievementType),
          description: this.getAchievementDescription(achievementType)
        });
        return await achievementRepository.save(achievement);
      }
    }

    return undefined;
  }

  // 获取成就名称
  private getAchievementName(type: string): string {
    const names: Record<string, string> = {
      'photography_master': '摄影大师'
    };
    return names[type] || type;
  }

  // 获取成就描述
  private getAchievementDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'photography_master': '拍摄并上传20张旅行照片'
    };
    return descriptions[type] || '';
  }
}
