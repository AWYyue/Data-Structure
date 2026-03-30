import React, { useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  Avatar,
  Button,
  ConfigProvider,
  Drawer,
  Input,
  Layout,
  Menu,
  Space,
  Spin,
  Switch,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  AimOutlined,
  BookOutlined,
  CompassOutlined,
  EnvironmentOutlined,
  GiftOutlined,
  HomeOutlined,
  MenuOutlined,
  NotificationOutlined,
  SearchOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { BrowserRouter as Router, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './store';
import { getCurrentUser, logout } from './store/slices/userSlice';

const HomePage = React.lazy(() => import('./pages/HomePage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const JourneyPlannerPage = React.lazy(() => import('./pages/JourneyPlannerPage'));
const PathPlanningPage = React.lazy(() => import('./pages/PathPlanningPage'));
const QueryPage = React.lazy(() => import('./pages/QueryPage'));
const ScenicOverviewPage = React.lazy(() => import('./pages/ScenicOverviewPage'));
const DiaryPage = React.lazy(() => import('./pages/DiaryPage'));
const ScenicAreaDetailPage = React.lazy(() => import('./pages/ScenicAreaDetailPage'));
const IndoorNavigationPage = React.lazy(() => import('./pages/IndoorNavigationPage'));
const FoodRecommendationPage = React.lazy(() => import('./pages/FoodRecommendationPage'));
const ReminderPage = React.lazy(() => import('./pages/ReminderPage'));
const SocialPage = React.lazy(() => import('./pages/SocialPage'));
const AchievementPage = React.lazy(() => import('./pages/AchievementPage'));

import './App.css';

const { Header, Content, Footer, Sider } = Layout;
const { Text } = Typography;

type ColorMode = 'light' | 'dark';

const routeKeyMap: Record<string, string> = {
  '/': 'home',
  '/journey': 'journey',
  '/path-planning': 'path',
  '/indoor-navigation': 'indoor',
  '/query': 'query',
  '/scenic-overview': 'overview',
  '/diary': 'diary',
  '/reminder': 'reminder',
  '/social': 'social',
  '/achievement': 'achievement',
};

const routeMetaMap: Record<string, { title: string; subtitle: string }> = {
  home: { title: '首页总览', subtitle: '从推荐、榜单和主流程入口开始。' },
  journey: { title: '智能行程', subtitle: '兴趣采集、目的地推荐与一日计划。' },
  query: { title: '景区与设施查询', subtitle: '把景区、设施、美食检索放在一个工作区里。' },
  overview: { title: '景区总览', subtitle: '承接首页推荐更多，集中浏览前十推荐与更多目的地。' },
  path: { title: '户外路径规划', subtitle: '衔接景区上下文与分段导航执行。' },
  indoor: { title: '室内导航', subtitle: '入口到房间、楼层切换与室内路径展示。' },
  diary: { title: '旅行日记', subtitle: '内容沉浸、社区浏览、全文检索与 AIGC 动画。' },
  reminder: { title: '个性提醒', subtitle: '天气、人流、弱网和行程提醒的集中入口。' },
  social: { title: '社交互动', subtitle: '热点、附近游客、组队和签到打卡。' },
  achievement: { title: '成就系统', subtitle: '进度累计、解锁记录与行为反馈。' },
};

const AppLoadingFallback: React.FC = () => (
  <div className="app-loading-fallback">
    <Spin size="large" />
    <div>页面加载中...</div>
  </div>
);

const AppShell: React.FC = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, isLoading } = useAppSelector((state) => state.user);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mode, setMode] = useState<ColorMode>(() => (localStorage.getItem('color-mode') === 'dark' ? 'dark' : 'light'));

  useEffect(() => {
    if (token && !user && !isLoading) {
      void dispatch(getCurrentUser());
    }
  }, [dispatch, isLoading, token, user]);

  const selectedKey = useMemo(() => {
    const direct = routeKeyMap[location.pathname];
    if (direct) {
      return direct;
    }
    if (location.pathname.startsWith('/scenic-area/') || location.pathname.startsWith('/food-recommendation/')) {
      return 'query';
    }
    return 'home';
  }, [location.pathname]);

  const currentMeta = routeMetaMap[selectedKey] || routeMetaMap.home;
  const menuSelectedKey = selectedKey === 'overview' ? 'query' : selectedKey;
  const needsOnboarding = Boolean(user && (!user.interests || user.interests.length === 0));
  const authLanding = needsOnboarding ? '/journey' : '/';

  const handleLogout = () => {
    dispatch(logout());
    setMobileMenuOpen(false);
    navigate('/login', { replace: true });
  };

  const menuItems: MenuProps['items'] = [
    { key: 'home', icon: <HomeOutlined />, label: <Link to="/">首页</Link> },
    { key: 'journey', icon: <CompassOutlined />, label: <Link to="/journey">智能行程</Link> },
    { key: 'query', icon: <EnvironmentOutlined />, label: <Link to="/query">景区与设施</Link> },
    { key: 'path', icon: <AimOutlined />, label: <Link to="/path-planning">路线规划</Link> },
    { key: 'indoor', icon: <GiftOutlined />, label: <Link to="/indoor-navigation">室内导航</Link> },
    { key: 'diary', icon: <BookOutlined />, label: <Link to="/diary">旅行日记</Link> },
    { key: 'reminder', icon: <NotificationOutlined />, label: <Link to="/reminder">个性提醒</Link> },
    { key: 'social', icon: <TeamOutlined />, label: <Link to="/social">社交互动</Link> },
    { key: 'achievement', icon: <TrophyOutlined />, label: <Link to="/achievement">成就系统</Link> },
  ];

  const appTheme = useMemo(() => {
    const darkMode = mode === 'dark';
    return {
      algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        colorPrimary: '#6d5dfc',
        borderRadius: 14,
        colorBgLayout: darkMode ? '#09111f' : '#eef3fb',
        colorTextBase: darkMode ? '#e2e8f0' : '#0f172a',
        fontFamily: '"Space Grotesk", "Manrope", "Noto Sans SC", "Segoe UI", sans-serif',
      },
      components: {
        Layout: {
          headerBg: darkMode ? '#0b1524' : '#ffffff',
          bodyBg: darkMode ? '#09111f' : '#eef3fb',
          siderBg: darkMode ? '#08101b' : '#0c1730',
        },
        Menu: {
          itemBorderRadius: 12,
          activeBarBorderWidth: 0,
        },
      },
    } as const;
  }, [mode]);

  return (
    <ConfigProvider theme={appTheme}>
      <AntdApp>
        <Layout className="app-shell-root">
          <Sider width={244} className="app-sider desktop-only">
            <div className="app-brand-card">
              <div className="app-brand-mark">旅</div>
              <div>
                <div className="app-brand-title">个性化旅游系统</div>
                <div className="app-brand-subtitle">推荐、导航、记录一体化</div>
              </div>
            </div>

            <Menu mode="inline" selectedKeys={[menuSelectedKey]} items={menuItems} className="sidebar-menu" />

            <div className="sidebar-footer">
              {user ? (
                <div className="sidebar-user-card">
                  <Space align="center">
                    <Avatar size={42} icon={<UserOutlined />} />
                    <div>
                      <div className="sidebar-user-name">{user.username || '当前用户'}</div>
                      <div className="sidebar-user-subtitle">{needsOnboarding ? '待完善兴趣画像' : '个性化服务已开启'}</div>
                    </div>
                  </Space>
                  <Button danger block onClick={handleLogout}>
                    退出登录
                  </Button>
                </div>
              ) : (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button type="primary" block onClick={() => navigate('/login')}>
                    登录
                  </Button>
                  <Button block onClick={() => navigate('/register')}>
                    注册
                  </Button>
                </Space>
              )}
            </div>
          </Sider>

          <Layout className="app-workspace">
            <Header className="workspace-header">
              <div className="workspace-header-left">
                <div className="mobile-only">
                  <Button icon={<MenuOutlined />} type="text" onClick={() => setMobileMenuOpen(true)} />
                </div>
                <div>
                  <div className="workspace-title">{currentMeta.title}</div>
                  <div className="workspace-subtitle">{currentMeta.subtitle}</div>
                </div>
              </div>

              <div className="workspace-header-right">
                <div className="desktop-only workspace-search">
                  <Input prefix={<SearchOutlined />} placeholder="搜索景区、设施、美食、旅行日记" allowClear />
                </div>
                <Tooltip title={mode === 'dark' ? '切换为浅色模式' : '切换为深色模式'}>
                  <Switch
                    checked={mode === 'dark'}
                    onChange={(checked) => {
                      const nextMode: ColorMode = checked ? 'dark' : 'light';
                      setMode(nextMode);
                      localStorage.setItem('color-mode', nextMode);
                    }}
                  />
                </Tooltip>
                <div className="header-user-chip">
                  <Avatar size={34} icon={<UserOutlined />} />
                  <div className="desktop-only">
                    <div className="header-user-name">{user?.username || '访客'}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {user ? (needsOnboarding ? '待完成兴趣设置' : '已登录') : '未登录'}
                    </Text>
                  </div>
                </div>
              </div>
            </Header>

            <Drawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} placement="left" title="个性化旅游系统">
              <Menu mode="vertical" selectedKeys={[menuSelectedKey]} items={menuItems} onClick={() => setMobileMenuOpen(false)} />
              <div style={{ marginTop: 16 }}>
                {user ? (
                  <Button danger block onClick={handleLogout}>
                    退出登录
                  </Button>
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button type="primary" block onClick={() => navigate('/login')}>
                      登录
                    </Button>
                    <Button block onClick={() => navigate('/register')}>
                      注册
                    </Button>
                  </Space>
                )}
              </div>
            </Drawer>

            <Content className="workspace-content">
              <React.Suspense fallback={<AppLoadingFallback />}>
                <Routes>
                  <Route path="/" element={needsOnboarding ? <Navigate to="/journey" replace /> : <HomePage />} />
                  <Route path="/login" element={user ? <Navigate to={authLanding} replace /> : <LoginPage />} />
                  <Route path="/register" element={user ? <Navigate to={authLanding} replace /> : <RegisterPage />} />
                  <Route path="/journey" element={user ? <JourneyPlannerPage /> : <Navigate to="/login" replace />} />
                  <Route path="/path-planning" element={<PathPlanningPage />} />
                  <Route path="/query" element={<QueryPage />} />
                  <Route path="/scenic-overview" element={<ScenicOverviewPage />} />
                  <Route path="/diary" element={<DiaryPage />} />
                  <Route path="/scenic-area/:id" element={<ScenicAreaDetailPage />} />
                  <Route path="/indoor-navigation" element={<IndoorNavigationPage />} />
                  <Route path="/food-recommendation/:scenicAreaId" element={<FoodRecommendationPage />} />
                  <Route path="/reminder" element={<ReminderPage />} />
                  <Route path="/social" element={<SocialPage />} />
                  <Route path="/achievement" element={<AchievementPage />} />
                </Routes>
              </React.Suspense>
            </Content>

            <Footer className="workspace-footer">面向数据结构课设的一体化智能旅游系统</Footer>
          </Layout>
        </Layout>
      </AntdApp>
    </ConfigProvider>
  );
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppShell />
    </Router>
  );
}

export default App;
