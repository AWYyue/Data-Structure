import api from './api';
import { getStoredUserId } from '../utils/authStorage';

export interface PhotoSpot {
  id: string;
  scenicAreaId: string;
  attractionId: string | null;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  bestTime: string;
  description: string;
  examplePhotos: string[];
  popularity: number;
  crowdLevel: 'low' | 'medium' | 'high';
  lightingCondition: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface PhotoCheckin {
  id: string;
  userId: string | null;
  photoSpotId: string;
  photoUrl: string;
  timestamp: string;
  caption?: string;
  likes: number;
}

export const photoSpotService = {
  getPhotoSpots: async (scenicAreaId: string): Promise<PhotoSpot[]> => {
    try {
      const response = await api.get(`/photo-spots/${encodeURIComponent(scenicAreaId)}/spots`);
      return response.data || [];
    } catch (error) {
      console.error('获取拍照点位失败:', error);
      return [];
    }
  },

  calculateBestPhotoTime: async (photoSpotId: string): Promise<string> => {
    try {
      const response = await api.get(
        `/photo-spots/spots/${encodeURIComponent(photoSpotId)}/best-time`,
      );
      return response.data?.bestTime || '07:00-09:30 / 16:30-18:30';
    } catch (error) {
      console.error('计算最佳拍照时间失败:', error);
      return '07:00-09:30 / 16:30-18:30';
    }
  },

  uploadCheckinPhoto: async (
    photoSpotId: string,
    photoUrl: string,
    caption?: string,
  ): Promise<PhotoCheckin> => {
    const response = await api.post(
      `/photo-spots/spots/${encodeURIComponent(photoSpotId)}/checkins`,
      {
        photoUrl,
        caption,
        userId: getStoredUserId(),
      },
    );

    return response.data;
  },

  getCheckinStats: async (
    photoSpotId: string,
  ): Promise<{ totalCheckins: number; recentCheckins: PhotoCheckin[] }> => {
    try {
      const response = await api.get(
        `/photo-spots/spots/${encodeURIComponent(photoSpotId)}/stats`,
      );
      return response.data || { totalCheckins: 0, recentCheckins: [] };
    } catch (error) {
      console.error('获取打卡统计失败:', error);
      return { totalCheckins: 0, recentCheckins: [] };
    }
  },

  getPopularPhotos: async (scenicAreaId: string): Promise<PhotoCheckin[]> => {
    try {
      const response = await api.get(
        `/photo-spots/${encodeURIComponent(scenicAreaId)}/popular-photos?limit=9`,
      );
      return response.data || [];
    } catch (error) {
      console.error('获取热门照片失败:', error);
      return [];
    }
  },
};
