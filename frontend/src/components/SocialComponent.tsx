import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Input,
  List,
  Row,
  Segmented,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  EnvironmentOutlined,
  FireOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  socialService,
  type CheckIn,
  type NearbyUser,
  type Team,
  type TrendingTopic,
} from '../services/socialService';
import { resolveErrorMessage } from '../utils/errorMessage';

const { Title, Text, Paragraph } = Typography;

type SocialTab = 'trending' | 'nearby' | 'team' | 'checkin';

type RefreshOptions = {
  silent?: boolean;
  fallbackOnError?: boolean;
};

const FONT_FAMILY = '"Source Han Sans SC","PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif';

const formatRelativeTime = (iso: string): string => {
  const timestamp = new Date(iso).getTime();
  const diff = Date.now() - timestamp;
  if (!Number.isFinite(diff) || diff < 0) {
    return '刚刚';
  }
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < hour) {
    return `${Math.max(1, Math.floor(diff / minute))} 分钟前`;
  }
  if (diff < day) {
    return `${Math.max(1, Math.floor(diff / hour))} 小时前`;
  }
  return `${Math.max(1, Math.floor(diff / day))} 天前`;
};

const parseErrorMessage = (error: unknown, fallback: string): string => {
  const status =
    typeof error === 'object' && error !== null && 'response' in error
      ? (error as { response?: { status?: number } }).response?.status
      : undefined;
  if (status === 404) {
    return '社交接口暂未就绪，请确认后端已启动并已加载最新路由。';
  }
  return resolveErrorMessage(error, fallback);
};

const FALLBACK_TRENDING_ATTRACTIONS: TrendingTopic[] = [
  {
    id: 'fallback-attraction-1',
    title: '中心广场',
    type: 'attraction',
    popularity: 1860,
    description: '热点服务暂时不可用时，展示本地演示景点。',
  },
  {
    id: 'fallback-attraction-2',
    title: '湖畔步道',
    type: 'attraction',
    popularity: 1620,
    description: '适合轻松散步、拍照和短时打卡。',
  },
];

const FALLBACK_TRENDING_TOPICS: TrendingTopic[] = [
  {
    id: 'fallback-topic-1',
    title: '夜景打卡热度上升',
    type: 'activity',
    popularity: 980,
    description: '傍晚时段的签到和拍照行为更活跃。',
  },
  {
    id: 'fallback-topic-2',
    title: '今日同城热门路线',
    type: 'event',
    popularity: 760,
    description: '社区热度来自近 24 小时的签到和浏览趋势。',
  },
];

const FALLBACK_NEARBY_USERS: NearbyUser[] = [
  {
    id: 'fallback-user-1',
    username: '游客A',
    distance: 220,
    lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    status: '活跃中',
    currentAttraction: '中心广场',
  },
  {
    id: 'fallback-user-2',
    username: '游客B',
    distance: 410,
    lastSeen: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    status: '正在游览',
    currentAttraction: '湖畔步道',
  },
];

const FALLBACK_CHECKINS: CheckIn[] = [
  {
    id: 'fallback-checkin-1',
    userId: 'fallback-user-1',
    username: '游客A',
    attractionId: 'fallback-attraction-1',
    attractionName: '中心广场',
    timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    text: '今天天气很好，拍照效果很不错。',
    likes: 6,
    comments: 2,
  },
];

const topicTypeLabel = (type: TrendingTopic['type']) => {
  if (type === 'event') {
    return '事件';
  }
  if (type === 'activity') {
    return '活动';
  }
  return '景点';
};

