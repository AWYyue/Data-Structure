import { In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Achievement } from '../entities/Achievement';
import { User } from '../entities/User';
import { UserBehavior } from '../entities/UserBehavior';
import { Attraction } from '../entities/Attraction';
import { PhotoCheckin } from '../entities/PhotoCheckin';
import { SocialCheckin } from '../entities/SocialCheckin';
import { SocialTeamMember } from '../entities/SocialTeamMember';

export interface AchievementView {
  id: string;
  type: 'foodie_master' | 'photography_master' | 'exploration_pioneer' | 'social_master';
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  progress: number;
  target: number;
  isEarned: boolean;
}

interface AchievementDefinition {
  type: 'foodie_master' | 'photography_master' | 'exploration_pioneer' | 'social_master';
  name: string;
  description: string;
  icon: string;
  target: number;
}

const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    type: 'foodie_master',
    name: '美食达人',
    description: '品尝 10 种不同美食',
    icon: '🍜',
    target: 10,
  },
  {
    type: 'photography_master',
    name: '摄影大师',
    description: '拍摄并上传 20 张旅行照片',
    icon: '📷',
    target: 20,
  },
  {
    type: 'exploration_pioneer',
    name: '探索先锋',
    description: '探索 10 个不同景区',
    icon: '🏞️',
    target: 10,
  },
  {
    type: 'social_master',
    name: '社交达人',
    description: '社交积分达到 100',
    icon: '👥',
    target: 100,
  },
];

function requireDataSource() {
  if (!AppDataSource || !AppDataSource.isInitialized) {
    throw new Error('Database not initialized');
  }
  return AppDataSource;
}

export class AchievementService {
  async getUserAchievements(userId?: string): Promise<AchievementView[]> {
    const dataSource = requireDataSource();
    const user = await this.resolveUser(userId);
    const achievementRepo = dataSource.getRepository(Achievement);
    const earned = await achievementRepo.find({
      where: { userId: user.id },
      order: { earnedAt: 'ASC' },
    });
    const earnedMap = new Map<string, Achievement>();
    for (const item of earned) {
      if (!earnedMap.has(item.type)) {
        earnedMap.set(item.type, item);
      }
    }

    const progress = await this.computeProgressMap(user.id);
    return ACHIEVEMENT_DEFINITIONS.map((def) => {
      const earnedItem = earnedMap.get(def.type);
      const value = progress[def.type] ?? 0;
      return {
        id: earnedItem?.id ?? `virtual-${def.type}`,
        type: def.type,
        name: def.name,
        description: def.description,
        icon: def.icon,
        earnedAt: earnedItem?.earnedAt?.toISOString() ?? '',
        progress: Math.min(def.target, value),
        target: def.target,
        isEarned: Boolean(earnedItem),
      };
    });
  }

  async checkAndUpdateAchievements(userId?: string): Promise<{ newAchievements: AchievementView[] }> {
    const dataSource = requireDataSource();
    const user = await this.resolveUser(userId);
    const achievementRepo = dataSource.getRepository(Achievement);
    const existing = await achievementRepo.find({
      where: { userId: user.id },
    });
    const existingTypes = new Set(existing.map((item) => item.type));
    const progress = await this.computeProgressMap(user.id);
    const newAchievements: AchievementView[] = [];

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      if (existingTypes.has(def.type)) {
        continue;
      }
      const value = progress[def.type] ?? 0;
      if (value >= def.target) {
        const saved = await achievementRepo.save(
          achievementRepo.create({
            userId: user.id,
            type: def.type,
            name: def.name,
            description: def.description,
          }),
        );
        newAchievements.push({
          id: saved.id,
          type: def.type,
          name: def.name,
          description: def.description,
          icon: def.icon,
          earnedAt: saved.earnedAt.toISOString(),
          progress: def.target,
          target: def.target,
          isEarned: true,
        });
      }
    }

    return { newAchievements };
  }

  async getAchievementDetails(userId: string | undefined, achievementId: string): Promise<AchievementView> {
    const all = await this.getUserAchievements(userId);
    const byId = all.find((item) => item.id === achievementId);
    if (byId) {
      return byId;
    }
    const byType = all.find((item) => item.type === achievementId);
    if (byType) {
      return byType;
    }
    throw new Error('Achievement not found');
  }

  private async computeProgressMap(userId: string): Promise<Record<string, number>> {
    const dataSource = requireDataSource();
    const behaviorRepo = dataSource.getRepository(UserBehavior);
    const attractionRepo = dataSource.getRepository(Attraction);
    const photoCheckinRepo = dataSource.getRepository(PhotoCheckin);
    const socialCheckinRepo = dataSource.getRepository(SocialCheckin);
    const socialTeamMemberRepo = dataSource.getRepository(SocialTeamMember);

    const behaviors = await behaviorRepo.find({
      where: { userId },
      order: { timestamp: 'DESC' },
      take: 5000,
    });
    const foodIds = new Set(
      behaviors
        .filter((item) => item.targetType === 'food' && item.targetId)
        .map((item) => item.targetId),
    );

    const attractionBehaviorIds = Array.from(
      new Set(
        behaviors
          .filter((item) => item.targetType === 'attraction' && item.targetId)
          .map((item) => item.targetId),
      ),
    );
    const attractions = attractionBehaviorIds.length
      ? await attractionRepo.find({ where: { id: In(attractionBehaviorIds) } })
      : [];
    const scenicIds = new Set(attractions.map((item) => item.scenicAreaId).filter(Boolean));

    const socialCheckins = await socialCheckinRepo.find({
      where: { userId },
      order: { timestamp: 'DESC' },
      take: 2000,
    });
    for (const checkin of socialCheckins) {
      if (checkin.scenicAreaId) {
        scenicIds.add(checkin.scenicAreaId);
      }
    }

    const photoCount = await photoCheckinRepo.count({ where: { userId } });
    const teamMemberships = await socialTeamMemberRepo.find({
      where: { userId },
    });
    const joinedTeamCount = teamMemberships.length;
    const createdTeamCount = teamMemberships.filter((item) => item.role === 'creator').length;
    const socialScore = socialCheckins.length * 10 + joinedTeamCount * 20 + createdTeamCount * 30;

    return {
      foodie_master: foodIds.size,
      photography_master: photoCount,
      exploration_pioneer: scenicIds.size,
      social_master: socialScore,
    };
  }

  private async resolveUser(userId?: string): Promise<User> {
    const dataSource = requireDataSource();
    const userRepo = dataSource.getRepository(User);
    if (userId) {
      const found = await userRepo.findOne({ where: { id: userId } });
      if (found) {
        return found;
      }
    }

    const existing = await userRepo.find({
      order: { createdAt: 'ASC' },
      take: 20,
    });
    const valid = existing.find((item) => typeof item.id === 'string' && item.id.trim());
    if (valid) {
      return valid;
    }

    const ts = Date.now();
    return userRepo.save(
      userRepo.create({
        username: `游客${String(ts).slice(-6)}`,
        email: `guest_${ts}@travel.local`,
        passwordHash: 'guest',
      }),
    );
  }
}

