import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, Col, Empty, Radio, Row, Skeleton, Space, Tag, Typography } from 'antd';
import { CompassOutlined, FireOutlined, StarOutlined } from '@ant-design/icons';
import PremiumPageHero from '../components/PremiumPageHero';
import { useAppDispatch, useAppSelector } from '../store';
import { getRankingAttractions, RankingType } from '../store/slices/recommendationSlice';
import { resolveScenicCoverPresentation } from '../utils/scenicPresentation';
import { replaceTianjinMedicalWithBupt } from '../utils/scenicPromotions';
import type { ScenicArea } from '../services/recommendationService';

const { Title, Paragraph, Text } = Typography;

const rankingTitleMap: Record<RankingType, string> = {
  popularity: '热度推荐',
  rating: '高评分优选',
  review: '好评热议',
  personalized: '个性化推荐',
};

const rankingDescMap: Record<RankingType, string> = {
  popularity: '这里按热度指数排序，展示顺序和热度标签保持一致。',
  rating: '这里按综合评分排序，展示顺序和评分标签保持一致。',
  review: '这里按评论量排序，展示顺序和评论标签保持一致。',
  personalized: '这里保留个性化推荐顺序，更适合浏览与你兴趣匹配的地点。',
};

const sectionTitleMap = {
  recommendation: '推荐总览',
  ranking: '榜单总览',
} as const;

const parseRankingType = (value: string | null): RankingType => {
  if (value === 'rating' || value === 'review' || value === 'personalized') {
    return value;
  }
  return 'popularity';
};

const parseSection = (value: string | null): 'recommendation' | 'ranking' => {
  return value === 'ranking' ? 'ranking' : 'recommendation';
};

const metricLabelMap: Record<Exclude<RankingType, 'personalized'>, string> = {
  popularity: '热度指数',
  rating: '综合评分',
  review: '评论量',
};

const toNumber = (value?: number | null) => Number(value || 0);

const getPrimaryMetricValue = (item: ScenicArea, rankingType: RankingType) => {
  if (rankingType === 'popularity') {
    return toNumber(item.popularity);
  }
  if (rankingType === 'rating') {
    return toNumber(item.averageRating || item.rating);
  }
  if (rankingType === 'review') {
    return toNumber(item.reviewCount);
  }
  return 0;
};

const getSortedScenicAreas = (items: ScenicArea[], rankingType: RankingType) => {
  if (rankingType === 'personalized') {
    return [...items];
  }

  return [...items].sort((left, right) => {
    const primaryDiff = getPrimaryMetricValue(right, rankingType) - getPrimaryMetricValue(left, rankingType);
    if (primaryDiff !== 0) {
      return primaryDiff;
    }
    return toNumber(right.popularity) - toNumber(left.popularity);
  });
};

const getPrimaryMetricText = (item: ScenicArea, rankingType: RankingType, index: number) => {
  if (rankingType === 'personalized') {
    return { label: '推荐位次', value: `TOP ${index + 1}` };
  }

  const label = metricLabelMap[rankingType];
  const value = getPrimaryMetricValue(item, rankingType);
  return {
    label,
    value: rankingType === 'rating' ? value.toFixed(2) : String(Math.round(value)),
  };
};

const getSecondaryMetricText = (item: ScenicArea, rankingType: RankingType) => {
  if (rankingType === 'popularity') {
    return { label: '客流量', value: String(toNumber(item.visitorCount)) };
  }
  if (rankingType === 'rating') {
    return { label: '评论量', value: String(toNumber(item.reviewCount)) };
  }
  if (rankingType === 'review') {
    return { label: '综合评分', value: toNumber(item.averageRating || item.rating).toFixed(2) };
  }
  return { label: '综合评分', value: toNumber(item.averageRating || item.rating).toFixed(2) };
};

const openScenicDestination = (navigate: ReturnType<typeof useNavigate>, item: ScenicArea) => {
  navigate(`/scenic-area/${item.id}`);
};

const openFoodDestination = (navigate: ReturnType<typeof useNavigate>, item: ScenicArea) => {
  navigate(`/food-recommendation/${item.id}`);
};

const ScenicOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { topAttractions, isLoading } = useAppSelector((state) => state.recommendation);

  const rankingType = parseRankingType(searchParams.get('type'));
  const section = parseSection(searchParams.get('section'));
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    dispatch(getRankingAttractions({ type: rankingType, limit: 200 }));
  }, [dispatch, rankingType]);

  useEffect(() => {
    setVisibleCount(24);
  }, [rankingType, section]);

  const list = useMemo(
    () => getSortedScenicAreas(replaceTianjinMedicalWithBupt(topAttractions), rankingType).slice(0, 200),
    [topAttractions, rankingType],
  );
  const topTen = useMemo(() => list.slice(0, 10), [list]);
  const visibleList = useMemo(() => list.slice(0, visibleCount), [list, visibleCount]);
  const heroPreview = topTen[0] ? resolveScenicCoverPresentation(topTen[0]) : null;

  const metrics = [
    { label: '当前模式', value: sectionTitleMap[section] },
    { label: '推荐策略', value: rankingTitleMap[rankingType] },
    { label: '总景区数', value: list.length },
    { label: '当前展示', value: `${Math.min(visibleCount, list.length)} / ${list.length}` },
  ];

  const updateParams = (nextType: RankingType, nextSection: 'recommendation' | 'ranking' = section) => {
    setSearchParams({ type: nextType, section: nextSection });
  };

  return (
    <div style={{ padding: 8, maxWidth: 1380, margin: '0 auto' }}>
      <PremiumPageHero
        title="景区总览"
        description={`这里会把当前策略下最值得浏览的景区与校园集中展示，便于你继续进入景区详情、路径规划和后续服务。${rankingDescMap[rankingType]}`}
        tags={['封面浏览', '前十推荐', '可继续浏览更多', '榜单与展示一致']}
        eyebrow={section === 'ranking' ? '榜单总览' : '推荐总览'}
        metrics={metrics}
        coverImageUrl={heroPreview?.coverImageUrl}
        coverLabel={heroPreview ? `封面示例 · ${topTen[0]?.name}` : '目的地预览'}
        actions={
          <Space wrap>
            <Button type="primary" onClick={() => navigate('/')}>
              返回首页
            </Button>
            <Button onClick={() => navigate('/journey')}>进入智能行程</Button>
            <Button onClick={() => navigate('/query?mode=scenic')}>打开查询中心</Button>
          </Space>
        }
      />

      <Card
        variant="borderless"
        style={{
          borderRadius: 24,
          marginBottom: 18,
          boxShadow: '0 18px 40px rgba(15,23,42,0.07)',
        }}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <Title level={3} style={{ marginBottom: 4 }}>
                当前浏览策略
              </Title>
              <Text type="secondary">切换热度、评分、好评和个性化策略，快速查看前十推荐与完整卡片总览。</Text>
            </div>
            <Space wrap>
              <Button type={section === 'recommendation' ? 'primary' : 'default'} onClick={() => updateParams(rankingType, 'recommendation')}>
                推荐总览
              </Button>
              <Button type={section === 'ranking' ? 'primary' : 'default'} onClick={() => updateParams(rankingType, 'ranking')}>
                榜单总览
              </Button>
            </Space>
          </div>

          <Radio.Group value={rankingType} onChange={(event) => updateParams(event.target.value as RankingType)} buttonStyle="solid">
            <Radio.Button value="popularity">热度</Radio.Button>
            <Radio.Button value="rating">评分</Radio.Button>
            <Radio.Button value="review">好评</Radio.Button>
            <Radio.Button value="personalized">个性化</Radio.Button>
          </Radio.Group>
        </Space>
      </Card>

      <Card
        variant="borderless"
        style={{
          borderRadius: 24,
          marginBottom: 18,
          boxShadow: '0 18px 40px rgba(15,23,42,0.07)',
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <Title level={3} style={{ marginBottom: 4 }}>
            前十推荐
          </Title>
          <Text type="secondary">这里展示当前策略下的前十名，编号顺序与展示指标严格对应。</Text>
        </div>

        {isLoading ? (
          <Skeleton active paragraph={{ rows: 10 }} />
        ) : topTen.length === 0 ? (
          <Empty description="暂无景区数据" />
        ) : (
          <Row gutter={[16, 16]}>
            {topTen.map((item, index) => {
              const presentation = resolveScenicCoverPresentation(item);
              const primaryMetric = getPrimaryMetricText(item, rankingType, index);
              const secondaryMetric = getSecondaryMetricText(item, rankingType);

              return (
                <Col key={`top-${item.id}`} xs={24} sm={12} xl={6}>
                  <Card
                    variant="borderless"
                    hoverable
                    style={{
                      borderRadius: 22,
                      overflow: 'hidden',
                      height: '100%',
                      boxShadow: '0 14px 30px rgba(15,23,42,0.08)',
                    }}
                    cover={
                      <div
                        style={{
                          height: 210,
                          padding: 14,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.06), rgba(15,23,42,0.74)), url(${presentation.coverImageUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          color: '#ffffff',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                          <Tag color="cyan">{presentation.cityLabel}</Tag>
                          <Tag color={index < 3 ? 'gold' : 'blue'}>TOP {index + 1}</Tag>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, marginBottom: 6, opacity: 0.9 }}>{presentation.coverImageTheme}</div>
                          <Title level={4} style={{ margin: 0, color: '#ffffff' }}>
                            {item.name}
                          </Title>
                        </div>
                      </div>
                    }
                    onClick={() => openScenicDestination(navigate, item)}
                  >
                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color="green">
                          {primaryMetric.label} {primaryMetric.value}
                        </Tag>
                        <Tag color="orange">
                          {secondaryMetric.label} {secondaryMetric.value}
                        </Tag>
                        <Tag color="blue">{item.category || '景区'}</Tag>
                      </Space>
                      <Paragraph ellipsis={{ rows: 2 }} type="secondary" style={{ marginBottom: 0, minHeight: 44 }}>
                        {item.description || '适合继续进入详情、导航与美食联动的推荐目的地。'}
                      </Paragraph>
                      <Button type="primary" block style={{ borderRadius: 999 }} onClick={() => openScenicDestination(navigate, item)}>
                        查看详情
                      </Button>
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>

      <Card
        variant="borderless"
        style={{
          borderRadius: 24,
          boxShadow: '0 18px 40px rgba(15,23,42,0.07)',
        }}
      >
        <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ marginBottom: 4 }}>
              完整卡片总览
            </Title>
            <Text type="secondary">当前库里共 {list.length} 个景区与校园，这里支持继续向下浏览更多卡片。</Text>
          </div>
          <Space wrap>
            <Tag color="purple">总数 {list.length}</Tag>
            <Tag color="blue">当前策略：{rankingTitleMap[rankingType]}</Tag>
          </Space>
        </div>

        {isLoading ? (
          <Skeleton active paragraph={{ rows: 12 }} />
        ) : visibleList.length === 0 ? (
          <Empty description="暂无总览数据" />
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {visibleList.map((item, index) => {
                const presentation = resolveScenicCoverPresentation(item);
                const primaryMetric = getPrimaryMetricText(item, rankingType, index);

                return (
                  <Col key={item.id} xs={24} sm={12} lg={8} xl={6}>
                    <Card
                      variant="borderless"
                      hoverable
                      style={{
                        borderRadius: 20,
                        overflow: 'hidden',
                        height: '100%',
                        boxShadow: '0 14px 28px rgba(15,23,42,0.08)',
                      }}
                      cover={
                        <div
                          style={{
                            height: 184,
                            backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.06), rgba(15,23,42,0.58)), url(${presentation.coverImageUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            padding: 14,
                            display: 'flex',
                            alignItems: 'flex-end',
                          }}
                        >
                          <div>
                            <Tag color="cyan" style={{ marginBottom: 8 }}>
                              {presentation.cityLabel}
                            </Tag>
                            <Title level={5} style={{ margin: 0, color: '#ffffff' }}>
                              {item.name}
                            </Title>
                          </div>
                        </div>
                      }
                      onClick={() => openScenicDestination(navigate, item)}
                    >
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <Text strong>{presentation.coverImageTheme}</Text>
                        <Text type="secondary">
                          {primaryMetric.label} {primaryMetric.value} · 评分 {toNumber(item.averageRating || item.rating).toFixed(2)}
                        </Text>
                        <Space wrap>
                          <Tag color="blue">{item.category || '景区'}</Tag>
                          <Tag color="gold">{rankingTitleMap[rankingType]}</Tag>
                        </Space>
                        <Space wrap>
                          <Button type="primary" icon={<CompassOutlined />} onClick={() => openScenicDestination(navigate, item)}>
                            详情
                          </Button>
                          <Button icon={<FireOutlined />} onClick={() => openFoodDestination(navigate, item)}>
                            美食
                          </Button>
                          <Button icon={<StarOutlined />} onClick={() => navigate('/journey')}>
                            行程
                          </Button>
                        </Space>
                      </Space>
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {visibleCount < list.length ? (
              <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center' }}>
                <Button type="primary" ghost style={{ borderRadius: 999 }} onClick={() => setVisibleCount((count) => Math.min(count + 24, list.length))}>
                  继续浏览更多景区
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
};

export default ScenicOverviewPage;
