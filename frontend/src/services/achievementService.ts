import api from './api';
import { getStoredUserId } from '../utils/authStorage';

export interface Achievement {
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

export const achievementService = {
  getUserAchievements: async (): Promise<{ success: boolean; data: Achievement[] }> => {
    const userId = getStoredUserId();
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return api.get(`/achievements${query}`);
  },

  checkAndUpdateAchievements: async (): Promise<{ success: boolean; data: { newAchievements: Achievement[] } }> => {
    const userId = getStoredUserId();
    return api.post('/achievements/check', { userId });
  },

  getAchievementDetails: async (achievementId: string): Promise<{ success: boolean; data: Achievement }> => {
    const userId = getStoredUserId();
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return api.get(`/achievements/${achievementId}${query}`);
  },
};
