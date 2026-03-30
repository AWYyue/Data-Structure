import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { UserBehavior } from '../entities/UserBehavior';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

let memoryUsers: User[] = [];
let memoryNextId = 1;

function getUserRepository() {
  if (AppDataSource) {
    return AppDataSource.getRepository(User);
  }
  return null;
}

function getMemoryUser(identity: string): User | undefined {
  return memoryUsers.find((user) => user.username === identity || user.email === identity);
}

export class UserService {
  private async repairInvalidUserId(user: User): Promise<User> {
    if (user.id && user.id.trim()) {
      return user;
    }

    const nextId = uuidv4();
    const userRepository = getUserRepository();

    if (userRepository && AppDataSource) {
      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.connect();

      try {
        await queryRunner.query('PRAGMA foreign_keys = OFF');
        await queryRunner.startTransaction();
        await queryRunner.query('UPDATE "users" SET "id" = ? WHERE "username" = ? OR "email" = ?', [
          nextId,
          user.username,
          user.email,
        ]);
        await queryRunner.query('UPDATE "diaries" SET "userId" = ? WHERE "userId" = ?', [nextId, '']);
        await queryRunner.query('UPDATE "diary_comments" SET "userId" = ? WHERE "userId" = ?', [nextId, '']);
        await queryRunner.query('UPDATE "achievements" SET "userId" = ? WHERE "userId" = ?', [nextId, '']);
        await queryRunner.query('UPDATE "photo_checkins" SET "userId" = ? WHERE "userId" = ?', [nextId, '']);
        await queryRunner.query('UPDATE "social_checkins" SET "userId" = ? WHERE "userId" = ?', [nextId, '']);
        await queryRunner.query('UPDATE "social_team_members" SET "userId" = ? WHERE "userId" = ?', [nextId, '']);
        await queryRunner.query('UPDATE "social_teams" SET "creatorUserId" = ? WHERE "creatorUserId" = ?', [nextId, '']);
        await queryRunner.query('UPDATE "user_behaviors" SET "userId" = ? WHERE "userId" = ?', [nextId, '']);
        await queryRunner.commitTransaction();
        await queryRunner.query('PRAGMA foreign_keys = ON');

        const repaired = await userRepository.findOne({ where: { id: nextId } });
        return repaired || { ...user, id: nextId };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        await queryRunner.query('PRAGMA foreign_keys = ON');
        throw error;
      } finally {
        await queryRunner.release();
      }
    }

    const memoryIndex = memoryUsers.findIndex((item) => item.username === user.username || item.email === user.email);
    if (memoryIndex !== -1) {
      memoryUsers[memoryIndex] = {
        ...memoryUsers[memoryIndex],
        id: nextId,
        updatedAt: new Date(),
      };
      return memoryUsers[memoryIndex];
    }

    return { ...user, id: nextId };
  }

