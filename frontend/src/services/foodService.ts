import api from './api';

export interface Food {
  id: string;
  name: string;
  cuisine: string;
  price?: number;
  description: string;
  popularity: number;
  averageRating: number;
  reviewCount: number;
  tags?: string[];
  isSeasonalSpecial: boolean;
  facilityId: string;
  facility?: {
    id: string;
    name: string;
    category: string;
  };
}

export interface FoodService {
  getFoodRecommendations: (scenicAreaId: string, limit?: number, cuisine?: string) => Promise<{ success: boolean; data: Food[] }>;
  fuzzySearchFood: (keyword: string, scenicAreaId: string, limit?: number) => Promise<{ success: boolean; data: Food[] }>;
  getAllCuisines: (scenicAreaId: string) => Promise<{ success: boolean; data: string[] }>;
}

const foodService: FoodService = {
  getFoodRecommendations: async (scenicAreaId, limit = 10, cuisine) => {
    let url = `/food/recommendations?scenicAreaId=${encodeURIComponent(scenicAreaId)}&limit=${limit}`;
    if (cuisine) {
      url += `&cuisine=${encodeURIComponent(cuisine)}`;
    }
    return api.get(url);
  },
  
  fuzzySearchFood: async (keyword, scenicAreaId, limit = 10) => {
    return api.get(
      `/food/search?keyword=${encodeURIComponent(keyword)}&scenicAreaId=${encodeURIComponent(scenicAreaId)}&limit=${limit}`,
    );
  },
  
  getAllCuisines: async (scenicAreaId) => {
    return api.get(`/food/cuisines?scenicAreaId=${encodeURIComponent(scenicAreaId)}`);
  }
};

export default foodService;
