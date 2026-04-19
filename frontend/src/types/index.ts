export interface User {
  id: string;
  username: string;
  password?: string;
  createdAt: string;
  updatedAt: string;
  interests?: string[];
  interestWeights?: Record<string, number>;
  favorites?: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ScenicArea {
  id: string;
  name: string;
  description: string;
  location: string;
  rating: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attraction {
  id: string;
  name: string;
  description: string;
  scenicAreaId: string;
  category: string;
  rating: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Facility {
  id: string;
  name: string;
  type: string;
  location: string;
  description: string;
  scenicAreaId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Recommendation {
  id: string;
  type: string;
  items: ScenicArea[];
  score: number;
  createdAt: string;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface PathNode {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface PathEdge {
  id: string;
  sourceId: string;
  targetId: string;
  distance: number;
  time: number;
  transportation: string;
}

export interface Path {
  nodes: PathNode[];
  edges: PathEdge[];
  totalDistance: number;
  totalTime: number;
}

export interface PathSegment {
  from: string;
  to: string;
  distance: number;
  roadType: string;
  fromLocation: GeoPoint;
  toLocation: GeoPoint;
}

export interface PathResult {
  path: string[];
  distance: number;
  time: number;
  segments: PathSegment[];
}

export interface MultiTransportationPathResult {
  path: string[];
  distance: number;
  time: number;
  segments: Array<{
    from: string;
    to: string;
    transportation: string;
    distance: number;
    time: number;
  }>;
}

export interface Comment {
  id: string;
  diaryId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface Diary {
  id: string;
  userId: string;
  title: string;
  content: string;
  images?: string[];
  location?: string;
  isShared: boolean;
  likes?: number;
  comments?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface PhotoCheckin {
  id: string;
  userId: string;
  scenicAreaId: string;
  photoUrl: string;
  description?: string;
  createdAt: string;
}

export interface Food {
  id: string;
  name: string;
  cuisine: string;
  description: string;
  price?: number;
  popularity: number;
  averageRating: number;
  reviewCount: number;
  tags?: string[];
  isSeasonalSpecial?: boolean;
  facilityId?: string;
  facility?: {
    id: string;
    name: string;
    category?: string;
  };
}

export interface Reminder {
  id: string;
  type: 'food' | 'photo' | 'weather' | 'crowd' | 'general';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  time: string | Date;
  isRead: boolean;
  data?: Record<string, unknown>;
}
