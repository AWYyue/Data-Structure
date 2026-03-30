import { In, MoreThan } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { UserBehavior } from '../entities/UserBehavior';
import { Attraction } from '../entities/Attraction';
import { Food } from '../entities/Food';
import { ScenicArea } from '../entities/ScenicArea';
import { SocialTeam } from '../entities/SocialTeam';
import { SocialTeamMember } from '../entities/SocialTeamMember';
import { SocialCheckin } from '../entities/SocialCheckin';

interface TrendingTopic {
  id: string;
  title: string;
  type: 'attraction' | 'activity' | 'event';
  popularity: number;
  description?: string;
}

interface NearbyUser {
  id: string;
  username: string;
  distance: number;
  lastSeen: string;
  status?: string;
  currentAttraction?: string;
}

interface TeamMemberView {
  id: string;
  username: string;
  role: 'creator' | 'member';
}

interface TeamView {
  id: string;
  name: string;
  creator: string;
  members: TeamMemberView[];
  inviteCode: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

interface CheckinView {
  id: string;
  userId: string;
  username: string;
  attractionId: string;
  attractionName: string;
  timestamp: string;
  photo?: string;
  text?: string;
  likes: number;
  comments: number;
}

type Coordinate = { latitude: number; longitude: number };

function requireDataSource() {
  if (!AppDataSource || !AppDataSource.isInitialized) {
    throw new Error('Database not initialized');
  }
  return AppDataSource;
}

export class SocialService {
  async getTrending(scenicAreaId?: string, limit: number = 6): Promise<{ attractions: TrendingTopic[]; topics: TrendingTopic[] }> {
    const dataSource = requireDataSource();
    const attractionRepo = dataSource.getRepository(Attraction);
    const checkinRepo = dataSource.getRepository(SocialCheckin);
    const foodRepo = dataSource.getRepository(Food);
    const scenicRepo = dataSource.getRepository(ScenicArea);

    const whereAttraction = scenicAreaId ? { scenicAreaId } : {};
    const attractions = await attractionRepo.find({
      where: whereAttraction,
      order: {
        averageRating: 'DESC',
        reviewCount: 'DESC',
      },
      take: Math.max(limit * 3, 18),
    });

    const recentWindow = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCheckins = await checkinRepo.find({
      where: scenicAreaId
        ? { scenicAreaId, timestamp: MoreThan(recentWindow) }
        : { timestamp: MoreThan(recentWindow) },
      order: { timestamp: 'DESC' },
      take: 400,
    });
    const checkinCountMap = new Map<string, number>();
    for (const item of recentCheckins) {
      checkinCountMap.set(item.attractionId, (checkinCountMap.get(item.attractionId) ?? 0) + 1);
    }

    const attractionTopics = attractions
      .map((attraction) => {
        const socialHeat = checkinCountMap.get(attraction.id) ?? 0;
        const popularity = Math.round(
          Number(attraction.averageRating ?? 0) * 220 +
            Number(attraction.reviewCount ?? 0) * 0.25 +
            socialHeat * 40,
        );
        return {
          id: attraction.id,
          title: attraction.name,
          type: 'attraction' as const,
          popularity,
          description: attraction.description || `${attraction.name} 近期热度上升`,
        };
      })
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);

    const foods = await foodRepo.find({
      relations: ['facility'],
      take: 1200,
    });
    const cuisineHeat = new Map<string, number>();
    for (const food of foods) {
      if (scenicAreaId && food.facility?.scenicAreaId !== scenicAreaId) {
        continue;
      }
      const key = food.cuisine || '特色美食';
      const score = Number(food.popularity ?? 0) + Number(food.averageRating ?? 0) * 100;
      cuisineHeat.set(key, (cuisineHeat.get(key) ?? 0) + score);
    }

