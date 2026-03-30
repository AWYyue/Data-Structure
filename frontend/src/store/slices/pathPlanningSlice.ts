import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import pathPlanningService, { MultiPointPath, MultiPointStrategy, Path } from '../../services/pathPlanningService';
import { resolveErrorMessage } from '../../utils/errorMessage';

export interface PathPlanningState {
  shortestDistancePath: Path | null;
  shortestTimePath: Path | null;
  transportationPath: Path | null;
  multiTransportationPath: Path | null;
  multiPointPath: MultiPointPath | null;
  transportationTypes: string[];
  nearestNode: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: PathPlanningState = {
  shortestDistancePath: null,
  shortestTimePath: null,
  transportationPath: null,
  multiTransportationPath: null,
  multiPointPath: null,
  transportationTypes: [],
  nearestNode: null,
  isLoading: false,
  error: null,
};

export const getShortestDistancePath = createAsyncThunk(
  'pathPlanning/getShortestDistancePath',
  async (
    { startNodeId, endNodeId }: { startNodeId: string; endNodeId: string },
    { rejectWithValue },
  ) => {
    const fallbackMessage = '获取最短距离路线失败';
    try {
      const response = await pathPlanningService.getShortestDistancePath(startNodeId, endNodeId);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const getShortestTimePath = createAsyncThunk(
  'pathPlanning/getShortestTimePath',
  async (
    { startNodeId, endNodeId }: { startNodeId: string; endNodeId: string },
    { rejectWithValue },
  ) => {
    const fallbackMessage = '获取最短时间路线失败';
    try {
      const response = await pathPlanningService.getShortestTimePath(startNodeId, endNodeId);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const getPathByTransportation = createAsyncThunk(
  'pathPlanning/getPathByTransportation',
  async (
    {
      startNodeId,
      endNodeId,
      transportation,
    }: { startNodeId: string; endNodeId: string; transportation: string },
    { rejectWithValue },
  ) => {
    const fallbackMessage = '获取导航路线失败';
    try {
      const response = await pathPlanningService.getPathByTransportation(
        startNodeId,
        endNodeId,
        transportation,
      );
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const planAdvancedRoute = createAsyncThunk(
  'pathPlanning/planAdvancedRoute',
  async (
    {
      startNodeId,
      endNodeId,
      strategy,
      transportations,
    }: { startNodeId: string; endNodeId: string; strategy: MultiPointStrategy; transportations: string[] },
    { rejectWithValue },
  ) => {
    const fallbackMessage = '获取高级导航路线失败';
    try {
      const response = await pathPlanningService.planAdvancedRoute(
        startNodeId,
        endNodeId,
        strategy,
        transportations,
      );
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const getMultiTransportationPath = createAsyncThunk(
  'pathPlanning/getMultiTransportationPath',
  async (
    { startNodeId, endNodeId }: { startNodeId: string; endNodeId: string },
    { rejectWithValue },
  ) => {
    const fallbackMessage = '获取多交通方式路线失败';
    try {
      const response = await pathPlanningService.getMultiTransportationPath(startNodeId, endNodeId);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const getAvailableTransportationTypes = createAsyncThunk(
  'pathPlanning/getAvailableTransportationTypes',
  async (_, { rejectWithValue }) => {
    const fallbackMessage = '获取交通方式列表失败';
    try {
      const response = await pathPlanningService.getAvailableTransportationTypes();
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const findNearestNode = createAsyncThunk(
  'pathPlanning/findNearestNode',
  async ({ latitude, longitude }: { latitude: number; longitude: number }, { rejectWithValue }) => {
    const fallbackMessage = '查找最近节点失败';
    try {
      const response = await pathPlanningService.findNearestNode(latitude, longitude);
      if (response.success) {
        return response.data.nodeId;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const optimizeMultiPointPath = createAsyncThunk(
  'pathPlanning/optimizeMultiPointPath',
  async (
    { nodeIds, strategy, transportations }: { nodeIds: string[]; strategy: MultiPointStrategy; transportations?: string[] },
    { rejectWithValue },
  ) => {
    const fallbackMessage = '生成多目标点最优路线失败';
    try {
      const response = await pathPlanningService.optimizeMultiPointPath(nodeIds, strategy, transportations);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

const pathPlanningSlice = createSlice({
  name: 'pathPlanning',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearPaths: (state) => {
      state.shortestDistancePath = null;
      state.shortestTimePath = null;
      state.transportationPath = null;
      state.multiTransportationPath = null;
      state.multiPointPath = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getShortestDistancePath.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getShortestDistancePath.fulfilled, (state, action) => {
        state.isLoading = false;
        state.shortestDistancePath = action.payload;
      })
      .addCase(getShortestDistancePath.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(getShortestTimePath.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getShortestTimePath.fulfilled, (state, action) => {
        state.isLoading = false;
        state.shortestTimePath = action.payload;
      })
      .addCase(getShortestTimePath.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(getPathByTransportation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getPathByTransportation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.transportationPath = action.payload;
      })
      .addCase(getPathByTransportation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(planAdvancedRoute.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(planAdvancedRoute.fulfilled, (state, action) => {
        state.isLoading = false;
        state.transportationPath = action.payload;
      })
      .addCase(planAdvancedRoute.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(getMultiTransportationPath.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getMultiTransportationPath.fulfilled, (state, action) => {
        state.isLoading = false;
        state.multiTransportationPath = action.payload;
      })
      .addCase(getMultiTransportationPath.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(getAvailableTransportationTypes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAvailableTransportationTypes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.transportationTypes = action.payload;
      })
      .addCase(getAvailableTransportationTypes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(findNearestNode.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(findNearestNode.fulfilled, (state, action) => {
        state.isLoading = false;
        state.nearestNode = action.payload;
      })
      .addCase(findNearestNode.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(optimizeMultiPointPath.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(optimizeMultiPointPath.fulfilled, (state, action) => {
        state.isLoading = false;
        state.multiPointPath = action.payload;
      })
      .addCase(optimizeMultiPointPath.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearPaths } = pathPlanningSlice.actions;
export default pathPlanningSlice.reducer;
