import api from './api';
import { Food, Reminder } from '../types';

type PhotoCheckinAchievement = Record<string, unknown>;

export const featureService = {
  createPhotoCheckin: async (data: {
    attractionId: string;
    photoUrl: string;
    location: { latitude: number; longitude: number };
    description?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: { achievement?: PhotoCheckinAchievement };
  }> => api.post('/features/photo-checkin', data),

  getFoodRecommendations: async (
    limit?: number,
  ): Promise<{ success: boolean; data: Food[] }> =>
    api.get(`/features/food-recommendations?limit=${limit || 10}`),

  getFoodRoute: async (
    startLocation: { latitude: number; longitude: number },
    duration: number,
  ): Promise<{
    success: boolean;
    data: { route: Food[]; totalDistance: number; estimatedTime: number };
  }> =>
    api.get(
      `/features/food-route?latitude=${startLocation.latitude}&longitude=${startLocation.longitude}&duration=${duration}`,
    ),

  getPersonalizedReminders: async (): Promise<{
    success: boolean;
    data: Reminder[];
  }> => api.get('/features/personalized-reminders'),
};
