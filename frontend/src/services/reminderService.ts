export interface Reminder {
  id: string;
  type: 'food' | 'photo' | 'weather' | 'crowd' | 'general';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  time: Date;
  isRead: boolean;
  data?: Record<string, unknown>;
}

export interface UserPreferences {
  foodReminders: boolean;
  photoReminders: boolean;
  weatherReminders: boolean;
  crowdReminders: boolean;
  reminderFrequency: 'low' | 'medium' | 'high';
}

const defaultPreferences: UserPreferences = {
  foodReminders: true,
  photoReminders: true,
  weatherReminders: true,
  crowdReminders: true,
  reminderFrequency: 'medium',
};

const createBaseReminder = (
  partial: Omit<Reminder, 'time' | 'isRead'> & { time?: Date; isRead?: boolean },
): Reminder => ({
  ...partial,
  time: partial.time || new Date(),
  isRead: partial.isRead ?? false,
});

const getDefaultReminders = (): Reminder[] => [
  createBaseReminder({
    id: 'reminder-food-1',
    type: 'food',
    title: '附近美食推荐',
    message: '你附近 500 米内有一家评分较高的特色餐厅，可以顺路安排补给。',
    priority: 'medium',
    time: new Date(Date.now() - 5 * 60 * 1000),
    data: {
      facilityId: 'facility1',
      facilityName: '湖畔餐厅',
      foodName: '西湖醋鱼',
      distance: 450,
    },
  }),
  createBaseReminder({
    id: 'reminder-photo-1',
    type: 'photo',
    title: '最佳拍照时间',
    message: '你正在热门景点附近，当前光线条件理想，适合拍摄风景照。',
    priority: 'high',
    time: new Date(Date.now() - 10 * 60 * 1000),
    data: {
      attractionId: 'attraction1',
      attractionName: '景点 A',
      lightingCondition: 'excellent',
      bestTime: '当前',
    },
  }),
  createBaseReminder({
    id: 'reminder-weather-1',
    type: 'weather',
    title: '天气提醒',
    message: '未来 2 小时内可能有雨，建议优先安排室内景点或及时调整路线。',
    priority: 'high',
    time: new Date(Date.now() - 15 * 60 * 1000),
    isRead: true,
    data: {
      weather: 'rain',
      duration: 120,
      indoorAttractions: ['attraction2', 'attraction3'],
    },
  }),
  createBaseReminder({
    id: 'reminder-crowd-1',
    type: 'crowd',
    title: '拥挤度预警',
    message: '景点 B 当前拥挤度较高，建议稍后再前往，或先切换到附近替代点位。',
    priority: 'medium',
    time: new Date(Date.now() - 20 * 60 * 1000),
    data: {
      attractionId: 'attraction2',
      crowdLevel: 'high',
      alternativeAttractions: ['attraction4', 'attraction5'],
    },
  }),
];

export const reminderService = {
  getUserPreferences: async (): Promise<UserPreferences> => defaultPreferences,

  updateUserPreferences: async (_preferences: Partial<UserPreferences>): Promise<boolean> => true,

  getReminders: async (): Promise<Reminder[]> => getDefaultReminders(),

  markAsRead: async (_reminderId: string): Promise<boolean> => true,

  deleteReminder: async (_reminderId: string): Promise<boolean> => true,

  checkLocationReminders: async (
    latitude: number,
    longitude: number,
    _userId: string,
  ): Promise<Reminder[]> => [
    createBaseReminder({
      id: `food-${Date.now()}`,
      type: 'food',
      title: '附近美食发现',
      message: '你附近 300 米内有一家特色小吃点，可以作为当前路段后的补给选择。',
      priority: 'medium',
      data: {
        facilityId: 'facility2',
        facilityName: '山顶小吃',
        distance: 300,
      },
    }),
    createBaseReminder({
      id: `photo-${Date.now()}`,
      type: 'photo',
      title: '拍照机会',
      message: '你正处于较好的取景位置，当前光线柔和，适合补拍风景照片。',
      priority: 'high',
      data: {
        location: { latitude, longitude },
        lightingCondition: 'good',
        recommendedTime: '当前',
      },
    }),
  ],

  getWeatherReminders: async (
    _latitude: number,
    _longitude: number,
  ): Promise<Reminder[]> => {
    const weatherData = {
      condition: 'sunny',
      temperature: 25,
      forecast: 'clear',
    };

    if (weatherData.condition !== 'sunny' || weatherData.temperature <= 20) {
      return [];
    }

    return [
      createBaseReminder({
        id: `weather-${Date.now()}`,
        type: 'weather',
        title: '天气适宜',
        message: '今天天气晴朗，适合优先安排户外景点和摄影点位。',
        priority: 'medium',
        data: {
          weather: weatherData,
          outdoorAttractions: ['attraction1', 'attraction3', 'attraction6'],
        },
      }),
    ];
  },

  getCrowdReminders: async (attractionId: string): Promise<Reminder[]> => {
    const crowdData = {
      attractionId,
      crowdLevel: 'medium' as 'low' | 'medium' | 'high',
      waitTime: 15,
    };

    if (crowdData.crowdLevel === 'high') {
      return [
        createBaseReminder({
          id: `crowd-${Date.now()}`,
          type: 'crowd',
          title: '拥挤度预警',
          message: `当前点位拥挤度较高，预计等待约 ${crowdData.waitTime} 分钟，建议稍后前往。`,
          priority: 'high',
          data: crowdData,
        }),
      ];
    }

    if (crowdData.crowdLevel === 'medium') {
      return [
        createBaseReminder({
          id: `crowd-${Date.now()}`,
          type: 'crowd',
          title: '拥挤度提示',
          message: `当前点位拥挤度中等，预计等待约 ${crowdData.waitTime} 分钟，可以正常前往。`,
          priority: 'low',
          data: crowdData,
        }),
      ];
    }

    return [];
  },
};
