import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import userService, { User } from '../../services/userService';
import { clearStoredAuth, getStoredUserSnapshot } from '../../utils/authStorage';
import { resolveErrorMessage } from '../../utils/errorMessage';

const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '[object Object]') {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // 回退到分隔符解析
    }

    return trimmed
      .replace(/^\[|\]$/g, '')
      .split(/[,\uFF0C|]/)
      .map((item) => item.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }

  return [];
};

const normalizeUser = (user: User | null): User | null => {
  if (!user) {
    return null;
  }

  return {
    ...user,
    interests: normalizeStringArray(user.interests),
    favorites: normalizeStringArray(user.favorites),
  };
};

const getStoredUser = (): User | null => {
  return normalizeUser(getStoredUserSnapshot<User>());
};

export interface UserState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: UserState = {
  user: getStoredUser(),
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem('token'),
};

export const login = createAsyncThunk(
  'user/login',
  async ({ username, password }: { username: string; password: string }, { rejectWithValue }) => {
    const fallbackMessage = '登录失败';
    try {
      const response = await userService.login(username, password);
      if (response.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const register = createAsyncThunk(
  'user/register',
  async (
    { username, email, password }: { username: string; email: string; password: string },
    { rejectWithValue },
  ) => {
    const fallbackMessage = '注册失败';
    try {
      const response = await userService.register(username, email, password);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const getCurrentUser = createAsyncThunk(
  'user/getCurrentUser',
  async (_, { rejectWithValue }) => {
    const fallbackMessage = '获取用户信息失败';
    try {
      const response = await userService.getCurrentUser();
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const updateInterests = createAsyncThunk(
  'user/updateInterests',
  async (interests: string[], { rejectWithValue }) => {
    const fallbackMessage = '更新兴趣偏好失败';
    try {
      const response = await userService.updateInterests(interests);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    logout: (state) => {
      clearStoredAuth();
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        const normalizedUser = normalizeUser(action.payload.user);
        state.isLoading = false;
        state.user = normalizedUser;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        localStorage.setItem('user', JSON.stringify(normalizedUser));
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        const normalizedUser = normalizeUser(action.payload);
        state.isLoading = false;
        state.user = normalizedUser;
        state.isAuthenticated = true;
        localStorage.setItem('user', JSON.stringify(normalizedUser));
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        if (!state.user) {
          state.user = getStoredUser();
        }
        state.isAuthenticated = Boolean(state.token);
      })
      .addCase(updateInterests.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateInterests.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.user) {
          state.user.interests = normalizeStringArray(action.payload.interests);
          localStorage.setItem('user', JSON.stringify(state.user));
        }
      })
      .addCase(updateInterests.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, clearError } = userSlice.actions;
export default userSlice.reducer;
