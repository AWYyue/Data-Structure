import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { featureService } from '../../services/featureService';
import type { Food, Reminder } from '../../types';
import { resolveErrorMessage } from '../../utils/errorMessage';

export interface FeatureState {
  recommendedFood: Food[];
  foodRoute: {
    route: Food[];
    totalDistance: number;
    estimatedTime: number;
  } | null;
  reminders: Reminder[];
  loading: boolean;
  error: string | null;
}

const initialState: FeatureState = {
  recommendedFood: [],
  foodRoute: null,
  reminders: [],
  loading: false,
  error: null,
};

export const createPhotoCheckin = createAsyncThunk(
  'feature/createPhotoCheckin',
  async (
    data: {
      attractionId: string;
      photoUrl: string;
      location: { latitude: number; longitude: number };
      description?: string;
    },
    { rejectWithValue },
  ) => {
    const fallbackMessage = '创建摄影打卡失败';

    try {
      const response = await featureService.createPhotoCheckin(data);
      if (response.success) {
        return response;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const getFoodRecommendations = createAsyncThunk(
  'feature/getFoodRecommendations',
  async (limit: number | undefined, { rejectWithValue }) => {
    const fallbackMessage = '获取推荐美食失败';

    try {
      const response = await featureService.getFoodRecommendations(limit);
      if (response.success) {
        return response;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const getFoodRoute = createAsyncThunk(
  'feature/getFoodRoute',
  async (
    params: { startLocation: { latitude: number; longitude: number }; duration: number },
    { rejectWithValue },
  ) => {
    const fallbackMessage = '获取美食路线失败';

    try {
      const response = await featureService.getFoodRoute(params.startLocation, params.duration);
      if (response.success) {
        return response;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const getPersonalizedReminders = createAsyncThunk(
  'feature/getPersonalizedReminders',
  async (_, { rejectWithValue }) => {
    const fallbackMessage = '获取个性提醒失败';

    try {
      const response = await featureService.getPersonalizedReminders();
      if (response.success) {
        return response;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

const featureSlice = createSlice({
  name: 'feature',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createPhotoCheckin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPhotoCheckin.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createPhotoCheckin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(
        getFoodRecommendations.fulfilled,
        (state, action: PayloadAction<{ success: boolean; data: Food[] }>) => {
          state.loading = false;
          state.recommendedFood = action.payload.data;
        },
      )
      .addCase(getFoodRecommendations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFoodRecommendations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(
        getFoodRoute.fulfilled,
        (
          state,
          action: PayloadAction<{
            success: boolean;
            data: { route: Food[]; totalDistance: number; estimatedTime: number };
          }>,
        ) => {
          state.loading = false;
          state.foodRoute = action.payload.data;
        },
      )
      .addCase(getFoodRoute.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFoodRoute.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(
        getPersonalizedReminders.fulfilled,
        (state, action: PayloadAction<{ success: boolean; data: Reminder[] }>) => {
          state.loading = false;
          state.reminders = action.payload.data;
        },
      )
      .addCase(getPersonalizedReminders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPersonalizedReminders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default featureSlice.reducer;
