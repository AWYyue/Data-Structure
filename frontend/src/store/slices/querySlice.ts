import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import queryService, {
  Attraction,
  Facility,
  ScenicArea,
  SearchResult,
} from '../../services/queryService';
import { resolveErrorMessage } from '../../utils/errorMessage';

export interface QueryState {
  scenicAreas: ScenicArea[];
  facilities: Facility[];
  foods: Attraction[];
  searchResult: SearchResult | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: QueryState = {
  scenicAreas: [],
  facilities: [],
  foods: [],
  searchResult: null,
  isLoading: false,
  error: null,
};

export const searchScenicAreas = createAsyncThunk(
  'query/searchScenicAreas',
  async ({ query, limit }: { query: string; limit?: number }, { rejectWithValue }) => {
    const fallbackMessage = '搜索景区失败';
    try {
      const response = await queryService.searchScenicAreas(query, limit);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const searchFacilities = createAsyncThunk(
  'query/searchFacilities',
  async (
    {
      type,
      scenicAreaId,
      limit,
      latitude,
      longitude,
      radiusKm,
    }: {
      type?: string;
      scenicAreaId?: string;
      limit?: number;
      latitude?: number;
      longitude?: number;
      radiusKm?: number;
    },
    { rejectWithValue },
  ) => {
    const fallbackMessage = '搜索设施失败';
    try {
      const response = await queryService.searchFacilities({
        type,
        scenicAreaId,
        limit,
        latitude,
        longitude,
        radiusKm,
      });
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const searchFood = createAsyncThunk(
  'query/searchFood',
  async ({ query, limit }: { query: string; limit?: number }, { rejectWithValue }) => {
    const fallbackMessage = '搜索美食失败';
    try {
      const response = await queryService.searchFood(query, limit);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const search = createAsyncThunk(
  'query/search',
  async ({ query, limit }: { query: string; limit?: number }, { rejectWithValue }) => {
    const fallbackMessage = '综合搜索失败';
    try {
      const response = await queryService.search(query, limit);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const searchScenicAreasByCategory = createAsyncThunk(
  'query/searchScenicAreasByCategory',
  async ({ category, limit }: { category: string; limit?: number }, { rejectWithValue }) => {
    const fallbackMessage = '按分类搜索景区失败';
    try {
      const response = await queryService.searchScenicAreasByCategory(category, limit);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const searchScenicAreasByTag = createAsyncThunk(
  'query/searchScenicAreasByTag',
  async ({ tag, limit }: { tag: string; limit?: number }, { rejectWithValue }) => {
    const fallbackMessage = '按标签搜索景区失败';
    try {
      const response = await queryService.searchScenicAreasByTag(tag, limit);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

const querySlice = createSlice({
  name: 'query',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSearchResult: (state) => {
      state.searchResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchScenicAreas.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchScenicAreas.fulfilled, (state, action) => {
        state.isLoading = false;
        state.scenicAreas = action.payload;
      })
      .addCase(searchScenicAreas.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(searchFacilities.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchFacilities.fulfilled, (state, action) => {
        state.isLoading = false;
        state.facilities = action.payload;
      })
      .addCase(searchFacilities.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(searchFood.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchFood.fulfilled, (state, action) => {
        state.isLoading = false;
        state.foods = action.payload;
      })
      .addCase(searchFood.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(search.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(search.fulfilled, (state, action) => {
        state.isLoading = false;
        state.searchResult = action.payload;
      })
      .addCase(search.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(searchScenicAreasByCategory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchScenicAreasByCategory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.scenicAreas = action.payload;
      })
      .addCase(searchScenicAreasByCategory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(searchScenicAreasByTag.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchScenicAreasByTag.fulfilled, (state, action) => {
        state.isLoading = false;
        state.scenicAreas = action.payload;
      })
      .addCase(searchScenicAreasByTag.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSearchResult } = querySlice.actions;
export default querySlice.reducer;