const SocialComponent: React.FC = () => {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState<SocialTab>('trending');
  const [trendingAttractions, setTrendingAttractions] = useState<TrendingTopic[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [createTeamName, setCreateTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [selectedAttractionId, setSelectedAttractionId] = useState('');
  const [checkInText, setCheckInText] = useState('');
  const [nearbyRadius, setNearbyRadius] = useState(500);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [loadingCheckin, setLoadingCheckin] = useState(false);
  const [errorTrending, setErrorTrending] = useState<string | null>(null);
  const [errorNearby, setErrorNearby] = useState<string | null>(null);
  const [errorTeam, setErrorTeam] = useState<string | null>(null);
  const [errorCheckin, setErrorCheckin] = useState<string | null>(null);
  const [usingFallbackData, setUsingFallbackData] = useState(false);

  const trendingHeat = useMemo(
    () => [...trendingAttractions, ...trendingTopics].reduce((sum, item) => sum + item.popularity, 0),
    [trendingAttractions, trendingTopics],
  );

  const combinedError = useMemo(
    () => [errorTrending, errorNearby, errorTeam, errorCheckin].find((item) => item) || null,
    [errorTrending, errorNearby, errorTeam, errorCheckin],
  );

  const selectedAttraction = useMemo(
    () => trendingAttractions.find((item) => item.id === selectedAttractionId) || null,
    [selectedAttractionId, trendingAttractions],
  );

  const refreshTrending = async (options?: RefreshOptions): Promise<boolean> => {
    setLoadingTrending(true);
    try {
      const response = await socialService.getTrending();
      if (response.success) {
        setErrorTrending(null);
        setTrendingAttractions(response.data.attractions || []);
        setTrendingTopics(response.data.topics || []);
        if (!selectedAttractionId && response.data.attractions?.[0]?.id) {
          setSelectedAttractionId(response.data.attractions[0].id);
        }
      }
      return true;
    } catch (error: unknown) {
      const nextError = parseErrorMessage(error, '加载热点失败，请稍后重试。');
      setErrorTrending(nextError);
      if (options?.fallbackOnError) {
        setTrendingAttractions(FALLBACK_TRENDING_ATTRACTIONS);
        setTrendingTopics(FALLBACK_TRENDING_TOPICS);
        if (!selectedAttractionId) {
          setSelectedAttractionId(FALLBACK_TRENDING_ATTRACTIONS[0].id);
        }
      }
      if (!options?.silent) {
        message.error({ key: 'social-trending-error', content: nextError });
      }
      return false;
    } finally {
      setLoadingTrending(false);
    }
  };

  const refreshNearby = async (options?: RefreshOptions): Promise<boolean> => {
    setLoadingNearby(true);
    try {
      const location = await new Promise<{ latitude: number; longitude: number } | undefined>((resolve) => {
        if (!navigator.geolocation) {
          resolve(undefined);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          () => resolve(undefined),
          { timeout: 3000 },
        );
      });

      const response = await socialService.getNearbyUsers(nearbyRadius, location);
      if (response.success) {
        setErrorNearby(null);
        setNearbyUsers(response.data || []);
      }
      return true;
    } catch (error: unknown) {
      const nextError = parseErrorMessage(error, '获取附近游客失败。');
      setErrorNearby(nextError);
      if (options?.fallbackOnError) {
        setNearbyUsers(FALLBACK_NEARBY_USERS);
      }
      if (!options?.silent) {
        message.error({ key: 'social-nearby-error', content: nextError });
      }
      return false;
    } finally {
      setLoadingNearby(false);
    }
  };

  const refreshMyTeams = async (options?: RefreshOptions): Promise<boolean> => {
    setLoadingTeam(true);
    try {
      const response = await socialService.getMyTeams();
      if (response.success) {
        setErrorTeam(null);
        setTeams(response.data || []);
      }
      return true;
    } catch (error: unknown) {
      const nextError = parseErrorMessage(error, '获取队伍信息失败。');
      setErrorTeam(nextError);
      if (options?.fallbackOnError) {
        setTeams([]);
      }
      if (!options?.silent) {
        message.error({ key: 'social-team-error', content: nextError });
      }
      return false;
    } finally {
      setLoadingTeam(false);
    }
  };

  const refreshCheckins = async (attractionId?: string, options?: RefreshOptions): Promise<boolean> => {
    setLoadingCheckin(true);
    try {
      const response = await socialService.getCheckIns(attractionId);
      if (response.success) {
        setErrorCheckin(null);
        setCheckIns(response.data || []);
      }
      return true;
    } catch (error: unknown) {
      const nextError = parseErrorMessage(error, '获取签到记录失败。');
      setErrorCheckin(nextError);
      if (options?.fallbackOnError) {
        setCheckIns(FALLBACK_CHECKINS);
      }
      if (!options?.silent) {
        message.error({ key: 'social-checkin-error', content: nextError });
      }
      return false;
    } finally {
      setLoadingCheckin(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      const [trendingOk, nearbyOk, teamOk, checkinOk] = await Promise.all([
        refreshTrending({ silent: true, fallbackOnError: true }),
        refreshNearby({ silent: true, fallbackOnError: true }),
        refreshMyTeams({ silent: true, fallbackOnError: true }),
        refreshCheckins(undefined, { silent: true, fallbackOnError: true }),
      ]);
      setUsingFallbackData(!(trendingOk && nearbyOk && teamOk && checkinOk));
    };

    void bootstrap();
  }, []);

  const handleCreateTeam = async () => {
    const name = createTeamName.trim();
    if (!name) {
      message.warning('请输入队伍名称。');
      return;
    }

    setLoadingTeam(true);
    try {
      const response = await socialService.createTeam(name);
      if (response.success) {
        message.success(`队伍创建成功，邀请码：${response.data.inviteCode}`);
        setCreateTeamName('');
        await refreshMyTeams({ silent: true });
      }
    } catch (error: unknown) {
      message.error(parseErrorMessage(error, '创建队伍失败。'));
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleJoinTeam = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      message.warning('请输入邀请码。');
      return;
    }

    setLoadingTeam(true);
    try {
      const response = await socialService.joinTeam(code);
      if (response.success) {
        message.success(`已加入队伍：${response.data.name}`);
        setJoinCode('');
        await refreshMyTeams({ silent: true });
      }
    } catch (error: unknown) {
      message.error(parseErrorMessage(error, '加入队伍失败。'));
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleCheckin = async () => {
    if (!selectedAttractionId) {
      message.warning('请先选择签到景点。');
      return;
    }

    setLoadingCheckin(true);
    try {
      const response = await socialService.checkIn(selectedAttractionId, undefined, checkInText.trim() || undefined);
      if (response.success) {
        message.success('签到成功。');
        setCheckInText('');
        await refreshCheckins(selectedAttractionId, { silent: true });
        await refreshTrending({ silent: true });
      }
    } catch (error: unknown) {
      message.error(parseErrorMessage(error, '签到失败。'));
    } finally {
      setLoadingCheckin(false);
    }
  };

  return (
    <div style={{ fontFamily: FONT_FAMILY }}>
      <Card
        variant="borderless"
        style={{
          borderRadius: 20,
          marginBottom: 16,
          background:
            'linear-gradient(135deg, rgba(248,250,252,0.96) 0%, rgba(239,246,255,0.96) 46%, rgba(255,247,237,0.95) 100%)',
          boxShadow: '0 16px 34px rgba(15,23,42,0.08)',
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Space direction="vertical" size={6}>
              <Title level={3} style={{ margin: 0 }}>
                社交互动中心
              </Title>
              <Text type="secondary">把旅途中的热点、附近游客、组队游览和签到打卡串成一个连续体验。</Text>
            </Space>
          </Col>
          <Col xs={12} md={4}>
            <Statistic title="热点景点" value={trendingAttractions.length} prefix={<FireOutlined />} />
          </Col>
          <Col xs={12} md={4}>
            <Statistic title="附近游客" value={nearbyUsers.length} prefix={<UserOutlined />} />
          </Col>
          <Col xs={12} md={3}>
            <Statistic title="我的队伍" value={teams.length} prefix={<TeamOutlined />} />
          </Col>
          <Col xs={12} md={3}>
            <Statistic title="热度指数" value={trendingHeat} />
          </Col>
        </Row>
      </Card>

      <Card
        variant="borderless"
        style={{ borderRadius: 18, marginBottom: 16, boxShadow: '0 10px 24px rgba(15,23,42,0.06)' }}
      >
        <Segmented
          block
          value={activeTab}
          onChange={(value) => setActiveTab(value as SocialTab)}
          options={[
            { label: '实时热点', value: 'trending', icon: <FireOutlined /> },
            { label: '附近游客', value: 'nearby', icon: <UserOutlined /> },
            { label: '组队游览', value: 'team', icon: <TeamOutlined /> },
            { label: '签到打卡', value: 'checkin', icon: <CheckCircleOutlined /> },
          ]}
        />
      </Card>

      {combinedError ? (
        <Alert type="error" showIcon style={{ marginBottom: 16, borderRadius: 12 }} message={combinedError} />
      ) : null}

      {usingFallbackData ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16, borderRadius: 12 }}
          message="当前展示的是本地演示数据，部分社交接口暂时不可用。"
          action={
            <Button
              size="small"
              type="primary"
              onClick={async () => {
                const [trendingOk, nearbyOk, teamOk, checkinOk] = await Promise.all([
                  refreshTrending({ silent: true, fallbackOnError: true }),
                  refreshNearby({ silent: true, fallbackOnError: true }),
                  refreshMyTeams({ silent: true, fallbackOnError: true }),
                  refreshCheckins(selectedAttractionId || undefined, { silent: true, fallbackOnError: true }),
                ]);
                setUsingFallbackData(!(trendingOk && nearbyOk && teamOk && checkinOk));
              }}
            >
              重试加载
            </Button>
          }
        />
      ) : null}

      {activeTab === 'trending' && (
        <Card variant="borderless" style={{ borderRadius: 18, boxShadow: '0 10px 24px rgba(15,23,42,0.06)' }}>
          <Space style={{ marginBottom: 16 }}>
            <Button type="primary" onClick={() => void refreshTrending()} loading={loadingTrending}>
              刷新热点
            </Button>
            <Text type="secondary">热点由热度、评价和近时段签到行为综合计算。</Text>
          </Space>
          <Spin spinning={loadingTrending}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={14}>
                <Card title="热门景点" variant="borderless" style={{ background: 'rgba(248,250,252,0.9)' }}>
                  {trendingAttractions.length === 0 ? (
                    <Empty description="当前暂无热点景点" />
                  ) : (
                    <List
                      dataSource={trendingAttractions}
                      renderItem={(item, index) => (
                        <List.Item>
                          <List.Item.Meta
                            title={
                              <Space>
                                <Badge count={index + 1} color={index < 3 ? '#f59e0b' : '#64748b'} />
                                <Text strong>{item.title}</Text>
                                <Tag color="blue">热度 {item.popularity}</Tag>
                              </Space>
                            }
                            description={<Text type="secondary">{item.description || '暂无说明'}</Text>}
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>
              <Col xs={24} md={10}>
                <Card title="热门话题" variant="borderless" style={{ background: 'rgba(255,251,235,0.82)' }}>
                  {trendingTopics.length === 0 ? (
                    <Empty description="当前暂无热门话题" />
                  ) : (
                    <List
                      dataSource={trendingTopics}
                      renderItem={(item) => (
                        <List.Item>
                          <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            <Space>
                              <Tag color={item.type === 'event' ? 'volcano' : 'geekblue'}>
                                {topicTypeLabel(item.type)}
                              </Tag>
                              <Text strong>{item.title}</Text>
                            </Space>
                            <Paragraph type="secondary" style={{ margin: 0 }}>
                              {item.description || '暂无说明'}
                            </Paragraph>
                            <Text type="secondary">热度值：{item.popularity}</Text>
                          </Space>
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>
            </Row>
          </Spin>
        </Card>
      )}

      {activeTab === 'nearby' && (
        <Card variant="borderless" style={{ borderRadius: 18, boxShadow: '0 10px 24px rgba(15,23,42,0.06)' }}>
          <Space wrap style={{ marginBottom: 14 }}>
            <Text>搜索半径</Text>
            {[300, 500, 800, 1200].map((radius) => (
              <Button
                key={radius}
                type={nearbyRadius === radius ? 'primary' : 'default'}
                onClick={() => setNearbyRadius(radius)}
              >
                {radius} 米
              </Button>
            ))}
            <Button icon={<EnvironmentOutlined />} loading={loadingNearby} onClick={() => void refreshNearby()}>
              刷新附近游客
            </Button>
          </Space>
          <Spin spinning={loadingNearby}>
            {nearbyUsers.length === 0 ? (
              <Alert type="info" showIcon message="当前范围内暂无活跃游客，建议扩大半径后重试。" />
            ) : (
              <List
                grid={{ gutter: 16, xs: 1, md: 2, xl: 3 }}
                dataSource={nearbyUsers}
                renderItem={(item) => (
                  <List.Item>
                    <Card variant="borderless" style={{ background: 'rgba(248,250,252,0.92)', borderRadius: 14 }}>
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space>
                          <Text strong>{item.username}</Text>
                          <Tag color="cyan">{item.status || '在线'}</Tag>
                        </Space>
                        <Text type="secondary">距离约 {item.distance} 米</Text>
                        <Text type="secondary">最近活跃：{formatRelativeTime(item.lastSeen)}</Text>
                        {item.currentAttraction ? (
                          <Text type="secondary">当前位置：{item.currentAttraction}</Text>
                        ) : null}
                      </Space>
                    </Card>
                  </List.Item>
                )}
              />
            )}
          </Spin>
        </Card>
      )}

      {activeTab === 'team' && (
        <Card variant="borderless" style={{ borderRadius: 18, boxShadow: '0 10px 24px rgba(15,23,42,0.06)' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={10}>
              <Card title="创建队伍" variant="borderless" style={{ background: 'rgba(239,246,255,0.92)' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Input
                    placeholder="输入队伍名称"
                    value={createTeamName}
                    onChange={(e) => setCreateTeamName(e.target.value)}
                    maxLength={30}
                  />
                  <Button type="primary" loading={loadingTeam} onClick={() => void handleCreateTeam()}>
                    创建并生成邀请码
                  </Button>
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card title="加入队伍" variant="borderless" style={{ background: 'rgba(255,247,237,0.9)' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Input
                    placeholder="输入 6 位邀请码"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                  />
                  <Button loading={loadingTeam} onClick={() => void handleJoinTeam()}>
                    加入队伍
                  </Button>
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={4}>
              <Button block loading={loadingTeam} onClick={() => void refreshMyTeams()}>
                刷新队伍
              </Button>
            </Col>
          </Row>

          <div style={{ marginTop: 16 }}>
            {teams.length === 0 ? (
              <Empty description="你还没有加入任何队伍" />
            ) : (
              <List
                dataSource={teams}
                renderItem={(team) => (
                  <List.Item>
                    <Card
                      variant="borderless"
                      style={{
                        width: '100%',
                        borderRadius: 14,
                        background: 'rgba(248,250,252,0.94)',
                      }}
                    >
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap>
                          <Text strong>{team.name}</Text>
                          <Tag color="blue">邀请码 {team.inviteCode}</Tag>
                          <Tag color={team.status === 'active' ? 'green' : 'default'}>
                            {team.status === 'active' ? '活跃中' : '已关闭'}
                          </Tag>
                        </Space>
                        <Text type="secondary">队长：{team.creator}</Text>
                        <Space wrap>
                          {team.members.map((member) => (
                            <Tag
                              key={`${team.id}-${member.id}`}
                              color={member.role === 'creator' ? 'volcano' : 'geekblue'}
                            >
                              {member.username}
                            </Tag>
                          ))}
                        </Space>
                      </Space>
                    </Card>
                  </List.Item>
                )}
              />
            )}
          </div>
        </Card>
      )}

      {activeTab === 'checkin' && (
        <Card variant="borderless" style={{ borderRadius: 18, boxShadow: '0 10px 24px rgba(15,23,42,0.06)' }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} md={8}>
              <Text type="secondary">选择景点（来自当前热点）</Text>
              <Input
                value={selectedAttraction?.title || ''}
                readOnly
                style={{ marginTop: 8 }}
                placeholder="请先在下方点击一个热点景点"
              />
            </Col>
            <Col xs={24} md={10}>
              <Text type="secondary">签到文案</Text>
              <Input
                value={checkInText}
                onChange={(e) => setCheckInText(e.target.value)}
                style={{ marginTop: 8 }}
                maxLength={80}
                placeholder="例如：今天这条路线很顺，风景也很棒"
              />
            </Col>
            <Col xs={24} md={6}>
              <Space style={{ marginTop: 28 }}>
                <Button type="primary" loading={loadingCheckin} onClick={() => void handleCheckin()}>
                  立即签到
                </Button>
                <Button onClick={() => void refreshCheckins(selectedAttractionId || undefined)}>刷新记录</Button>
              </Space>
            </Col>
          </Row>

          {trendingAttractions.length > 0 ? (
            <div style={{ marginTop: 14 }}>
              <Text type="secondary">快速选择景点</Text>
              <Space wrap style={{ marginTop: 8 }}>
                {trendingAttractions.map((item) => (
                  <Tag
                    key={item.id}
                    color={selectedAttractionId === item.id ? 'blue' : 'default'}
                    style={{ cursor: 'pointer', padding: '4px 10px' }}
                    onClick={() => setSelectedAttractionId(item.id)}
                  >
                    {item.title}
                  </Tag>
                ))}
              </Space>
            </div>
          ) : null}

          <div style={{ marginTop: 16 }}>
            <Title level={5}>最新签到记录</Title>
            <Spin spinning={loadingCheckin}>
              {checkIns.length === 0 ? (
                <Empty description="当前暂无签到记录" />
              ) : (
                <List
                  dataSource={checkIns}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space wrap>
                            <Text strong>{item.username}</Text>
                            <Tag color="geekblue">{item.attractionName}</Tag>
                            <Text type="secondary">{formatRelativeTime(item.timestamp)}</Text>
                          </Space>
                        }
                        description={
                          <Space wrap>
                            <Text>{item.text || '打卡成功'}</Text>
                            <Tag>点赞 {item.likes}</Tag>
                            <Tag>评论 {item.comments}</Tag>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Spin>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SocialComponent;
