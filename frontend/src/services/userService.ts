import api from './api';

export interface User {
  id: string;
  username: string;
  interests?: string[];
  interestWeights?: Record<string, number>;
  favorites?: string[];
  createdAt: string;
  updatedAt?: string;
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
  register: (username: string, password: string) => Promise<RegisterResponse>;
  login: (username: string, password: string) => Promise<LoginResponse>;
  getCurrentUser: () => Promise<{ success: boolean; data: User }>;
  updateInterests: (interests: string[]) => Promise<{ success: boolean; data: { id: string; interests: string[] } }>;
  updatePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ success: boolean; data: { id: string; username: string; updatedAt: string } }>;
}

const userService: UserService = {
  register: async (username, password) =>
    api.post('/users/register', { username, password }),

  login: async (username, password) =>
    api.post('/users/login', { username, password }),

  getCurrentUser: async () => api.get('/users/me'),

  updateInterests: async (interests) => api.put('/users/interests', { interests }),

  updatePassword: async (currentPassword, newPassword) =>
    api.put('/users/password', { currentPassword, newPassword }),
};

export default userService;
