import api from './api';

export interface Diary {
  id: string;
  userId: string;
  title: string;
  content: string;
  destination?: string;
  visitDate?: string;
  route?: string[];
  popularity: number;
  averageRating: number;
  reviewCount: number;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
  };
  comments?: DiaryComment[];
}

export interface DiaryComment {
  id: string;
  diaryId: string;
  userId: string;
  content: string;
  rating?: number;
  createdAt: string;
  user?: {
    id: string;
    username: string;
  };
}

export type DiarySearchMode = 'any' | 'all';
export type AnimationPhotoInput = { url: string };
type DiaryEnvelope<T> = { success: boolean; data: T };
type DiaryDeleteResponse = { success: boolean; message: string };

export interface DiaryService {
  createDiary: (
    title: string,
    content: string,
    destination?: string,
    visitDate?: string,
    route?: string[],
    isShared?: boolean,
  ) => Promise<DiaryEnvelope<Diary>>;
  getDiaryById: (id: string) => Promise<DiaryEnvelope<Diary>>;
  getUserDiaries: (userId: string, limit?: number, offset?: number) => Promise<DiaryEnvelope<Diary[]>>;
  getSharedDiaries: (limit?: number, offset?: number) => Promise<DiaryEnvelope<Diary[]>>;
  getSharedDiaryPopularityRanking: (limit?: number, offset?: number) => Promise<DiaryEnvelope<Diary[]>>;
  getSharedDiaryRatingRanking: (limit?: number, offset?: number) => Promise<DiaryEnvelope<Diary[]>>;
  updateDiary: (
    id: string,
    title?: string,
    content?: string,
    destination?: string,
    visitDate?: string,
    route?: string[],
    isShared?: boolean,
  ) => Promise<DiaryEnvelope<Diary>>;
  deleteDiary: (id: string) => Promise<DiaryDeleteResponse>;
  shareDiary: (id: string) => Promise<DiaryEnvelope<Diary>>;
  addComment: (diaryId: string, content: string, rating?: number) => Promise<DiaryEnvelope<DiaryComment>>;
  getDiaryComments: (diaryId: string, limit?: number, offset?: number) => Promise<DiaryEnvelope<DiaryComment[]>>;
  searchDiaries: (query: string, limit?: number, mode?: DiarySearchMode) => Promise<DiaryEnvelope<Diary[]>>;
  searchDiariesByDestination: (destination: string, limit?: number) => Promise<DiaryEnvelope<Diary[]>>;
  searchDiariesByExactTitle: (title: string, limit?: number) => Promise<DiaryEnvelope<Diary[]>>;
  generateAnimation: (
    photos: AnimationPhotoInput[],
    description: string,
  ) => Promise<DiaryEnvelope<{ animationUrl: string }>>;
}

const buildQueryString = (params: Record<string, string | number | undefined>): string => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') {
      return;
    }
    query.set(key, String(value));
  });

  return query.toString();
};

const getSharedDiaryPool = async (limit: number, offset: number): Promise<DiaryEnvelope<Diary[]>> => {
  const expandedLimit = Math.max(limit * 3, limit + offset);
  return api.get(`/diaries/shared/list?${buildQueryString({ limit: expandedLimit, offset: 0 })}`);
};

const diaryService: DiaryService = {
  createDiary: async (title, content, destination, visitDate, route, isShared) =>
    api.post('/diaries', { title, content, destination, visitDate, route, isShared }),

  getDiaryById: async (id) => api.get(`/diaries/${id}`),

  getUserDiaries: async (userId, limit = 10, offset = 0) =>
    api.get(`/diaries/user/${userId}?${buildQueryString({ limit, offset })}`),

  getSharedDiaries: async (limit = 10, offset = 0) =>
    api.get(`/diaries/shared/list?${buildQueryString({ limit, offset })}`),

  getSharedDiaryPopularityRanking: async (limit = 10, offset = 0) => {
    const response = await getSharedDiaryPool(limit, offset);
    return {
      success: true,
      data: [...(response.data || [])]
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(offset, offset + limit),
    };
  },

  getSharedDiaryRatingRanking: async (limit = 10, offset = 0) => {
    const response = await getSharedDiaryPool(limit, offset);
    return {
      success: true,
      data: [...(response.data || [])]
        .sort(
          (a, b) =>
            (b.averageRating || 0) - (a.averageRating || 0) ||
            (b.reviewCount || 0) - (a.reviewCount || 0),
        )
        .slice(offset, offset + limit),
    };
  },

  updateDiary: async (id, title, content, destination, visitDate, route, isShared) =>
    api.put(`/diaries/${id}`, { title, content, destination, visitDate, route, isShared }),

  deleteDiary: async (id) => api.delete(`/diaries/${id}`),

  shareDiary: async (id) => api.post(`/diaries/${id}/share`),

  addComment: async (diaryId, content, rating) =>
    api.post(`/diaries/${diaryId}/comments`, { content, rating }),

  getDiaryComments: async (diaryId, limit = 20, offset = 0) =>
    api.get(`/diaries/${diaryId}/comments?${buildQueryString({ limit, offset })}`),

  searchDiaries: async (query, limit = 10, mode = 'any') =>
    api.get(`/diaries/search/query?${buildQueryString({ query, limit, mode })}`),

  searchDiariesByDestination: async (destination, limit = 10) =>
    api.get(`/diaries/search/destination?${buildQueryString({ destination, limit })}`),

  searchDiariesByExactTitle: async (title, limit = 10) => {
    const response: DiaryEnvelope<Diary[]> = await api.get(
      `/diaries/search/query?${buildQueryString({ query: title, limit: Math.max(limit * 3, limit), mode: 'all' })}`,
    );
    const normalizedTitle = title.trim().toLowerCase();

    return {
      success: true,
      data: (response.data || [])
        .filter((item) => item.title?.trim().toLowerCase() === normalizedTitle)
        .slice(0, limit),
    };
  },

  generateAnimation: async (photos, description) =>
    api.post('/diaries/generate-animation', { photos, description }),
};

export default diaryService;
