import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import diaryService, { Diary, DiaryComment } from '../../services/diaryService';
import { resolveErrorMessage } from '../../utils/errorMessage';

export interface DiaryState {
  diaries: Diary[];
  currentDiary: Diary | null;
  comments: DiaryComment[];
  isLoading: boolean;
  error: string | null;
}

const initialState: DiaryState = {
  diaries: [],
  currentDiary: null,
  comments: [],
  isLoading: false,
  error: null,
};

export const createDiary = createAsyncThunk(
  'diary/createDiary',
  async (
    {
      title,
      content,
      destination,
      visitDate,
      route,
      imageUrls,
      videoUrls,
      isShared,
    }: {
      title: string;
      content: string;
      destination?: string;
      visitDate?: string;
      route?: string[];
      imageUrls?: string[];
      videoUrls?: string[];
      isShared?: boolean;
    },
    { rejectWithValue },
  ) => {
    const fallbackMessage = '创建日记失败';
    try {
      const response = await diaryService.createDiary(
        title,
        content,
        destination,
        visitDate,
        route,
        imageUrls,
        videoUrls,
        isShared,
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

export const getDiaryById = createAsyncThunk(
  'diary/getDiaryById',
  async (id: string, { rejectWithValue }) => {
    const fallbackMessage = '获取日记详情失败';
    try {
      const response = await diaryService.getDiaryById(id);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const getUserDiaries = createAsyncThunk(
  'diary/getUserDiaries',
  async (
    { userId, limit, offset }: { userId: string; limit?: number; offset?: number },
    { rejectWithValue },
  ) => {
    const fallbackMessage = '获取我的日记失败';
    try {
      const response = await diaryService.getUserDiaries(userId, limit, offset);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const getSharedDiaries = createAsyncThunk(
  'diary/getSharedDiaries',
  async ({ limit, offset }: { limit?: number; offset?: number }, { rejectWithValue }) => {
    const fallbackMessage = '获取公开日记失败';
    try {
      const response = await diaryService.getSharedDiaries(limit, offset);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const updateDiary = createAsyncThunk(
  'diary/updateDiary',
  async (
    {
      id,
      title,
      content,
      destination,
      visitDate,
      route,
      imageUrls,
      videoUrls,
      isShared,
    }: {
      id: string;
      title?: string;
      content?: string;
      destination?: string;
      visitDate?: string;
      route?: string[];
      imageUrls?: string[];
      videoUrls?: string[];
      isShared?: boolean;
    },
    { rejectWithValue },
  ) => {
    const fallbackMessage = '更新日记失败';
    try {
      const response = await diaryService.updateDiary(
        id,
        title,
        content,
        destination,
        visitDate,
        route,
        imageUrls,
        videoUrls,
        isShared,
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

export const deleteDiary = createAsyncThunk(
  'diary/deleteDiary',
  async (id: string, { rejectWithValue }) => {
    const fallbackMessage = '删除日记失败';
    try {
      const response = await diaryService.deleteDiary(id);
      if (response.success) {
        return id;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const shareDiary = createAsyncThunk(
  'diary/shareDiary',
  async (id: string, { rejectWithValue }) => {
    const fallbackMessage = '分享日记失败';
    try {
      const response = await diaryService.shareDiary(id);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const addComment = createAsyncThunk(
  'diary/addComment',
  async (
    { diaryId, content, rating }: { diaryId: string; content: string; rating?: number },
    { rejectWithValue },
  ) => {
    const fallbackMessage = '发表评论失败';
    try {
      const response = await diaryService.addComment(diaryId, content, rating);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const getDiaryComments = createAsyncThunk(
  'diary/getDiaryComments',
  async (
    { diaryId, limit, offset }: { diaryId: string; limit?: number; offset?: number },
    { rejectWithValue },
  ) => {
    const fallbackMessage = '获取评论失败';
    try {
      const response = await diaryService.getDiaryComments(diaryId, limit, offset);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const searchDiaries = createAsyncThunk(
  'diary/searchDiaries',
  async ({ query, limit }: { query: string; limit?: number }, { rejectWithValue }) => {
    const fallbackMessage = '搜索日记失败';
    try {
      const response = await diaryService.searchDiaries(query, limit);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

export const searchDiariesByDestination = createAsyncThunk(
  'diary/searchDiariesByDestination',
  async (
    { destination, limit }: { destination: string; limit?: number },
    { rejectWithValue },
  ) => {
    const fallbackMessage = '按目的地搜索日记失败';
    try {
      const response = await diaryService.searchDiariesByDestination(destination, limit);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(fallbackMessage);
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, fallbackMessage));
    }
  },
);

const diarySlice = createSlice({
  name: 'diary',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentDiary: (state) => {
      state.currentDiary = null;
    },
    clearComments: (state) => {
      state.comments = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createDiary.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createDiary.fulfilled, (state, action) => {
        state.isLoading = false;
        state.diaries.unshift(action.payload);
      })
      .addCase(createDiary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(getDiaryById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getDiaryById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentDiary = action.payload;
      })
      .addCase(getDiaryById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(getUserDiaries.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getUserDiaries.fulfilled, (state, action) => {
        state.isLoading = false;
        state.diaries = action.payload;
      })
      .addCase(getUserDiaries.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(getSharedDiaries.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getSharedDiaries.fulfilled, (state, action) => {
        state.isLoading = false;
        state.diaries = action.payload;
      })
      .addCase(getSharedDiaries.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateDiary.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateDiary.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.diaries.findIndex((diary) => diary.id === action.payload.id);
        if (index !== -1) {
          state.diaries[index] = action.payload;
        }
        if (state.currentDiary?.id === action.payload.id) {
          state.currentDiary = action.payload;
        }
      })
      .addCase(updateDiary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteDiary.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteDiary.fulfilled, (state, action) => {
        state.isLoading = false;
        state.diaries = state.diaries.filter((diary) => diary.id !== action.payload);
        if (state.currentDiary?.id === action.payload) {
          state.currentDiary = null;
        }
      })
      .addCase(deleteDiary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(shareDiary.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(shareDiary.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.diaries.findIndex((diary) => diary.id === action.payload.id);
        if (index !== -1) {
          state.diaries[index] = action.payload;
        }
        if (state.currentDiary?.id === action.payload.id) {
          state.currentDiary = action.payload;
        }
      })
      .addCase(shareDiary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(addComment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.comments.unshift(action.payload);
        if (state.currentDiary) {
          if (!state.currentDiary.comments) {
            state.currentDiary.comments = [];
          }
          state.currentDiary.comments.unshift(action.payload);
          state.currentDiary.reviewCount += 1;
        }
      })
      .addCase(addComment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(getDiaryComments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getDiaryComments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.comments = action.payload;
      })
      .addCase(getDiaryComments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(searchDiaries.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchDiaries.fulfilled, (state, action) => {
        state.isLoading = false;
        state.diaries = action.payload;
      })
      .addCase(searchDiaries.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(searchDiariesByDestination.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchDiariesByDestination.fulfilled, (state, action) => {
        state.isLoading = false;
        state.diaries = action.payload;
      })
      .addCase(searchDiariesByDestination.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCurrentDiary, clearComments } = diarySlice.actions;
export default diarySlice.reducer;
