import api from './api';

export interface User {
  id: string;
  username: string;
  email: string;
  interests?: string[];
  interestWeights?: Record<string, number>;
  favorites?: string[];
  createdAt: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
}

export interface RegisterResponse {
  success: boolean;
  data: User;
}

export interface UserService {
  register: (username: string, email: string, password: string) => Promise<RegisterResponse>;
  login: (username: string, password: string) => Promise<LoginResponse>;
  getCurrentUser: () => Promise<{ success: boolean; data: User }>;
  updateInterests: (interests: string[]) => Promise<{ success: boolean; data: { id: string; interests: string[] } }>;
}

const userService: UserService = {
  register: async (username, email, password) =>
    api.post('/users/register', { username, email, password }),

  login: async (username, password) =>
    api.post('/users/login', { username, password }),

  getCurrentUser: async () => api.get('/users/me'),

  updateInterests: async (interests) => api.put('/users/interests', { interests }),
};

export default userService;