    const cuisineTopics: TrendingTopic[] = Array.from(cuisineHeat.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cuisine, score], index) => ({
        id: `cuisine-${index + 1}-${cuisine}`,
        title: `${cuisine}打卡热`,
        type: 'activity' as const,
        popularity: Math.round(score),
        description: `近期${cuisine}相关签到和评价持续增长`,
      }));

    const scenicCount = await scenicRepo.count();
    const recentCheckinCount = recentCheckins.length;
    const eventTopic: TrendingTopic = {
      id: 'event-social-wave',
      title: '今日同城热游',
      type: 'event',
      popularity: Math.max(180, recentCheckinCount * 18 + scenicCount),
      description: `近24小时社区签到 ${recentCheckinCount} 条`,
    };

    return {
      attractions: attractionTopics,
      topics: [...cuisineTopics, eventTopic],
    };
  }

  async getNearbyUsers(
    latitude: number,
    longitude: number,
    radius: number = 500,
    limit: number = 12,
    currentUserId?: string,
  ): Promise<NearbyUser[]> {
    const dataSource = requireDataSource();
    const userRepo = dataSource.getRepository(User);
    const behaviorRepo = dataSource.getRepository(UserBehavior);
    const attractionRepo = dataSource.getRepository(Attraction);
    const scenicRepo = dataSource.getRepository(ScenicArea);

    const users = await userRepo.find({
      order: { createdAt: 'DESC' },
      take: 80,
    });
    const filteredUsers = users.filter(
      (user) => typeof user.id === 'string' && user.id.trim() && user.id !== currentUserId,
    );
    if (!filteredUsers.length) {
      return [];
    }

    const userIds = filteredUsers.map((user) => user.id);
    const behaviors = await behaviorRepo.find({
      where: { userId: In(userIds) },
      order: { timestamp: 'DESC' },
      take: 800,
    });

    const latestBehaviorMap = new Map<string, UserBehavior>();
    for (const behavior of behaviors) {
      if (!latestBehaviorMap.has(behavior.userId)) {
        latestBehaviorMap.set(behavior.userId, behavior);
      }
    }

    const attractionIds = Array.from(
      new Set(
        behaviors
          .filter((item) => item.targetType === 'attraction')
          .map((item) => item.targetId),
      ),
    );
    const attractions = attractionIds.length
      ? await attractionRepo.find({ where: { id: In(attractionIds) } })
      : [];
    const attractionMap = new Map(attractions.map((item) => [item.id, item]));

    const scenicAreas = await scenicRepo.find({
      order: { popularity: 'DESC' },
      take: 5,
    });
    const fallbackCenter: Coordinate = scenicAreas[0]
      ? {
          latitude: Number(scenicAreas[0].latitude ?? 39.9042),
          longitude: Number(scenicAreas[0].longitude ?? 116.4074),
        }
      : { latitude: 39.9042, longitude: 116.4074 };

    const anchor: Coordinate = { latitude, longitude };
    const nearby: NearbyUser[] = [];
    const overflow: NearbyUser[] = [];

    for (const user of filteredUsers) {
      const behavior = latestBehaviorMap.get(user.id);
      const attraction =
        behavior?.targetType === 'attraction'
          ? attractionMap.get(behavior.targetId)
          : undefined;
      const userLocation = attraction
        ? {
            latitude: Number(attraction.latitude ?? fallbackCenter.latitude),
            longitude: Number(attraction.longitude ?? fallbackCenter.longitude),
          }
        : this.withDeterministicJitter(fallbackCenter, user.id, 0.01);

      const distance = this.haversineMeters(anchor, userLocation);
      const mapped: NearbyUser = {
        id: user.id,
        username: user.username,
        distance: Number(distance.toFixed(0)),
        lastSeen: (behavior?.timestamp ?? user.updatedAt).toISOString(),
        status: this.mapBehaviorStatus(behavior?.behaviorType),
        currentAttraction: attraction?.name,
      };

      if (distance <= radius) {
        nearby.push(mapped);
      } else {
        overflow.push(mapped);
      }
    }

    const result = nearby.length
      ? nearby.sort((a, b) => a.distance - b.distance).slice(0, limit)
      : overflow.sort((a, b) => a.distance - b.distance).slice(0, limit);
    return result;
  }

  async createTeam(userId: string | undefined, name: string, scenicAreaId?: string): Promise<{ teamId: string; inviteCode: string }> {
    const dataSource = requireDataSource();
    const teamRepo = dataSource.getRepository(SocialTeam);
    const memberRepo = dataSource.getRepository(SocialTeamMember);
    const creator = await this.resolveUser(userId);

    let inviteCode = '';
    for (let i = 0; i < 5; i += 1) {
      inviteCode = this.generateInviteCode();
      const exist = await teamRepo.findOne({ where: { inviteCode } });
      if (!exist) {
        break;
      }
      inviteCode = '';
    }
    if (!inviteCode) {
      throw new Error('Failed to generate invite code');
    }

    const team = await teamRepo.save(
      teamRepo.create({
        name,
        creatorUserId: creator.id,
        scenicAreaId: scenicAreaId || null,
        inviteCode,
        status: 'active',
      }),
    );

    await memberRepo.save(
      memberRepo.create({
        teamId: team.id,
        userId: creator.id,
        role: 'creator',
      }),
    );

    return {
      teamId: team.id,
      inviteCode: team.inviteCode,
    };
  }

  async joinTeam(userId: string | undefined, inviteCode: string): Promise<TeamView> {
    const dataSource = requireDataSource();
    const teamRepo = dataSource.getRepository(SocialTeam);
    const memberRepo = dataSource.getRepository(SocialTeamMember);
    const user = await this.resolveUser(userId);

    const normalized = inviteCode.trim().toUpperCase();
    const team = await teamRepo.findOne({
      where: {
        inviteCode: normalized,
        status: 'active',
      },
    });
    if (!team) {
      throw new Error('队伍邀请码不存在或已失效');
    }

    const existed = await memberRepo.findOne({
      where: {
        teamId: team.id,
        userId: user.id,
      },
    });
    if (!existed) {
      await memberRepo.save(
        memberRepo.create({
          teamId: team.id,
          userId: user.id,
          role: 'member',
        }),
      );
    }

    return this.getTeamInfo(team.id);
  }

  async getTeamInfo(teamId: string): Promise<TeamView> {
    const dataSource = requireDataSource();
    const teamRepo = dataSource.getRepository(SocialTeam);
    const memberRepo = dataSource.getRepository(SocialTeamMember);
    const userRepo = dataSource.getRepository(User);

    const team = await teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new Error('队伍不存在');
    }

    const members = await memberRepo.find({
      where: { teamId: team.id },
      order: { joinedAt: 'ASC' },
    });
    const userIds = Array.from(new Set(members.map((item) => item.userId).concat(team.creatorUserId)));
    const users = userIds.length ? await userRepo.find({ where: { id: In(userIds) } }) : [];
    const userMap = new Map(users.map((item) => [item.id, item]));

    return {
      id: team.id,
      name: team.name,
      creator: userMap.get(team.creatorUserId)?.username ?? '未知用户',
      members: members.map((member) => ({
        id: member.userId,
        username: userMap.get(member.userId)?.username ?? '未知用户',
        role: member.role,
      })),
      inviteCode: team.inviteCode,
      createdAt: team.createdAt.toISOString(),
      status: team.status,
    };
  }

  async getMyTeams(userId: string | undefined): Promise<TeamView[]> {
    const dataSource = requireDataSource();
    const memberRepo = dataSource.getRepository(SocialTeamMember);
    const user = await this.resolveUser(userId);
    const memberships = await memberRepo.find({
      where: { userId: user.id },
      order: { joinedAt: 'DESC' },
      take: 12,
    });
    const ids = Array.from(new Set(memberships.map((item) => item.teamId)));
    const teams: TeamView[] = [];
    for (const teamId of ids) {
      teams.push(await this.getTeamInfo(teamId));
    }
    return teams;
  }

  async checkIn(
    userId: string | undefined,
    payload: {
      attractionId: string;
      photo?: string;
      text?: string;
    },
  ): Promise<CheckinView> {
    const dataSource = requireDataSource();
    const user = await this.resolveUser(userId);
    const attractionRepo = dataSource.getRepository(Attraction);
    const behaviorRepo = dataSource.getRepository(UserBehavior);
    const checkinRepo = dataSource.getRepository(SocialCheckin);

    const attraction = await attractionRepo.findOne({ where: { id: payload.attractionId } });
    if (!attraction) {
      throw new Error('景点不存在');
    }

    const created = await checkinRepo.save(
      checkinRepo.create({
        userId: user.id,
        username: user.username,
        attractionId: attraction.id,
        attractionName: attraction.name,
        scenicAreaId: attraction.scenicAreaId,
        photo: payload.photo || null,
        text: payload.text || '打卡成功',
        likes: 0,
        comments: 0,
      }),
    );

    await behaviorRepo.save(
      behaviorRepo.create({
        userId: user.id,
        behaviorType: 'checkin',
        targetType: 'attraction',
        targetId: attraction.id,
      }),
    );

    return this.mapCheckin(created);
  }

  async getCheckIns(attractionId?: string, limit: number = 20): Promise<CheckinView[]> {
    const dataSource = requireDataSource();
    const checkinRepo = dataSource.getRepository(SocialCheckin);
    const checkins = await checkinRepo.find({
      where: attractionId ? { attractionId } : {},
      order: { timestamp: 'DESC' },
      take: Math.max(1, Math.min(limit, 100)),
    });
    return checkins.map((item) => this.mapCheckin(item));
  }

  private mapCheckin(item: SocialCheckin): CheckinView {
    return {
      id: item.id,
      userId: item.userId,
      username: item.username,
      attractionId: item.attractionId,
      attractionName: item.attractionName,
      timestamp: item.timestamp.toISOString(),
      photo: item.photo ?? undefined,
      text: item.text ?? undefined,
      likes: item.likes,
      comments: item.comments,
    };
  }

  private mapBehaviorStatus(behaviorType?: string): string {
    if (!behaviorType) return '在线';
    if (behaviorType === 'checkin') return '正在打卡';
    if (behaviorType === 'browse') return '正在浏览';
    if (behaviorType === 'favorite') return '收藏中';
    if (behaviorType === 'rate') return '评价中';
    return '活跃中';
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
    const validUser = existing.find((item) => typeof item.id === 'string' && item.id.trim());
    if (validUser) {
      return validUser;
    }

    const timestamp = Date.now();
    return userRepo.save(
      userRepo.create({
        username: `游客${String(timestamp).slice(-6)}`,
        email: `guest_${timestamp}@travel.local`,
        passwordHash: 'guest',
        interests: [],
        interestWeights: {},
      }),
    );
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private withDeterministicJitter(base: Coordinate, seed: string, degree: number): Coordinate {
    const hash = this.stringHash(seed);
    const offsetLat = ((hash % 1000) / 1000 - 0.5) * degree;
    const offsetLng = ((((hash / 1000) | 0) % 1000) / 1000 - 0.5) * degree;
    return {
      latitude: Number((base.latitude + offsetLat).toFixed(6)),
      longitude: Number((base.longitude + offsetLng).toFixed(6)),
    };
  }

  private stringHash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  private haversineMeters(a: Coordinate, b: Coordinate): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const r = 6371000;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return r * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
}
