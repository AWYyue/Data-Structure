import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  List,
  Progress,
  Radio,
  Row,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
} from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PremiumPageHero from '../components/PremiumPageHero';
import recommendationService, { ScenicArea } from '../services/recommendationService';
import pathPlanningService from '../services/pathPlanningService';
import { useAppDispatch, useAppSelector } from '../store';
import { updateInterests } from '../store/slices/userSlice';
import {
  getJourneyContext,
  JourneyPlanStop,
  saveJourneyContext,
  StoredJourneyContext,
} from '../utils/journeyContext';
import { resolveErrorMessage } from '../utils/errorMessage';

const { Title, Text, Paragraph } = Typography;

const cardStyle: React.CSSProperties = {
  borderRadius: 20,
  height: '100%',
  boxShadow: '0 14px 34px rgba(15,23,42,0.08)',
};

const summaryCardStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #f8fbff 0%, #f5f8fc 100%)',
  borderRadius: 16,
  minHeight: 108,
};

const interestOptions = [
  { value: 'foodie', label: '美食爱好者', desc: '优先推荐地方风味、特色餐饮和适合顺路打卡的美食点位。' },
  { value: 'photographer', label: '摄影打卡党', desc: '优先推荐高出片景点、黄金机位和适合拍照的游览时段。' },
  { value: 'cultureEnthusiast', label: '历史文化控', desc: '优先推荐古迹、人文场馆和讲解价值更高的景点。' },
  { value: 'natureLover', label: '自然风光派', desc: '优先推荐绿地、水岸、公园与观景路线。' },
  { value: 'sportsEnthusiast', label: '活力运动型', desc: '优先推荐步行强度更高、探索感更强的游玩节奏。' },
  { value: 'relaxationSeeker', label: '轻松休闲型', desc: '优先推荐停留更舒适、休息点更多的安排。' },
  { value: 'socialSharer', label: '社交分享型', desc: '优先推荐热点活动、互动区域和更适合分享的目的地。' },
];

type DayPlanItem = JourneyPlanStop;

type RecommendationMode = 'personalized' | 'exploration' | 'surprise' | 'popular';

type RecommendationExplanation = {
  factors: Array<{ name: string; weight: number; explanation: string }>;
  totalScore: number;
};

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
      // fall back to delimiter parsing
    }

    return trimmed
      .replace(/^\[|\]$/g, '')
      .split(/[,\uFF0C|]/)
      .map((item) => item.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }

  return [];
};

const normalizeDayPlanItems = (value: unknown): DayPlanItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const source = item as Partial<DayPlanItem>;
      if (!source?.attractionId || !source.name || !source.arrivalTime) {
        return null;
      }

      return {
        attractionId: String(source.attractionId),
        name: String(source.name),
        arrivalTime: String(source.arrivalTime),
        stayDuration: Number(source.stayDuration || 0),
        isMustVisit: Boolean(source.isMustVisit),
      };
    })
    .filter((item): item is DayPlanItem => Boolean(item));
};

const intensityMeta: Record<'low' | 'medium' | 'high', { label: string; pace: string; description: string }> = {
  low: {
    label: '轻松',
    pace: '舒缓游玩',
    description: '景点更少、停留更久，适合边逛边休息的慢节奏体验。',
  },
  medium: {
    label: '标准',
    pace: '平衡节奏',
    description: '兼顾热门景点、步行强度和整体时长，适合作为常规一日游方案。',
  },
  high: {
    label: '高强度',
    pace: '高效打卡',
    description: '覆盖更多点位，适合希望高效率游览、集中完成打卡的安排。',
  },
};

const modeLabelMap: Record<RecommendationMode, string> = {
  personalized: '个性化推荐',
  exploration: '探索模式',
  surprise: '惊喜推荐',
  popular: '热门推荐',
};

const transportByIntensity: Record<'low' | 'medium' | 'high', 'walk' | 'bicycle' | 'electric_cart'> = {
  low: 'walk',
  medium: 'bicycle',
  high: 'electric_cart',
};

