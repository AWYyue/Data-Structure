export interface FoodItem {
  id: string;
  name: string;
  price: number;
  cuisine: string;
  rating: number;
  isRecommended: boolean;
  facilityId?: string;
  facilityName?: string;
  isMustTry?: boolean;
}

export interface FoodFacility {
  id: string;
  name: string;
  category: string;
  location: {
    latitude: number;
    longitude: number;
  };
  foods: FoodItem[];
}

export interface FoodMapData {
  center: {
    latitude: number;
    longitude: number;
  };
  stats: {
    facilityCount: number;
    foodCount: number;
    recommendedCount: number;
  };
  facilities: FoodFacility[];
}

export interface FoodRouteStop {
  facilityId: string;
  facilityName: string;
  arrivalMinute: number;
  location: {
    latitude: number;
    longitude: number;
  };
  foods: FoodItem[];
}

export interface FoodRouteData {
  id: string;
  name: string;
  facilities: string[];
  totalDistance: number;
  estimatedTime: number;
  path: [number, number][];
  stops: FoodRouteStop[];
}

export interface FoodChecklist {
  id: string;
  name: string;
  foods: Array<FoodItem & { facilityName: string; isChecked: boolean }>;
  totalItems: number;
  checkedItems: number;
}

export interface FoodCombination {
  id: string;
  name: string;
  foods: Array<FoodItem & { facilityName: string }>;
  totalPrice: number;
  description: string;
  popularity: number;
}

export interface BusinessHourReminder {
  facilityId?: string;
  facilityName: string;
  message: string;
  status?: 'open' | 'close_soon' | 'closed' | 'not_opened';
  timeLeft?: number;
}

const mockFacilities: FoodFacility[] = [
  {
    id: 'facility1',
    name: '湖畔餐厅',
    category: 'restaurant',
    location: { latitude: 39.9047, longitude: 116.4089 },
    foods: [
      { id: 'food1', name: '西湖醋鱼', price: 88, cuisine: '浙菜', rating: 4.8, isRecommended: true, facilityId: 'facility1', facilityName: '湖畔餐厅', isMustTry: true },
      { id: 'food2', name: '龙井虾仁', price: 128, cuisine: '浙菜', rating: 4.9, isRecommended: true, facilityId: 'facility1', facilityName: '湖畔餐厅', isMustTry: true },
      { id: 'food3', name: '叫花鸡', price: 68, cuisine: '浙菜', rating: 4.7, isRecommended: false, facilityId: 'facility1', facilityName: '湖畔餐厅' },
    ],
  },
  {
    id: 'facility2',
    name: '山顶小吃',
    category: 'food_stall',
    location: { latitude: 39.9062, longitude: 116.4094 },
    foods: [
      { id: 'food4', name: '灌汤包', price: 15, cuisine: '小吃', rating: 4.5, isRecommended: true, facilityId: 'facility2', facilityName: '山顶小吃' },
      { id: 'food5', name: '藕粉', price: 12, cuisine: '小吃', rating: 4.3, isRecommended: false, facilityId: 'facility2', facilityName: '山顶小吃' },
      { id: 'food6', name: '定胜糕', price: 8, cuisine: '小吃', rating: 4.4, isRecommended: true, facilityId: 'facility2', facilityName: '山顶小吃' },
    ],
  },
  {
    id: 'facility3',
    name: '茶园茶室',
    category: 'cafe',
    location: { latitude: 39.9052, longitude: 116.4104 },
    foods: [
      { id: 'food7', name: '西湖龙井', price: 68, cuisine: '饮品', rating: 4.9, isRecommended: true, facilityId: 'facility3', facilityName: '茶园茶室', isMustTry: true },
      { id: 'food8', name: '茶点套餐', price: 48, cuisine: '茶点', rating: 4.6, isRecommended: true, facilityId: 'facility3', facilityName: '茶园茶室' },
      { id: 'food9', name: '桂花糕', price: 20, cuisine: '甜点', rating: 4.4, isRecommended: false, facilityId: 'facility3', facilityName: '茶园茶室' },
    ],
  },
  {
    id: 'facility4',
    name: '御膳食府',
    category: 'restaurant',
    location: { latitude: 39.9072, longitude: 116.4104 },
    foods: [
      { id: 'food10', name: '宋嫂鱼羹', price: 58, cuisine: '浙菜', rating: 4.7, isRecommended: true, facilityId: 'facility4', facilityName: '御膳食府' },
      { id: 'food11', name: '东坡肉', price: 68, cuisine: '浙菜', rating: 4.8, isRecommended: true, facilityId: 'facility4', facilityName: '御膳食府', isMustTry: true },
      { id: 'food12', name: '龙井炒鸡', price: 138, cuisine: '浙菜', rating: 4.6, isRecommended: false, facilityId: 'facility4', facilityName: '御膳食府' },
    ],
  },
];

