import api from './api';

export interface ScenicArea {
  id: string;
  name: string;
  category: string;
  description?: string;
  coverImageUrl?: string;
  cityLabel?: string;
  coverImageTheme?: string;
  latitude?: number;
  longitude?: number;
  rating: number;
  visitorCount: number;
  averageRating?: number;
  popularity?: number;
  reviewCount?: number;
  tags?: string[];
}

export interface RecommendationExplanation {
  factors: Array<{ name: string; weight: number; explanation: string }>;
  totalScore: number;
}

export interface RecommendationService {
  getPopularityRanking: (limit?: number) => Promise<{ success: boolean; data: ScenicArea[] }>;
  getRatingRanking: (limit?: number) => Promise<{ success: boolean; data: ScenicArea[] }>;
  getReviewRanking: (limit?: number) => Promise<{ success: boolean; data: ScenicArea[] }>;
  getPersonalizedRanking: (limit?: number) => Promise<{ success: boolean; data: ScenicArea[] }>;
  getPersonalizedRecommendations: (limit?: number) => Promise<{ success: boolean; data: ScenicArea[] }>;
  getIncrementalRecommendations: (limit?: number) => Promise<{ success: boolean; data: ScenicArea[] }>;
  getExplorationRecommendations: (limit?: number) => Promise<{ success: boolean; data: ScenicArea[] }>;
  getSurpriseRecommendations: (limit?: number) => Promise<{ success: boolean; data: ScenicArea[] }>;
  getRecommendationExplanation: (itemId: string) => Promise<{ success: boolean; data: RecommendationExplanation }>;
  learnUserBehavior: (itemId: string, behaviorType: string, category?: string, rating?: number) => Promise<{ success: boolean; message: string }>;
}

const recommendationService: RecommendationService = {
  getPopularityRanking: async (limit = 10) => {
    return api.get(`/recommendations/ranking/popularity?limit=${limit}`);
  },
  
  getRatingRanking: async (limit = 10) => {
    return api.get(`/recommendations/ranking/rating?limit=${limit}`);
  },
  
  getReviewRanking: async (limit = 10) => {
    return api.get(`/recommendations/ranking/review?limit=${limit}`);
  },
  
  getPersonalizedRanking: async (limit = 10) => {
    return api.get(`/recommendations/ranking/personalized?limit=${limit}`);
  },
  
  getPersonalizedRecommendations: async (limit = 10) => {
    return api.get(`/recommendations/personalized?limit=${limit}`);
  },
  
  getIncrementalRecommendations: async (limit = 5) => {
    return api.get(`/recommendations/incremental?limit=${limit}`);
  },

  getExplorationRecommendations: async (limit = 10) => {
    return api.get(`/recommendations/exploration?limit=${limit}`);
  },

  getSurpriseRecommendations: async (limit = 5) => {
    return api.get(`/recommendations/surprise?limit=${limit}`);
  },

  getRecommendationExplanation: async (itemId) => {
    return api.get(`/recommendations/explanation?itemId=${encodeURIComponent(itemId)}`);
  },
  
  learnUserBehavior: async (itemId, behaviorType, category, rating) => {
    return api.post('/recommendations/learn-behavior', { itemId, behaviorType, category, rating });
  }
};

export default recommendationService;