const formatTime = (time: string) =>
  new Date(time).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const resolveItemReason = (mode: RecommendationMode, item: ScenicArea): string => {
  if (mode === 'exploration') {
    return `探索模式会优先拉高你较少尝试的类型，本次偏向 ${item.category || '综合景区'}。`;
  }
  if (mode === 'surprise') {
    return '惊喜推荐会适度跳出既有偏好，优先展示你可能会喜欢但平时不常选的目的地。';
  }
  if (mode === 'popular') {
    return '当前结果主要依据景区热度、评分和游客反馈综合排序。';
  }
  return '系统已按你的兴趣偏好进行匹配，优先推荐契合度更高的景区。';
};

const JourneyPlannerPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { message } = App.useApp();
  const { user } = useAppSelector((state) => state.user);
  const restoredJourneyRef = useRef<StoredJourneyContext | null>(getJourneyContext());
  const hasAppliedStoredJourneyRef = useRef(false);
  const previousScenicIdRef = useRef<string | null>(null);

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [savingInterests, setSavingInterests] = useState(false);

  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<ScenicArea[]>([]);
  const [selectedScenic, setSelectedScenic] = useState<ScenicArea | null>(null);
  const [explorationEnabled, setExplorationEnabled] = useState(false);
  const [surpriseEnabled, setSurpriseEnabled] = useState(false);
  const [recommendationSourceHint, setRecommendationSourceHint] = useState('');
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [recommendationExplanation, setRecommendationExplanation] = useState<RecommendationExplanation | null>(null);
  const [explanationError, setExplanationError] = useState<string | null>(null);

  const [intensity, setIntensity] = useState<'low' | 'medium' | 'high'>('medium');
  const [planning, setPlanning] = useState(false);
  const [dayPlan, setDayPlan] = useState<DayPlanItem[]>([]);
  const [dayPlanDistance, setDayPlanDistance] = useState(0);
  const [dayPlanTime, setDayPlanTime] = useState(0);
  const [routingIndex, setRoutingIndex] = useState<number | null>(null);

  const resumeSegmentIndex = Math.max(0, Number(searchParams.get('resumeSegment') || '0'));
  const resumeSource = (searchParams.get('source') || '').trim();

  const hasInterests = selectedInterests.length > 0;

  const recommendationMode = useMemo<RecommendationMode>(() => {
    if (surpriseEnabled) {
      return 'surprise';
    }
    if (explorationEnabled) {
      return 'exploration';
    }
    if (user && hasInterests) {
      return 'personalized';
    }
    return 'popular';
  }, [explorationEnabled, hasInterests, surpriseEnabled, user]);

  const selectedInterestDescriptions = useMemo(
    () => interestOptions.filter((item) => selectedInterests.includes(item.value)),
    [selectedInterests],
  );

  const explanationFactors = useMemo(
    () => (Array.isArray(recommendationExplanation?.factors) ? recommendationExplanation.factors : []),
    [recommendationExplanation],
  );

  const dayPlanSummary = useMemo(() => {
    const mustVisitCount = dayPlan.filter((item) => item.isMustVisit).length;
    const totalStayMinutes = dayPlan.reduce((sum, item) => sum + Number(item.stayDuration || 0), 0);
    return {
      attractionCount: dayPlan.length,
      mustVisitCount,
      totalStayMinutes,
    };
  }, [dayPlan]);

  const resumeAlert = useMemo(() => {
    if (resumeSource !== 'path-planning' || dayPlan.length < 2) {
      return null;
    }

    const from = dayPlan[resumeSegmentIndex];
    const to = dayPlan[resumeSegmentIndex + 1];
    if (!from || !to) {
      return null;
    }

    return {
      title: `你刚从第 ${resumeSegmentIndex + 1} 段导航返回`,
      description: `${from.name} -> ${to.name}。你可以继续查看整天计划，或直接重新进入这一段导航。`,
    };
  }, [dayPlan, resumeSegmentIndex, resumeSource]);

  useEffect(() => {
    if (!resumeAlert) {
      return;
    }

    message.success(resumeAlert.title);
  }, [message, resumeAlert]);

  useEffect(() => {
    setSelectedInterests(normalizeStringArray(user?.interests));
  }, [user?.id, user?.interests]);

  useEffect(() => {
    const stored = restoredJourneyRef.current;
    if (!stored || hasAppliedStoredJourneyRef.current) {
      return;
    }

    hasAppliedStoredJourneyRef.current = true;
    setIntensity(stored.intensity);
    setDayPlan(stored.plan);
    setDayPlanDistance(stored.totalDistance);
    setDayPlanTime(stored.totalTime);
  }, []);

  useEffect(() => {
    const nextScenicId = selectedScenic?.id || null;
    if (
      previousScenicIdRef.current &&
      nextScenicId &&
      previousScenicIdRef.current !== nextScenicId
    ) {
      setDayPlan([]);
      setDayPlanDistance(0);
      setDayPlanTime(0);
    }
    previousScenicIdRef.current = nextScenicId;
  }, [selectedScenic?.id]);

  useEffect(() => {
    const scenicAreaId = selectedScenic?.id || restoredJourneyRef.current?.scenicAreaId || null;
    const scenicAreaName = selectedScenic?.name || restoredJourneyRef.current?.scenicAreaName || null;

    if (!scenicAreaId && !dayPlan.length) {
      return;
    }

    saveJourneyContext({
      scenicAreaId,
      scenicAreaName,
      intensity,
      plan: dayPlan,
      totalDistance: dayPlanDistance,
      totalTime: dayPlanTime,
      updatedAt: new Date().toISOString(),
    });
  }, [dayPlan, dayPlanDistance, dayPlanTime, intensity, selectedScenic]);

  useEffect(() => {
    const loadRecommendations = async () => {
      setLoadingRecommendations(true);

      try {
        let list: ScenicArea[] = [];
        let hint = '';

        if (user) {
          if (recommendationMode === 'personalized' && hasInterests) {
            const personalized = await recommendationService.getPersonalizedRecommendations(8);
            if (personalized.success) {
              list = personalized.data || [];
              hint = '已按你的兴趣偏好生成推荐，结果会随着后续行为持续校准。';
            }
          } else if (recommendationMode === 'exploration') {
            const exploration = await recommendationService.getExplorationRecommendations(8);
            if (exploration.success) {
              list = exploration.data || [];
              hint = '探索模式已开启：优先推荐你相对较少尝试的类型。';
            }
          } else if (recommendationMode === 'surprise') {
            const surprise = await recommendationService.getSurpriseRecommendations(8);
            if (surprise.success) {
              list = surprise.data || [];
              hint = '惊喜推荐已开启：本次会优先给你一些跳出常规偏好的选择。';
            }
          }
        }

        if (list.length === 0) {
          const fallback = await recommendationService.getPopularityRanking(8);
          if (fallback.success) {
            list = fallback.data || [];
            if (!user) {
              hint = '当前未登录，先展示公共热门推荐。';
            } else if (!hasInterests) {
              hint = '你还没有保存兴趣偏好，当前先展示热门推荐。';
            } else {
              hint = '当前展示热门推荐，可随时切换推荐策略。';
            }
          }
        }

        setRecommendationSourceHint(hint);
        setRecommendations(list);
        setSelectedScenic((current) => {
          if (current && list.some((item) => item.id === current.id)) {
            return current;
          }

          const restoredScenicId = restoredJourneyRef.current?.scenicAreaId;
          if (restoredScenicId) {
            const restoredMatch = list.find((item) => item.id === restoredScenicId);
            if (restoredMatch) {
              return restoredMatch;
            }
          }

          return list[0] || null;
        });
      } catch {
        setRecommendations([]);
        setSelectedScenic(null);
        setRecommendationSourceHint('推荐服务暂时不可用，请稍后再试。');
        message.error('加载景区推荐失败，请稍后重试。');
      } finally {
        setLoadingRecommendations(false);
      }
    };

    void loadRecommendations();
  }, [hasInterests, message, recommendationMode, user]);

  useEffect(() => {
    const loadRecommendationExplanation = async () => {
      if (!selectedScenic || !user) {
        setRecommendationExplanation(null);
        setExplanationError(null);
        return;
      }

      setLoadingExplanation(true);
      setExplanationError(null);

      try {
        const response = await recommendationService.getRecommendationExplanation(selectedScenic.id);
        setRecommendationExplanation(response.data || null);
      } catch {
        setRecommendationExplanation(null);
        setExplanationError('暂时无法获取这条推荐的解释说明。');
      } finally {
        setLoadingExplanation(false);
      }
    };

    void loadRecommendationExplanation();
  }, [selectedScenic, user]);

  const handleSaveInterests = async () => {
    if (!hasInterests) {
      message.warning('请至少选择一个兴趣偏好。');
      return;
    }

    setSavingInterests(true);
    try {
      await dispatch(updateInterests(selectedInterests)).unwrap();
      message.success('兴趣偏好已保存，推荐结果已同步更新。');
    } catch {
      message.error('保存兴趣偏好失败，请稍后重试。');
    } finally {
      setSavingInterests(false);
    }
  };

  const handleGenerateDayPlan = async () => {
    if (!user) {
      message.warning('请先登录后再生成一日计划。');
      return;
    }

    if (!selectedScenic) {
      message.warning('请先从推荐结果中选择一个景区。');
      return;
    }

    setPlanning(true);
    try {
      const response = await pathPlanningService.generateDayPlan(selectedScenic.id, user.id, intensity);
      const normalizedPlan = normalizeDayPlanItems(response?.data?.plan);
      setDayPlan(normalizedPlan);
      setDayPlanDistance(Number(response?.data?.totalDistance || 0));
      setDayPlanTime(Number(response?.data?.totalTime || 0));

      if (normalizedPlan.length > 0) {
        message.success(`已为你生成 ${normalizedPlan.length} 个停留点的一日计划。`);
      } else {
        message.warning('已完成规划，但当前景区暂无可展示的计划节点。');
      }
    } catch (error: unknown) {
      message.error(resolveErrorMessage(error, '生成一日计划失败，请稍后重试。'));
    } finally {
      setPlanning(false);
    }
  };

  const handleNavigatePlanSegment = async (index: number) => {
    if (index < 0 || index >= dayPlan.length - 1) {
      return;
    }

    const from = dayPlan[index];
    const to = dayPlan[index + 1];

    setRoutingIndex(index);
    try {
      saveJourneyContext({
        scenicAreaId: selectedScenic?.id || null,
        scenicAreaName: selectedScenic?.name || null,
        intensity,
        plan: dayPlan,
        totalDistance: dayPlanDistance,
        totalTime: dayPlanTime,
        updatedAt: new Date().toISOString(),
      });

      const [fromNodeResp, toNodeResp] = await Promise.all([
        pathPlanningService.findNearestNodeByAttraction(from.attractionId),
        pathPlanningService.findNearestNodeByAttraction(to.attractionId),
      ]);

      const transport = transportByIntensity[intensity];
      const query = new URLSearchParams({
        startNodeId: fromNodeResp.data.nodeId,
        endNodeId: toNodeResp.data.nodeId,
        transportation: transport,
        startName: from.name,
        endName: to.name,
        scenicAreaId: selectedScenic?.id || '',
        scenicName: selectedScenic?.name || '',
        segmentIndex: String(index),
        segmentCount: String(Math.max(dayPlan.length - 1, 0)),
        source: 'journey',
      });

      navigate(`/path-planning?${query.toString()}`);
    } catch (error: unknown) {
      message.error(resolveErrorMessage(error, '生成导航失败，请稍后重试。'));
    } finally {
      setRoutingIndex(null);
    }
  };

  const openPathPlanning = () => {
    const query = new URLSearchParams();
    if (selectedScenic?.id) {
      query.set('scenicAreaId', selectedScenic.id);
      query.set('scenicName', selectedScenic.name);
      query.set('source', 'journey');
    }
    navigate(query.toString() ? `/path-planning?${query.toString()}` : '/path-planning');
  };

  const openQuery = () => {
    const query = new URLSearchParams({ mode: 'scenic' });
    if (selectedScenic?.id) {
      query.set('scenicAreaId', selectedScenic.id);
      query.set('scenicName', selectedScenic.name);
    }
    navigate(`/query?${query.toString()}`);
  };

  const openFood = () => {
    if (selectedScenic?.id) {
      navigate(`/food-recommendation/${selectedScenic.id}`);
      return;
    }
    navigate('/food-recommendation');
  };

  return (
    <div style={{ padding: 8, maxWidth: 1280, margin: '0 auto' }}>
      <PremiumPageHero
        title="智能行程助手"
        description="按照“兴趣采集 -> 景区推荐 -> 一日计划 -> 分段导航”的流程，把推荐、规划和执行串成更完整的一条龙体验。"
        tags={['兴趣建模', '推荐解释', '一日计划', '导航联动']}
        accent="teal"
        metrics={[
          { label: '当前策略', value: modeLabelMap[recommendationMode] },
          { label: '已选兴趣', value: selectedInterests.length, suffix: '项' },
          { label: '推荐景区', value: recommendations.length, suffix: '个' },
          { label: '计划状态', value: dayPlan.length > 0 ? '已生成' : '待生成' },
        ]}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card variant="borderless" style={cardStyle}>
            <Title level={4} style={{ marginTop: 0 }}>
              1. 兴趣画像
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 10 }}>
              先告诉系统你的偏好，后续推荐、节奏和出行建议都会更贴近你的游玩方式。
            </Paragraph>

            <Space wrap size={8}>
              {interestOptions.map((item) => {
                const checked = selectedInterests.includes(item.value);
                return (
                  <Tag.CheckableTag
                    key={item.value}
                    checked={checked}
                    onChange={(active) =>
                      setSelectedInterests((current) =>
                        active ? [...new Set([...current, item.value])] : current.filter((value) => value !== item.value),
                      )
                    }
                  >
                    {item.label}
                  </Tag.CheckableTag>
                );
              })}
            </Space>

            <List
              style={{ marginTop: 12 }}
              size="small"
              dataSource={selectedInterestDescriptions}
              locale={{ emptyText: '已选兴趣会显示在这里。' }}
              renderItem={(item) => <List.Item>{item.desc}</List.Item>}
            />

            <Button block type="primary" onClick={handleSaveInterests} loading={savingInterests}>
              保存兴趣偏好
            </Button>
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card variant="borderless" style={cardStyle}>
            <Title level={4} style={{ marginTop: 0 }}>
              2. 目的地推荐
            </Title>

            <Space wrap style={{ marginBottom: 10 }}>
              <Text type="secondary">探索模式</Text>
              <Switch
                checked={explorationEnabled}
                onChange={(checked) => {
                  setExplorationEnabled(checked);
                  if (checked) {
                    setSurpriseEnabled(false);
                  }
                }}
              />
              <Text type="secondary">惊喜推荐</Text>
              <Switch
                checked={surpriseEnabled}
                onChange={(checked) => {
                  setSurpriseEnabled(checked);
                  if (checked) {
                    setExplorationEnabled(false);
                  }
                }}
              />
            </Space>

            <Space wrap style={{ marginBottom: 12 }}>
              <Tag color="blue">当前策略：{modeLabelMap[recommendationMode]}</Tag>
            </Space>

            {!hasInterests ? (
              <Alert type="warning" showIcon message="你还没有保存兴趣偏好，当前先展示热门推荐。" style={{ marginBottom: 12 }} />
            ) : null}

            {recommendationSourceHint ? (
              <Alert type="info" showIcon message={recommendationSourceHint} style={{ marginBottom: 12 }} />
            ) : null}

            {loadingRecommendations ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <Spin />
              </div>
            ) : recommendations.length === 0 ? (
              <Empty description="暂无推荐结果" />
            ) : (
              <List
                size="small"
                dataSource={recommendations}
                renderItem={(item) => (
                  <List.Item
                    onClick={() => setSelectedScenic(item)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: 14,
                      marginBottom: 8,
                      padding: '12px 14px',
                      background:
                        selectedScenic?.id === item.id
                          ? 'linear-gradient(120deg, rgba(37,99,235,0.12), rgba(14,116,144,0.08))'
                          : '#f8fafc',
                      border:
                        selectedScenic?.id === item.id
                          ? '1px solid rgba(37,99,235,0.36)'
                          : '1px solid transparent',
                    }}
                  >
                    <Space direction="vertical" size={4}>
                      <Text strong>{item.name}</Text>
                      <Space wrap size={6}>
                        <Tag color="blue">{item.category || '景区'}</Tag>
                        <Tag color="green">评分 {item.averageRating ?? item.rating ?? 0}</Tag>
                        <Tag color="orange">热度 {item.popularity ?? item.visitorCount ?? 0}</Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {resolveItemReason(recommendationMode, item)}
                      </Text>
                    </Space>
                  </List.Item>
                )}
              />
            )}

            <Divider style={{ margin: '14px 0 10px' }} />
            <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
              推荐理由解释
            </Title>

            {!user ? (
              <Text type="secondary">登录后可查看个性化推荐背后的原因说明。</Text>
            ) : loadingExplanation ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
                <Spin size="small" />
              </div>
            ) : explanationError ? (
              <Alert type="warning" showIcon message={explanationError} />
            ) : recommendationExplanation && explanationFactors.length > 0 ? (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {explanationFactors.map((factor) => {
                  const total = recommendationExplanation.totalScore || 0;
                  const percent = total > 0 ? Math.min(100, Math.max(0, (factor.weight / total) * 100)) : 0;

                  return (
                    <div key={factor.name}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Text strong>{factor.name}</Text>
                        <Text type="secondary">{percent.toFixed(0)}%</Text>
                      </Space>
                      <Progress percent={Number(percent.toFixed(0))} size="small" showInfo={false} />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {factor.explanation}
                      </Text>
                    </div>
                  );
                })}
              </Space>
            ) : (
              <Text type="secondary">选择推荐景区后，这里会展示推荐理由。</Text>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card variant="borderless" style={cardStyle}>
            <Title level={4} style={{ marginTop: 0 }}>
              3. 一日计划
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 8 }}>
              选中推荐景区后，一键生成可执行的一日计划，并可直接进入分段导航。
            </Paragraph>

            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Text>
                当前目的地：
                <Text strong>{selectedScenic ? ` ${selectedScenic.name}` : ' 未选择景区'}</Text>
              </Text>

              <Alert
                type="info"
                showIcon
                message={`当前节奏：${intensityMeta[intensity].label} · ${intensityMeta[intensity].pace}`}
                description={intensityMeta[intensity].description}
              />

              <Radio.Group
                value={intensity}
                onChange={(event) => setIntensity(event.target.value)}
                options={[
                  { label: '轻松', value: 'low' },
                  { label: '标准', value: 'medium' },
                  { label: '高强度', value: 'high' },
                ]}
                optionType="button"
                buttonStyle="solid"
              />

              <Space wrap>
                <Button type="primary" onClick={handleGenerateDayPlan} loading={planning}>
                  生成一日计划
                </Button>
                <Button
                  onClick={() => handleNavigatePlanSegment(0)}
                  disabled={dayPlan.length < 2}
                  loading={routingIndex === 0}
                >
                  一键导航首段
                </Button>
              </Space>
            </Space>

            {dayPlan.length > 0 ? (
              <div style={{ marginTop: 16 }}>
                <Row gutter={[10, 10]} style={{ marginBottom: 10 }}>
                  <Col span={8}>
                    <Card variant="borderless" style={summaryCardStyle}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        景点数量
                      </Text>
                      <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                        {dayPlanSummary.attractionCount}
                      </div>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card variant="borderless" style={summaryCardStyle}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        必去点位
                      </Text>
                      <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                        {dayPlanSummary.mustVisitCount}
                      </div>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card variant="borderless" style={summaryCardStyle}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        停留时长
                      </Text>
                      <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                        {dayPlanSummary.totalStayMinutes}
                        <span style={{ fontSize: 14, marginLeft: 4, color: '#64748b' }}>分钟</span>
                      </div>
                    </Card>
                  </Col>
                </Row>

                <Space wrap style={{ marginBottom: 10 }}>
                  <Tag color="geekblue">总里程 {dayPlanDistance.toFixed(1)} 米</Tag>
                  <Tag color="purple">总耗时 {dayPlanTime.toFixed(1)} 分钟</Tag>
                  <Tag color="cyan">建议方式 {intensityMeta[intensity].label}</Tag>
                </Space>

                <List
                  style={{ marginTop: 10 }}
                  size="small"
                  dataSource={dayPlan}
                  renderItem={(item, index) => (
                    <List.Item
                      style={{
                        padding: '14px 12px',
                        borderRadius: 14,
                        marginBottom: 8,
                        background: '#f8fafc',
                      }}
                      actions={
                        index < dayPlan.length - 1
                          ? [
                              <Button
                                key={`${item.attractionId}-nav`}
                                size="small"
                                type="link"
                                onClick={() => handleNavigatePlanSegment(index)}
                                loading={routingIndex === index}
                              >
                                导航到下一站
                              </Button>,
                            ]
                          : undefined
                      }
                    >
                      <Space align="start" size={12}>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 999,
                            background: '#1d4ed8',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        >
                          {index + 1}
                        </div>
                        <Space direction="vertical" size={4}>
                          <Space wrap size={6}>
                            <Text strong>
                              {formatTime(item.arrivalTime)} · {item.name}
                            </Text>
                            {item.isMustVisit ? <Tag color="red">必去</Tag> : null}
                          </Space>
                          <Text type="secondary">建议停留 {item.stayDuration} 分钟</Text>
                        </Space>
                      </Space>
                    </List.Item>
                  )}
                />
              </div>
            ) : (
              <Empty
                style={{ marginTop: 18 }}
                description="生成后将在这里展示完整的一日游节奏、停留时长和分段导航入口。"
              />
            )}
          </Card>
        </Col>
      </Row>

      <Card
        variant="borderless"
        style={{ borderRadius: 20, marginTop: 16, boxShadow: '0 14px 34px rgba(15,23,42,0.08)' }}
      >
        <Title level={4} style={{ marginTop: 0 }}>
          4. 下一步执行
        </Title>
        <Space wrap>
          <Button type="primary" onClick={openPathPlanning}>
            去户外路径规划
          </Button>
          <Button onClick={() => navigate('/indoor-navigation')}>去室内导航</Button>
          <Button onClick={openFood} disabled={!selectedScenic}>
            去美食推荐
          </Button>
          <Button onClick={openQuery}>去景点查询</Button>
          <Button onClick={() => navigate('/social')}>去社交互动</Button>
          <Button onClick={() => navigate('/diary')}>去旅行日记</Button>
        </Space>
        <Paragraph type="secondary" style={{ marginTop: 10, marginBottom: 0 }}>
          如果你想先从榜单浏览，也可以直接返回 <Link to="/">首页</Link>。
        </Paragraph>
      </Card>
    </div>
  );
};

export default JourneyPlannerPage;