const allFoods = mockFacilities.flatMap((facility) => facility.foods);

export const foodieService = {
  getFoodMap: async (_scenicAreaId: string): Promise<FoodMapData> => {
    const center = mockFacilities.reduce(
      (acc, facility) => {
        acc.latitude += facility.location.latitude;
        acc.longitude += facility.location.longitude;
        return acc;
      },
      { latitude: 0, longitude: 0 },
    );

    return {
      center: {
        latitude: center.latitude / mockFacilities.length,
        longitude: center.longitude / mockFacilities.length,
      },
      stats: {
        facilityCount: mockFacilities.length,
        foodCount: allFoods.length,
        recommendedCount: allFoods.filter((item) => item.isRecommended).length,
      },
      facilities: mockFacilities,
    };
  },

  planFoodRoute: async (_scenicAreaId: string, duration = 120): Promise<FoodRouteData> => {
    const stops: FoodRouteStop[] = mockFacilities.slice(0, 3).map((facility, index) => ({
      facilityId: facility.id,
      facilityName: facility.name,
      arrivalMinute: index * 35 + 20,
      location: facility.location,
      foods: facility.foods.filter((item) => item.isRecommended).slice(0, 2),
    }));

    return {
      id: 'route1',
      name: '经典美食之旅',
      facilities: stops.map((item) => item.facilityId),
      totalDistance: 1500,
      estimatedTime: duration,
      path: stops.map((item) => [item.location.latitude, item.location.longitude]),
      stops,
    };
  },

  generateFoodChecklist: async (_scenicAreaId: string): Promise<FoodChecklist> => {
    const foods = allFoods.slice(0, 10).map((item) => ({
      ...item,
      facilityName: item.facilityName || '美食点',
      isChecked: false,
    }));

    return {
      id: 'checklist1',
      name: '景区美食打卡清单',
      foods,
      totalItems: foods.length,
      checkedItems: 0,
    };
  },

  getBusinessHourReminders: async (facilityId: string): Promise<BusinessHourReminder[]> => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const facilities = {
      facility1: { name: '湖畔餐厅', open: 9 * 60, close: 21 * 60 },
      facility2: { name: '山顶小吃', open: 8 * 60, close: 18 * 60 },
      facility3: { name: '茶园茶室', open: 8 * 60, close: 20 * 60 },
      facility4: { name: '御膳食府', open: 10 * 60, close: 22 * 60 },
    };

    const facility = facilities[facilityId as keyof typeof facilities];
    if (!facility) {
      return [];
    }

    if (currentTime < facility.open) {
      const timeLeft = facility.open - currentTime;
      return [
        {
          facilityId,
          facilityName: facility.name,
          message: `距离营业还有 ${Math.floor(timeLeft / 60)} 小时 ${timeLeft % 60} 分钟`,
          timeLeft,
          status: 'not_opened',
        },
      ];
    }

    if (currentTime > facility.close) {
      return [
        {
          facilityId,
          facilityName: facility.name,
          message: '该店铺当前已停止营业',
          status: 'closed',
        },
      ];
    }

    if (currentTime >= facility.close - 60) {
      const timeLeft = facility.close - currentTime;
      return [
        {
          facilityId,
          facilityName: facility.name,
          message: `距离打烊还有 ${timeLeft} 分钟`,
          timeLeft,
          status: 'close_soon',
        },
      ];
    }

    return [
      {
        facilityId,
        facilityName: facility.name,
        message: '当前营业中，适合前往打卡',
        status: 'open',
      },
    ];
  },

  recommendFoodCombination: async (_scenicAreaId: string, _foodId?: string): Promise<FoodCombination[]> => {
    const combos = [
      {
        id: 'combo1',
        name: '经典浙味组合',
        foods: ['food1', 'food10', 'food7'],
        description: '主菜、汤品和茶饮的一站式组合，适合第一次来景区体验。',
        popularity: 95,
      },
      {
        id: 'combo2',
        name: '轻松小吃组合',
        foods: ['food4', 'food6', 'food9'],
        description: '更适合边走边吃和轻量打卡，停留时间短也能体验景区特色。',
        popularity: 88,
      },
      {
        id: 'combo3',
        name: '高分招牌组合',
        foods: ['food2', 'food11', 'food8'],
        description: '优先覆盖景区口碑更高的招牌菜，适合想吃得更稳妥的游客。',
        popularity: 92,
      },
    ];

    return combos.map((combo) => {
      const foods = combo.foods
        .map((foodId) => allFoods.find((item) => item.id === foodId))
        .filter((item): item is FoodItem => Boolean(item))
        .map((item) => ({
          ...item,
          facilityName: item.facilityName || '美食点',
        }));

      return {
        id: combo.id,
        name: combo.name,
        foods,
        totalPrice: foods.reduce((sum, item) => sum + item.price, 0),
        description: combo.description,
        popularity: combo.popularity,
      };
    });
  },
};