  async getUserByIdentity(userId?: string, username?: string): Promise<User | null> {
    const userRepository = getUserRepository();
    let user: User | null = null;

    if (userRepository) {
      if (userId && userId.trim()) {
        user = await userRepository.findOne({ where: { id: userId } });
      }

      if (!user && username?.trim()) {
        user = await userRepository.findOne({
          where: [{ username: username.trim() }, { email: username.trim() }],
        });
      }
    } else {
      if (userId && userId.trim()) {
        user = memoryUsers.find((item) => item.id === userId) || null;
      }

      if (!user && username?.trim()) {
        user = getMemoryUser(username.trim()) || null;
      }
    }

    if (!user) {
      return null;
    }

    return this.repairInvalidUserId(user);
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
  }): Promise<User> {
    const userRepository = getUserRepository();
    let existingUser;

    if (userRepository) {
      existingUser = await userRepository.findOne({
        where: [{ username: userData.username }, { email: userData.email }],
      });
    } else {
      existingUser = getMemoryUser(userData.username) || getMemoryUser(userData.email);
    }

    if (existingUser) {
      throw new Error('Username or email already exists');
    }

    const passwordHash = await bcrypt.hash(userData.password, 10);

    if (userRepository) {
      const user = userRepository.create({
        username: userData.username,
        email: userData.email,
        passwordHash,
        interests: [],
        interestWeights: {
          foodie: 0,
          photographer: 0,
          cultureEnthusiast: 0,
          natureLover: 0,
          sportsEnthusiast: 0,
          relaxationSeeker: 0,
          socialSharer: 0,
        },
        viewedItems: [],
        favorites: [],
        dislikedCategories: [],
      });
      return await userRepository.save(user);
    }

    const user = {
      id: `memory-${memoryNextId++}`,
      username: userData.username,
      email: userData.email,
      passwordHash,
      interests: [],
      interestWeights: {
        foodie: 0,
        photographer: 0,
        cultureEnthusiast: 0,
        natureLover: 0,
        sportsEnthusiast: 0,
        relaxationSeeker: 0,
        socialSharer: 0,
      },
      viewedItems: [],
      favorites: [],
      dislikedCategories: [],
      behaviors: [],
      achievements: [],
      diaries: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;

    memoryUsers.push(user);
    return user;
  }

  async login(credentials: {
    username: string;
    password: string;
  }): Promise<{ user: User; token: string }> {
    const userRepository = getUserRepository();
    let user: User | null = null;

    if (userRepository) {
      user = await userRepository.findOne({
        where: { username: credentials.username },
      });
    } else {
      user = getMemoryUser(credentials.username) || null;
    }

    if (!user) {
      throw new Error('Invalid username or password');
    }

    const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid username or password');
    }

    user = await this.repairInvalidUserId(user);

    const token = (jwt.sign as any)(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' },
    );

    return { user, token };
  }

  async updateInterests(userId: string, interests: string[]): Promise<User> {
    const user = await this.getUserByIdentity(userId);
    const userRepository = getUserRepository();

    if (!user) {
      throw new Error('User not found');
    }

    user.interests = interests;

    if (userRepository) {
      return await userRepository.save(user);
    }

    const index = memoryUsers.findIndex((item) => item.id === user.id);
    if (index !== -1) {
      memoryUsers[index] = { ...user, updatedAt: new Date() };
    }
    return user;
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.getUserByIdentity(userId);
  }

  verifyToken(token: string): { userId: string; username: string } {
    try {
      const decoded = jwt.verify(token, String(process.env.JWT_SECRET || 'your_jwt_secret_key')) as any;
      return { userId: decoded.userId, username: decoded.username };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async recordBehavior(userId: string, behavior: {
    type: 'browse' | 'favorite' | 'rate' | 'dislike';
    targetType: 'scenic_area' | 'diary' | 'food';
    targetId: string;
    duration?: number;
    rating?: number;
  }): Promise<UserBehavior> {
    const user = await this.getUserByIdentity(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const behaviorRecord = {
      id: `behavior-${Date.now()}`,
      userId: user.id,
      behaviorType: behavior.type,
      targetType: behavior.targetType,
      targetId: behavior.targetId,
      duration: behavior.duration,
      rating: behavior.rating,
      timestamp: new Date(),
    } as UserBehavior;

    if (AppDataSource) {
      const behaviorRepository = AppDataSource.getRepository(UserBehavior);
      return await behaviorRepository.save(behaviorRecord);
    }

    if (!user.behaviors) {
      user.behaviors = [];
    }
    user.behaviors.push(behaviorRecord);
    return behaviorRecord;
  }

  async getUserBehaviors(userId: string): Promise<UserBehavior[]> {
    const user = await this.getUserByIdentity(userId);

    if (!user) {
      return [];
    }

    if (AppDataSource) {
      const behaviorRepository = AppDataSource.getRepository(UserBehavior);
      return await behaviorRepository.find({ where: { userId: user.id } });
    }

    return user.behaviors || [];
  }

  async calculateInterestWeights(userId: string): Promise<Record<string, number>> {
    const behaviors = await this.getUserBehaviors(userId);
    const weights: Record<string, number> = {
      foodie: 0,
      photographer: 0,
      cultureEnthusiast: 0,
      natureLover: 0,
      sportsEnthusiast: 0,
      relaxationSeeker: 0,
      socialSharer: 0,
    };

    behaviors.forEach((behavior) => {
      const weight = behavior.duration ? Math.min(behavior.duration / 60, 5) : 1;

      switch (behavior.behaviorType) {
        case 'browse':
          weights.socialSharer += weight * 0.5;
          break;
        case 'favorite':
          weights.socialSharer += weight * 2;
          break;
        case 'rate':
          weights.socialSharer += weight * 1.5;
          break;
        default:
          break;
      }

      switch (behavior.targetType) {
        case 'food':
          weights.foodie += weight * 2;
          break;
        case 'scenic_area':
          weights.natureLover += weight * 1.5;
          weights.cultureEnthusiast += weight;
          break;
        case 'diary':
          weights.photographer += weight * 1.5;
          weights.socialSharer += weight;
          break;
        default:
          break;
      }
    });

    const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
    if (total > 0) {
      Object.keys(weights).forEach((key) => {
        weights[key] = weights[key] / total;
      });
    }

    return weights;
  }

  async updateInterestWeights(userId: string): Promise<User> {
    const user = await this.getUserByIdentity(userId);
    const userRepository = getUserRepository();

    if (!user) {
      throw new Error('User not found');
    }

    user.interestWeights = await this.calculateInterestWeights(user.id);

    if (userRepository) {
      return await userRepository.save(user);
    }

    const index = memoryUsers.findIndex((item) => item.id === user.id);
    if (index !== -1) {
      memoryUsers[index] = { ...user, updatedAt: new Date() };
    }
    return user;
  }
}
