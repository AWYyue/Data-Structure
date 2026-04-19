import React, { useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  AutoComplete,
  Avatar,
  Button,
  ConfigProvider,
  Drawer,
  Dropdown,
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
  DownOutlined,
  EnvironmentOutlined,
  GiftOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuOutlined,
  NotificationOutlined,
  SearchOutlined,
  SettingOutlined,
  SwapOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { BrowserRouter as Router, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import queryService from './services/queryService';
import { useAppDispatch, useAppSelector } from './store';
import { getCurrentUser, logout } from './store/slices/userSlice';

const HomePage = React.lazy(() => import('./pages/HomePage'));
const LoginPage = React.lazy(() => import('./pages/AccountLoginPage'));
const RegisterPage = React.lazy(() => import('./pages/AccountRegisterPage'));
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
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));

import './App.css';

const { Header, Content, Footer, Sider } = Layout;
const { Text } = Typography;

type ColorMode = 'light' | 'dark';
type HeaderSuggestionOption = { value: string };

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
  '/profile': 'profile',
};

const routeMetaMap: Record<string, { title: string; subtitle: string }> = {
  home: { title: '首页总览', subtitle: '从推荐、榜单和主流程入口开始。' },
  journey: { title: '智能行程', subtitle: '兴趣采集、目的地推荐与一日路线规划。' },
  query: { title: '景区与设施查询', subtitle: '把景区、设施、美食检索放在同一个工作区。' },
  overview: { title: '景区总览', subtitle: '集中浏览热门景区和推荐目的地。' },
  path: { title: '路线规划', subtitle: '连接景区上下文与导航执行。' },
  indoor: { title: '室内导航', subtitle: '楼层切换、入口引导和室内路线展示。' },
  diary: { title: '旅行日记', subtitle: '浏览内容、沉浸记录与全文检索。' },
  reminder: { title: '个性提醒', subtitle: '天气、人流和行程相关提醒入口。' },
  social: { title: '社交互动', subtitle: '打卡、组队和附近游客互动。' },
  profile: { title: '账号设置', subtitle: '维护账号信息、密码与兴趣偏好。' },
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
  const { user, token } = useAppSelector((state) => state.user);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mode, setMode] = useState<ColorMode>(() => (localStorage.getItem('color-mode') === 'dark' ? 'dark' : 'light'));
  const [headerSearchKeyword, setHeaderSearchKeyword] = useState('');
  const [headerSuggestionOptions, setHeaderSuggestionOptions] = useState<HeaderSuggestionOption[]>([]);
  const [headerSuggestionLoading, setHeaderSuggestionLoading] = useState(false);

  useEffect(() => {
    if (token) {
      void dispatch(getCurrentUser());
    }
  }, [dispatch, token]);

  useEffect(() => {
    const keyword = headerSearchKeyword.trim();
    if (!keyword) {
      setHeaderSuggestionOptions([]);
      setHeaderSuggestionLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setHeaderSuggestionLoading(true);
      try {
        const response = await queryService.searchScenicAreaSuggestions(keyword, 8);
        if (!cancelled) {
          setHeaderSuggestionOptions((response.data || []).map((item) => ({ value: item })));
        }
      } catch {
        if (!cancelled) {
          setHeaderSuggestionOptions([]);
        }
      } finally {
        if (!cancelled) {
          setHeaderSuggestionLoading(false);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [headerSearchKeyword]);

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

  const menuSelectedKey = selectedKey === 'overview' ? 'query' : selectedKey;
  const currentMeta = routeMetaMap[selectedKey] || routeMetaMap.home;
  const needsOnboarding = Boolean(user && (!user.interests || user.interests.length === 0));
  const authLanding = needsOnboarding ? '/journey' : '/';

  const submitHeaderSearch = (rawKeyword?: string) => {
    const keyword = (rawKeyword ?? headerSearchKeyword).trim();
    setMobileMenuOpen(false);
    if (!keyword) {
      navigate('/query');
      return;
    }

    navigate(`/query?mode=scenic&keyword=${encodeURIComponent(keyword)}`);
  };

  const handleLogout = (target: 'home' | 'login' = 'login') => {
    dispatch(logout());
    setMobileMenuOpen(false);
    setHeaderSearchKeyword('');
    setHeaderSuggestionOptions([]);
    navigate(target === 'home' ? '/' : '/login', { replace: true });
  };

  const handleGuestClick = () => {
    navigate('/login');
  };

  const handleGuestKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleGuestClick();
    }
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
  ];

  const navigationItems = user
    ? [
        ...menuItems,
        { key: 'profile', icon: <SettingOutlined />, label: <Link to="/profile">账号设置</Link> },
      ]
    : menuItems;

  const headerUserMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <SettingOutlined />,
      label: '账号设置',
    },
    {
      key: 'switch',
      icon: <SwapOutlined />,
      label: '切换账号',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
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

            <Menu mode="inline" selectedKeys={[menuSelectedKey]} items={navigationItems} className="sidebar-menu" />

            <div className="sidebar-footer">
              {user ? (
                <div className="sidebar-user-card">
                  <Space align="center">
                    <Avatar size={42} icon={<UserOutlined />} />
                    <div>
                      <div className="sidebar-user-name">{user.username || '当前用户'}</div>
                      <div className="sidebar-user-subtitle">
                        {needsOnboarding ? '待完善兴趣画像' : '个性化服务已开启'}
                      </div>
                    </div>
                  </Space>
                  <Button danger block onClick={() => handleLogout('login')}>
                    退出登录 / 切换账号
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
                  <AutoComplete
                    value={headerSearchKeyword}
                    options={headerSuggestionOptions}
                    onChange={setHeaderSearchKeyword}
                    onSelect={(value) => {
                      setHeaderSearchKeyword(value);
                      submitHeaderSearch(value);
                    }}
                    notFoundContent={headerSuggestionLoading ? <Spin size="small" /> : null}
                  >
                    <Input.Search
                      allowClear
                      enterButton
                      prefix={<SearchOutlined />}
                      placeholder="搜索景区名称，支持前缀联想"
                      onSearch={submitHeaderSearch}
                    />
                  </AutoComplete>
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

                {user ? (
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: headerUserMenuItems,
                      onClick: ({ key }) => {
                        if (key === 'profile') {
                          navigate('/profile');
                          return;
                        }
                        if (key === 'switch') {
                          handleLogout('login');
                          return;
                        }
                        handleLogout('home');
                      },
                    }}
                  >
                    <div className="header-user-chip header-user-chip-dropdown" role="button" tabIndex={0}>
                      <Avatar size={34} icon={<UserOutlined />} />
                      <div className="desktop-only">
                        <div className="header-user-name">{user.username || '已登录用户'}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {needsOnboarding ? '待完善兴趣设置' : '已登录'}
                        </Text>
                      </div>
                      <DownOutlined className="header-user-arrow desktop-only" />
                    </div>
                  </Dropdown>
                ) : (
                  <div
                    className="header-user-chip"
                    onClick={handleGuestClick}
                    onKeyDown={handleGuestKeyDown}
                    role="button"
                    tabIndex={0}
                  >
                    <Avatar size={34} icon={<UserOutlined />} />
                    <div className="desktop-only">
                      <div className="header-user-name">访客</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        未登录
                      </Text>
                    </div>
                  </div>
                )}
              </div>
            </Header>

            <Drawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} placement="left" title="个性化旅游系统">
              <Menu mode="vertical" selectedKeys={[menuSelectedKey]} items={navigationItems} onClick={() => setMobileMenuOpen(false)} />
              <div style={{ marginTop: 16 }}>
                {user ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button block onClick={() => navigate('/profile')}>
                      账号设置
                    </Button>
                    <Button danger block onClick={() => handleLogout('login')}>
                      退出登录 / 切换账号
                    </Button>
                  </Space>
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
                  <Route path="/journey" element={<JourneyPlannerPage />} />
                  <Route path="/path-planning" element={<PathPlanningPage />} />
                  <Route path="/query" element={<QueryPage />} />
                  <Route path="/scenic-overview" element={<ScenicOverviewPage />} />
                  <Route path="/diary" element={<DiaryPage />} />
                  <Route path="/scenic-area/:id" element={<ScenicAreaDetailPage />} />
                  <Route path="/indoor-navigation" element={<IndoorNavigationPage />} />
                  <Route path="/food-recommendation/:scenicAreaId" element={<FoodRecommendationPage />} />
                  <Route path="/reminder" element={<ReminderPage />} />
                  <Route path="/social" element={<SocialPage />} />
                  <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/login" replace />} />
                </Routes>
              </React.Suspense>
            </Content>

            <Footer className="workspace-footer">面向数据结构课程设计的一体化智能旅游系统</Footer>
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
