import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Attraction } from '../entities/Attraction';
import { Food } from '../entities/Food';
import { UserBehavior } from '../entities/UserBehavior';
import { PhotoSpot } from '../entities/PhotoSpot';
import { PhotoCheckin } from '../entities/PhotoCheckin';
import { In, Not } from 'typeorm';

function getUserRepository() {
  if (!AppDataSource) {
    throw new Error('Database not initialized');
  }
  return AppDataSource.getRepository(User);
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
  async addPhotoCheckin(
    userId: string,
    data: {
      attractionId: string;
      photoUrl: string;
      location: { latitude: number; longitude: number };
      description?: string;
    },
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const attractionRepository = getAttractionRepository();
    const userBehaviorRepository = getUserBehaviorRepository();
    const photoSpotRepository = getPhotoSpotRepository();
    const photoCheckinRepository = getPhotoCheckinRepository();

    const attraction = await attractionRepository.findOne({ where: { id: data.attractionId } });
    if (!attraction) {
      return {
        success: false,
        message: 'Attraction not found',
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
          name: `${attraction.name}???`,
          description: data.description || `${attraction.name}???????`,
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

    const behavior = userBehaviorRepository.create({
      userId,
      behaviorType: 'checkin',
      targetType: 'attraction',
      targetId: data.attractionId,
      timestamp: new Date(),
    });
    await userBehaviorRepository.save(behavior);

    return {
      success: true,
      message: 'Photo checkin added successfully',
    };
  }

  async getFoodRecommendations(userId: string, limit = 10): Promise<Food[]> {
    const userRepository = getUserRepository();
    const foodRepository = getFoodRepository();
    const userBehaviorRepository = getUserBehaviorRepository();

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.interestWeights || user.interestWeights.foodie < 1.0) {
      return foodRepository.find({
        order: { popularity: 'DESC' },
        take: limit,
      });
    }

    const foodBehaviors = await userBehaviorRepository.find({
      where: {
        userId,
        targetType: 'food',
      },
      order: { timestamp: 'DESC' },
      take: 20,
    });

    const cuisinePreferences = new Map<string, number>();
    for (const behavior of foodBehaviors) {
      const food = await foodRepository.findOne({ where: { id: behavior.targetId } });
      if (food) {
        cuisinePreferences.set(food.cuisine, (cuisinePreferences.get(food.cuisine) || 0) + 1);
      }
    }

    const sortedCuisines = Array.from(cuisinePreferences.entries())
      .sort((left, right) => right[1] - left[1])
      .map(([cuisine]) => cuisine);

    const recommendations: Food[] = [];
    for (const cuisine of sortedCuisines) {
      const foods = await foodRepository.find({
        where: { cuisine },
        order: { averageRating: 'DESC' },
        take: Math.ceil(limit / sortedCuisines.length),
      });
      recommendations.push(...foods);
      if (recommendations.length >= limit) {
        break;
      }
    }

    if (recommendations.length < limit) {
      const popularFoods = await foodRepository.find({
        where: {
          id: Not(In(recommendations.map((food) => food.id))),
        },
        order: { popularity: 'DESC' },
        take: limit - recommendations.length,
      });
      recommendations.push(...popularFoods);
    }

    return recommendations.slice(0, limit);
  }

  async getFoodRoute(
    userId: string,
    startLocation: { latitude: number; longitude: number },
    duration: number,
  ): Promise<{
    route: Food[];
    totalDistance: number;
    estimatedTime: number;
  }> {
    void userId;
    void startLocation;

    const foodRepository = getFoodRepository();
    const nearbyFoods = await foodRepository.find({
      order: { popularity: 'DESC' },
      take: 10,
    });

    const route = nearbyFoods.slice(0, 5);
    const totalDistance = route.length * 0.5;
    const estimatedTime = duration;

    return {
      route,
      totalDistance,
      estimatedTime,
    };
  }

  async getPersonalizedReminders(userId: string): Promise<
    Array<{
      type: string;
      message: string;
      priority: 'high' | 'medium' | 'low';
      data?: any;
    }>
  > {
    const userRepository = getUserRepository();
    const attractionRepository = getAttractionRepository();
    const foodRepository = getFoodRepository();

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

    const interests = user.interestWeights || {};

    if (interests.photographer && interests.photographer > 1.0) {
      const photographySpots = await attractionRepository.find({
        where: { category: '??' },
        order: { averageRating: 'DESC' },
        take: 3,
      });

      if (photographySpots.length > 0) {
        reminders.push({
          type: 'photography',
          message: `???????????${photographySpots.map((spot) => spot.name).join('?')}`,
          priority: 'medium',
          data: { spots: photographySpots },
        });
      }
    }

    if (interests.foodie && interests.foodie > 1.0) {
      const newFoods = await foodRepository.find({
        order: { createdAt: 'DESC' },
        take: 3,
      });

      if (newFoods.length > 0) {
        reminders.push({
          type: 'food',
          message: `???????${newFoods.map((food) => food.name).join('?')}`,
          priority: 'medium',
          data: { foods: newFoods },
        });
      }
    }

    if (interests.cultureEnthusiast && interests.cultureEnthusiast > 1.0) {
      const cultureSpots = await attractionRepository.find({
        where: { category: '??' },
        order: { averageRating: 'DESC' },
        take: 3,
      });

      if (cultureSpots.length > 0) {
        reminders.push({
          type: 'culture',
          message: `???????????${cultureSpots.map((spot) => spot.name).join('?')}`,
          priority: 'medium',
          data: { spots: cultureSpots },
        });
      }
    }

    if (interests.natureLover && interests.natureLover > 1.0) {
      const natureSpots = await attractionRepository.find({
        where: { category: '??' },
        order: { averageRating: 'DESC' },
        take: 3,
      });

      if (natureSpots.length > 0) {
        reminders.push({
          type: 'nature',
          message: `???????????${natureSpots.map((spot) => spot.name).join('?')}`,
          priority: 'medium',
          data: { spots: natureSpots },
        });
      }
    }

    return reminders;
  }
}
