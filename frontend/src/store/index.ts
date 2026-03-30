import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import userReducer from './slices/userSlice';
import recommendationReducer from './slices/recommendationSlice';
import queryReducer from './slices/querySlice';
import pathPlanningReducer from './slices/pathPlanningSlice';
import diaryReducer from './slices/diarySlice';
import featureReducer from './slices/featureSlice';

const store = configureStore({
  reducer: {
    user: userReducer,
    recommendation: recommendationReducer,
    query: queryReducer,
    pathPlanning: pathPlanningReducer,
    diary: diaryReducer,
    feature: featureReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// 类型化的 Redux hooks，方便页面直接复用
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
