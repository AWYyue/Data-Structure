import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, Col, Empty, Input, Row, Select, Space, Spin, Tabs, Tag, Typography } from 'antd';
import FoodieComponent from '../components/FoodieComponent';
import PremiumPageHero from '../components/PremiumPageHero';
import foodService, { type Food } from '../services/foodService';
import queryService from '../services/queryService';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const FONT_FAMILY = '"Source Han Sans SC","PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif';

const FoodRecommendationPage: React.FC = () => {
  const { scenicAreaId } = useParams<{ scenicAreaId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [foods, setFoods] = useState<Food[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [scenicAreaName, setScenicAreaName] = useState(searchParams.get('scenicName') || '');

  const fetchScenicName = useCallback(async () => {
    if (!scenicAreaId || scenicAreaName) {
      return;
    }

    try {
      const response = await queryService.getScenicAreaDetails(scenicAreaId);
      setScenicAreaName(response.data.scenicArea.name || '');
    } catch {
      setScenicAreaName('');
    }
  }, [scenicAreaId, scenicAreaName]);

  const fetchFoodRecommendations = useCallback(async () => {
    if (!scenicAreaId) {
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const response = await foodService.getFoodRecommendations(scenicAreaId, 20, selectedCuisine || undefined);
      if (response.success) {
        setFoods(response.data || []);
      } else {
        setError('获取美食推荐失败，请稍后重试。');
      }
    } catch {
      setError('网络异常，暂时无法加载美食推荐。');
    } finally {
      setIsLoading(false);
    }
  }, [scenicAreaId, selectedCuisine]);

  const fetchCuisines = useCallback(async () => {
    if (!scenicAreaId) {
      return;
    }

    try {
      const response = await foodService.getAllCuisines(scenicAreaId);
      if (response.success) {
        setCuisines(response.data || []);
      }
    } catch {
      setCuisines([]);
    }
  }, [scenicAreaId]);

  const handleSearch = useCallback(async () => {
    if (!scenicAreaId) {
      return;
    }

    const keyword = searchKeyword.trim();
    if (!keyword) {
      void fetchFoodRecommendations();
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const response = await foodService.fuzzySearchFood(keyword, scenicAreaId, 20);
      if (response.success) {
        setFoods(response.data || []);
      } else {
        setError('搜索失败，请稍后重试。');
      }
    } catch {
      setError('网络异常，暂时无法完成搜索。');
    } finally {
      setIsLoading(false);
    }
  }, [fetchFoodRecommendations, scenicAreaId, searchKeyword]);

  useEffect(() => {
    if (!scenicAreaId) {
      return;
    }
    void fetchFoodRecommendations();
    void fetchCuisines();
    void fetchScenicName();
  }, [fetchCuisines, fetchFoodRecommendations, fetchScenicName, scenicAreaId]);

  const highRatedCount = useMemo(
    () => foods.filter((item) => Number(item.averageRating || 0) >= 4.5).length,
    [foods],
  );
  const seasonalCount = useMemo(() => foods.filter((item) => item.isSeasonalSpecial).length, [foods]);
  const averageScore = useMemo(() => {
    if (!foods.length) {
      return 0;
    }
    return foods.reduce((sum, item) => sum + Number(item.averageRating || 0), 0) / foods.length;
  }, [foods]);

  const nextStepCards = [
    {
      title: '继续做路线规划',
      description: '从当前景区继续选择起终点，安排去餐厅、景点或出口的户外导航。',
      action: () => navigate(`/path-planning?scenicAreaId=${scenicAreaId}&scenicName=${encodeURIComponent(scenicAreaName)}`),
      actionLabel: '进入导航',
    },
    {
      title: '回到景区详情',
      description: '继续查看景区地图、设施、拍照点和室内导航入口。',
      action: () => navigate(`/scenic-area/${scenicAreaId}`),
      actionLabel: '查看详情',
    },
    {
      title: '记录旅行日记',
      description: '把这次美食体验和游览感受沉淀到日记里，也可以查看别人的游记。',
      action: () => navigate('/diary'),
      actionLabel: '去写日记',
    },
    {
      title: '去社交打卡',
      description: '把当前景区的美食和游玩体验延伸到签到、热点和组队互动。',
      action: () => navigate('/social'),
      actionLabel: '进入社交',
    },
  ];

  return (
    <div style={{ padding: 8, maxWidth: 1280, margin: '0 auto', fontFamily: FONT_FAMILY }}>
      <PremiumPageHero
        title={scenicAreaName ? `${scenicAreaName}美食推荐` : '景区美食推荐'}
        description="先了解当前景区的高分餐厅、热门小吃和时令特色，再把结果自然接到导航、景区详情、社交打卡和旅行日记。"
        accent="amber"
        tags={[
          scenicAreaName || `景区 ID：${scenicAreaId || '未识别'}`,
          '支持菜系筛选',
          '支持全文搜索',
          '支持后续链路衔接',
        ]}
        metrics={[
          { label: '推荐菜品', value: foods.length, suffix: '道' },
          { label: '高分菜品', value: highRatedCount, suffix: '道' },
          { label: '时令特色', value: seasonalCount, suffix: '道' },
          { label: '平均评分', value: averageScore.toFixed(1) },
        ]}
        actions={
          <Space wrap>
            <Button type="primary" onClick={() => navigate(`/scenic-area/${scenicAreaId}`)}>
              返回景区详情
            </Button>
            <Button onClick={() => navigate(`/path-planning?scenicAreaId=${scenicAreaId}&scenicName=${encodeURIComponent(scenicAreaName)}`)}>
              继续路线规划
            </Button>
            <Button onClick={() => void fetchFoodRecommendations()} loading={isLoading}>
              刷新推荐
            </Button>
          </Space>
        }
      />

      <Tabs
        defaultActiveKey="recommendation"
        items={[
          {
            key: 'recommendation',
            label: '推荐列表',
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Card
                  variant="borderless"
                  style={{
                    borderRadius: 18,
                    background: 'rgba(255,255,255,0.94)',
                    boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
                  }}
                >
                  <Row gutter={[12, 12]}>
                    <Col xs={24} md={8}>
                      <Text type="secondary">菜系筛选</Text>
                      <Select
                        style={{ width: '100%', marginTop: 8 }}
                        value={selectedCuisine}
                        onChange={setSelectedCuisine}
                        options={[
                          { label: '全部菜系', value: '' },
                          ...cuisines.map((item) => ({ label: item, value: item })),
                        ]}
                      />
                    </Col>
                    <Col xs={24} md={10}>
                      <Text type="secondary">关键词搜索</Text>
                      <Search
                        style={{ marginTop: 8 }}
                        placeholder="输入菜名、口味或餐饮设施名称"
                        value={searchKeyword}
                        onChange={(event) => setSearchKeyword(event.target.value)}
                        onSearch={() => void handleSearch()}
                        enterButton="搜索"
                      />
                    </Col>
                    <Col xs={24} md={6}>
                      <Text type="secondary">数据摘要</Text>
                      <div style={{ marginTop: 8 }}>
                        <Space wrap>
                          <Tag color="blue">菜系 {cuisines.length}</Tag>
                          <Tag color="green">高分 {highRatedCount}</Tag>
                          <Tag color="red">时令 {seasonalCount}</Tag>
                        </Space>
                      </div>
                    </Col>
                  </Row>
                </Card>

                {error ? <Alert type="error" showIcon message={error} /> : null}

                {isLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '56px 0' }}>
                    <Spin size="large" />
                  </div>
                ) : foods.length === 0 ? (
                  <Empty description="当前条件下暂无可展示的美食推荐">
                    <Button
                      onClick={() => {
                        setSelectedCuisine('');
                        setSearchKeyword('');
                        void fetchFoodRecommendations();
                      }}
                    >
                      重置筛选
                    </Button>
                  </Empty>
                ) : (
                  <Row gutter={[16, 16]}>
                    {foods.map((food) => (
                      <Col key={food.id} xs={24} sm={12} md={8} xl={6}>
                        <Card
                          hoverable
                          variant="borderless"
                          style={{
                            height: '100%',
                            borderRadius: 18,
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,251,235,0.74))',
                            boxShadow: '0 12px 28px rgba(15,23,42,0.08)',
                          }}
                        >
                          <Space direction="vertical" size={10} style={{ width: '100%' }}>
                            <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
                              <Title level={4} style={{ margin: 0 }}>
                                {food.name}
                              </Title>
                              {food.isSeasonalSpecial ? <Tag color="red">时令特色</Tag> : null}
                            </Space>
                            <Text type="secondary">{food.description || '暂无菜品说明'}</Text>
                            <Space wrap>
                              <Tag color="blue">{food.cuisine}</Tag>
                              <Tag color="green">评分 {food.averageRating}</Tag>
                              <Tag color="orange">热度 {food.popularity}</Tag>
                            </Space>
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                              <Text strong>价格：￥{food.price || 0}</Text>
                              <Text type="secondary">所在设施：{food.facility?.name || '未知设施'}</Text>
                              <Text type="secondary">评价数量：{food.reviewCount || 0}</Text>
                            </Space>
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}

                <Card
                  variant="borderless"
                  style={{
                    borderRadius: 18,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,250,252,0.96))',
                    boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
                  }}
                >
                  <Space direction="vertical" size={14} style={{ width: '100%' }}>
                    <div>
                      <Title level={4} style={{ marginBottom: 4 }}>
                        用餐后的下一步
                      </Title>
                      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                        这里不只是一个美食列表，而是把吃、逛、导航、社交和内容沉淀自然串到一起。
                      </Paragraph>
                    </div>
                    <Row gutter={[16, 16]}>
                      {nextStepCards.map((item) => (
                        <Col key={item.title} xs={24} md={12} xl={6}>
                          <Card
                            variant="borderless"
                            style={{
                              height: '100%',
                              borderRadius: 16,
                              background: 'rgba(255,255,255,0.92)',
                              boxShadow: '0 8px 20px rgba(15,23,42,0.05)',
                            }}
                          >
                            <Space direction="vertical" size={10} style={{ width: '100%' }}>
                              <Title level={5} style={{ margin: 0 }}>
                                {item.title}
                              </Title>
                              <Paragraph type="secondary" style={{ margin: 0 }}>
                                {item.description}
                              </Paragraph>
                              <Button type="primary" onClick={item.action}>
                                {item.actionLabel}
                              </Button>
                            </Space>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </Space>
                </Card>
              </Space>
            ),
          },
          {
            key: 'foodie',
            label: '路线与打卡',
            children: <FoodieComponent scenicAreaId={scenicAreaId || '1'} />,
          },
        ]}
      />
    </div>
  );
};

export default FoodRecommendationPage;
