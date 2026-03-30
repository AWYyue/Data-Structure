import api from './api';
import { getStoredUserId } from '../utils/authStorage';

export interface TrendingTopic {
  id: string;
  title: string;
  type: 'attraction' | 'activity' | 'event';
  popularity: number;
  imageUrl?: string;
  description?: string;
}

export interface NearbyUser {
  id: string;
  username: string;
  avatar?: string;
  distance: number;
  lastSeen: string;
  status?: string;
  currentAttraction?: string;
}

export interface Team {
  id: string;
  name: string;
  creator: string;
  members: Array<{
    id: string;
    username: string;
    role: 'creator' | 'member';
  }>;
  inviteCode: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

export interface CheckIn {
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

export const socialService = {
  getTrending: async (
    scenicAreaId?: string,
  ): Promise<{ success: boolean; data: { attractions: TrendingTopic[]; topics: TrendingTopic[] } }> => {
    const params = new URLSearchParams();
    if (scenicAreaId) {
      params.set('scenicAreaId', scenicAreaId);
    }
    const query = params.toString();
    return api.get(`/social/trending${query ? `?${query}` : ''}`);
  },

  getNearbyUsers: async (
    radius: number = 500,
    location?: { latitude: number; longitude: number },
  ): Promise<{ success: boolean; data: NearbyUser[] }> => {
    const params = new URLSearchParams({
      radius: String(radius),
      latitude: String(location?.latitude ?? 39.9042),
      longitude: String(location?.longitude ?? 116.4074),
    });
    const userId = getStoredUserId();
    if (userId) {
      params.set('userId', userId);
    }
    return api.get(`/social/nearby?${params.toString()}`);
  },

  createTeam: async (
    name: string,
    scenicAreaId?: string,
  ): Promise<{ success: boolean; data: { teamId: string; inviteCode: string } }> => {
    const userId = getStoredUserId();
    return api.post('/social/teams', { name, scenicAreaId, userId });
  },

  joinTeam: async (inviteCode: string): Promise<{ success: boolean; data: Team }> => {
    const userId = getStoredUserId();
    return api.post('/social/teams/join', { inviteCode, userId });
  },

  getTeamInfo: async (teamId: string): Promise<{ success: boolean; data: Team }> => {
    return api.get(`/social/teams/${teamId}`);
  },

  getMyTeams: async (): Promise<{ success: boolean; data: Team[] }> => {
    const userId = getStoredUserId();
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return api.get(`/social/my-teams${query}`);
  },

  checkIn: async (
    attractionId: string,
    photo?: string,
    text?: string,
  ): Promise<{ success: boolean; data: CheckIn }> => {
    const userId = getStoredUserId();
    return api.post('/social/check-in', { attractionId, photo, text, userId });
  },

  getCheckIns: async (attractionId?: string): Promise<{ success: boolean; data: CheckIn[] }> => {
    const query = attractionId ? `?attractionId=${encodeURIComponent(attractionId)}` : '';
    return api.get(`/social/check-ins${query}`);
  },
};
