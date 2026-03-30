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
    getFoodRecommendations: (scenicAreaId: string, limit?: number, cuisine?: string) => Promise<{
        success: boolean;
        data: Food[];
    }>;
    fuzzySearchFood: (keyword: string, scenicAreaId: string, limit?: number) => Promise<{
        success: boolean;
        data: Food[];
    }>;
    getAllCuisines: (scenicAreaId: string) => Promise<{
        success: boolean;
        data: string[];
    }>;
}
declare const foodService: FoodService;
export default foodService;
