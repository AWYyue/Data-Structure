import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  InputNumber,
  List,
  Progress,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  FireOutlined,
  GiftOutlined,
  ShopOutlined,
  StarFilled,
  ThunderboltOutlined,
} from '@ant-design/icons';
import MapComponent from './MapComponent';
import {
  foodieService,
  type BusinessHourReminder,
  type FoodChecklist,
  type FoodCombination,
  type FoodMapData,
  type FoodRouteData,
} from '../services/foodieService';

const { Title, Text, Paragraph } = Typography;

type ViewTab = 'map' | 'route' | 'checklist' | 'combos';

interface FoodieComponentProps {
  scenicAreaId: string;
}

const FONT_FAMILY = '"Source Han Sans SC","PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif';

const reminderTypeMap: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  open: 'success',
  close_soon: 'warning',
  closed: 'error',
  not_opened: 'info',
};

const FoodieComponent: React.FC<FoodieComponentProps> = ({ scenicAreaId }) => {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState<ViewTab>('map');
  const [foodMap, setFoodMap] = useState<FoodMapData | null>(null);
  const [foodRoute, setFoodRoute] = useState<FoodRouteData | null>(null);
  const [foodChecklist, setFoodChecklist] = useState<FoodChecklist | null>(null);
  const [foodCombinations, setFoodCombinations] = useState<FoodCombination[]>([]);
  const [reminders, setReminders] = useState<BusinessHourReminder[]>([]);
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [routeDuration, setRouteDuration] = useState(120);
  const [checkedFoodIds, setCheckedFoodIds] = useState<string[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [loadingCombos, setLoadingCombos] = useState(false);
  const [loadingReminders, setLoadingReminders] = useState(false);

  const allFoods = useMemo(
    () => (foodMap ? foodMap.facilities.flatMap((facility) => facility.foods) : []),
    [foodMap],
  );

  const checklistProgress = useMemo(() => {
    if (!foodChecklist || foodChecklist.totalItems === 0) {
      return 0;
    }
    return Math.round((checkedFoodIds.length / foodChecklist.totalItems) * 100);
  }, [checkedFoodIds.length, foodChecklist]);

  useEffect(() => {
    const loadFoodMap = async () => {
      setLoadingMap(true);
      try {
        const data = await foodieService.getFoodMap(scenicAreaId);
        setFoodMap(data);
        const firstFacility = data.facilities[0];
        setSelectedFacilityId(firstFacility?.id || '');
        setSelectedFoodId(firstFacility?.foods[0]?.id || '');
      } catch (error) {
        console.error('加载美食地图失败:', error);
        message.error('加载美食地图失败，请稍后重试。');
      } finally {
        setLoadingMap(false);
      }
    };

    if (scenicAreaId) {
      setFoodRoute(null);
      setFoodChecklist(null);
      setFoodCombinations([]);
      setReminders([]);
      setCheckedFoodIds([]);
      void loadFoodMap();
    }
  }, [message, scenicAreaId]);

  const handlePlanRoute = async () => {
    setLoadingRoute(true);
    try {
      const route = await foodieService.planFoodRoute(scenicAreaId, routeDuration);
      setFoodRoute(route);
      if (!route.stops.length) {
        message.warning('当前景区可规划的美食站点较少，建议先补充更多餐饮数据。');
      } else {
        message.success(`已生成 ${route.stops.length} 站美食路线。`);
      }
    } catch (error) {
      console.error('规划美食路线失败:', error);
      message.error('规划美食路线失败，请稍后重试。');
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleGenerateChecklist = async () => {
    setLoadingChecklist(true);
    try {
      const checklist = await foodieService.generateFoodChecklist(scenicAreaId);
      setFoodChecklist(checklist);
      setCheckedFoodIds([]);
      message.success('美食打卡清单已生成。');
    } catch (error) {
      console.error('生成打卡清单失败:', error);
      message.error('生成打卡清单失败，请稍后重试。');
    } finally {
      setLoadingChecklist(false);
    }
  };

  const handleLoadReminders = async () => {
    if (!selectedFacilityId) {
      message.warning('请先选择店铺。');
      return;
    }
    setLoadingReminders(true);
    try {
      const result = await foodieService.getBusinessHourReminders(selectedFacilityId);
      setReminders(result);
    } catch (error) {
      console.error('获取营业提醒失败:', error);
      message.error('获取营业提醒失败，请稍后重试。');
    } finally {
      setLoadingReminders(false);
    }
  };

  const handleLoadCombinations = async () => {
    setLoadingCombos(true);
    try {
      const result = await foodieService.recommendFoodCombination(scenicAreaId, selectedFoodId || undefined);
      setFoodCombinations(result);
    } catch (error) {
      console.error('获取组合推荐失败:', error);
      message.error('获取组合推荐失败，请稍后重试。');
    } finally {
      setLoadingCombos(false);
    }
  };

  const toggleChecklistItem = (foodId: string) => {
    setCheckedFoodIds((prev) =>
      prev.includes(foodId) ? prev.filter((id) => id !== foodId) : [...prev, foodId],
    );
  };

  const mapMarkers = useMemo(() => {
    if (!foodMap) {
      return [];
    }
    return foodMap.facilities.map((facility) => ({
      id: facility.id,
      position: [facility.location.latitude, facility.location.longitude] as [number, number],
      title: `${facility.name}\n推荐菜品 ${facility.foods.filter((food) => food.isRecommended).length} 道`,
      type: 'default',
    }));
  }, [foodMap]);

  const routeMarkers = useMemo(() => {
    if (!foodRoute) {
      return [];
    }
    return foodRoute.stops.map((stop, index) => ({
      id: stop.facilityId,
      position: [stop.location.latitude, stop.location.longitude] as [number, number],
      title: `${index + 1}. ${stop.facilityName}`,
      type: index === 0 ? 'start' : index === foodRoute.stops.length - 1 ? 'end' : 'default',
    }));
  }, [foodRoute]);

  return (
    <div style={{ fontFamily: FONT_FAMILY, padding: '8px 0 20px' }}>
      <Card
        variant="borderless"
        style={{
          borderRadius: 20,
          marginBottom: 16,
          background:
            'linear-gradient(140deg, rgba(249,250,251,0.95) 0%, rgba(239,246,255,0.96) 45%, rgba(255,247,237,0.96) 100%)',
          boxShadow: '0 14px 34px rgba(15,23,42,0.08)',
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Space direction="vertical" size={6}>
              <Title level={3} style={{ margin: 0 }}>
                美食探索中心
              </Title>
              <Text type="secondary">把美食地图、路线规划、打卡清单和组合推荐放在同一个入口里，方便边逛边吃。</Text>
            </Space>
          </Col>
          <Col xs={12} md={4}>
            <Statistic title="餐饮点位" value={foodMap?.stats.facilityCount ?? 0} prefix={<ShopOutlined />} />
          </Col>
          <Col xs={12} md={4}>
            <Statistic title="菜品总数" value={foodMap?.stats.foodCount ?? 0} prefix={<GiftOutlined />} />
          </Col>
          <Col xs={12} md={6}>
            <Statistic title="推荐菜品" value={foodMap?.stats.recommendedCount ?? 0} prefix={<FireOutlined />} />
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
          onChange={(value) => setActiveTab(value as ViewTab)}
          options={[
            { label: '美食地图', value: 'map', icon: <EnvironmentOutlined /> },
            { label: '路线规划', value: 'route', icon: <ThunderboltOutlined /> },
            { label: '打卡清单', value: 'checklist', icon: <CheckCircleOutlined /> },
            { label: '组合推荐', value: 'combos', icon: <StarFilled /> },
          ]}
        />
      </Card>

      {activeTab === 'map' ? (
        <Spin spinning={loadingMap}>
          {!foodMap ? (
            <Empty description="当前暂无美食地图数据" />
          ) : (
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={14}>
                <Card
                  variant="borderless"
                  style={{
                    borderRadius: 18,
                    background: 'rgba(255,255,255,0.94)',
                    boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
                  }}
                >
                  <MapComponent
                    center={[foodMap.center.latitude, foodMap.center.longitude]}
                    zoom={16}
                    markers={mapMarkers}
                    baseMapMode="scenic"
                  />
                </Card>
              </Col>
              <Col xs={24} lg={10}>
                <Card
                  title="店铺与营业提醒"
                  variant="borderless"
                  style={{
                    borderRadius: 18,
                    background: 'rgba(255,255,255,0.96)',
                    boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
                  }}
                >
                  <Space direction="vertical" size={10} style={{ width: '100%' }}>
                    <Select
                      value={selectedFacilityId || undefined}
                      placeholder="选择一个餐饮点位"
                      style={{ width: '100%' }}
                      options={foodMap.facilities.map((facility) => ({
                        value: facility.id,
                        label: facility.name,
                      }))}
                      onChange={setSelectedFacilityId}
                    />
                    <Button
                      block
                      type="primary"
                      icon={<ClockCircleOutlined />}
                      loading={loadingReminders}
                      onClick={handleLoadReminders}
                    >
                      查看营业提醒
                    </Button>
                  </Space>

                  {reminders.length > 0 ? (
                    <div style={{ marginTop: 16 }}>
                      {reminders.map((item) => (
                        <Alert
                          key={`${item.facilityId}-${item.status}`}
                          type={reminderTypeMap[item.status || 'open'] || 'info'}
                          showIcon
                          message={item.facilityName}
                          description={item.message}
                          style={{ marginBottom: 10 }}
                        />
                      ))}
                    </div>
                  ) : (
                    <Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
                      选择店铺后可以查看当前是否营业、距离开门多久或是否快要打烊。
                    </Paragraph>
                  )}

                  <List
                    style={{ marginTop: 10 }}
                    dataSource={foodMap.facilities}
                    locale={{ emptyText: '暂无店铺数据' }}
                    renderItem={(facility) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Space>
                              <Text strong>{facility.name}</Text>
                              <Badge
                                count={facility.foods.filter((food) => food.isRecommended).length}
                                style={{ backgroundColor: '#2563eb' }}
                              />
                            </Space>
                          }
                          description={
                            <Space wrap>
                              <Tag color="blue">{facility.category}</Tag>
                              {facility.foods
                                .filter((food) => food.isRecommended)
                                .slice(0, 2)
                                .map((food) => (
                                  <Tag key={food.id} color="gold">
                                    {food.name}
                                  </Tag>
                                ))}
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>
          )}
        </Spin>
      ) : null}

      {activeTab === 'route' ? (
        <Card
          variant="borderless"
          style={{
            borderRadius: 18,
            boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
            background: 'rgba(255,255,255,0.96)',
          }}
        >
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={8}>
              <Text type="secondary">可用时长（分钟）</Text>
              <InputNumber
                min={60}
                max={360}
                step={15}
                value={routeDuration}
                style={{ width: '100%', marginTop: 8 }}
                onChange={(value) => setRouteDuration(Number(value || 120))}
              />
            </Col>
            <Col xs={24} md={8}>
              <Button type="primary" size="large" loading={loadingRoute} onClick={handlePlanRoute} block>
                生成美食路线
              </Button>
            </Col>
            <Col xs={12} md={4}>
              <Statistic title="总距离" value={foodRoute?.totalDistance ?? 0} precision={0} suffix="米" />
            </Col>
            <Col xs={12} md={4}>
              <Statistic title="预计时长" value={foodRoute?.estimatedTime ?? 0} suffix="分钟" />
            </Col>
          </Row>

          {!foodRoute ? (
            <Empty style={{ marginTop: 30 }} description="点击上方按钮生成一条适合当前景区的美食路线" />
          ) : (
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={24} lg={14}>
                <MapComponent
                  center={
                    foodRoute.path[0]
                      ? foodRoute.path[0]
                      : [foodMap?.center.latitude || 39.9042, foodMap?.center.longitude || 116.4074]
                  }
                  zoom={16}
                  markers={routeMarkers}
                  path={foodRoute.path}
                  baseMapMode="scenic"
                />
              </Col>
              <Col xs={24} lg={10}>
                <Card
                  title={foodRoute.name}
                  variant="borderless"
                  style={{ borderRadius: 14, background: 'rgba(248,250,252,0.9)' }}
                >
                  <List
                    dataSource={foodRoute.stops}
                    locale={{ emptyText: '暂无站点' }}
                    renderItem={(stop, index) => (
                      <List.Item>
                        <List.Item.Meta
                          title={`${index + 1}. ${stop.facilityName}`}
                          description={
                            <Space direction="vertical" size={4}>
                              <Text type="secondary">预计到达：第 {stop.arrivalMinute} 分钟</Text>
                              <Space wrap>
                                {stop.foods.map((food) => (
                                  <Tag key={food.id} color="geekblue">
                                    {food.name}
                                  </Tag>
                                ))}
                              </Space>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>
          )}
        </Card>
      ) : null}

      {activeTab === 'checklist' ? (
        <Card
          variant="borderless"
          style={{
            borderRadius: 18,
            boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
            background: 'rgba(255,255,255,0.96)',
          }}
        >
          <Space style={{ marginBottom: 16 }} size={12}>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={loadingChecklist}
              onClick={handleGenerateChecklist}
            >
              生成打卡清单
            </Button>
            <Text type="secondary">优先覆盖高评分、高热度和必吃菜品，适合边走边打卡。</Text>
          </Space>

          {!foodChecklist ? (
            <Empty description="尚未生成清单" />
          ) : (
            <>
              <Title level={4} style={{ marginTop: 0 }}>
                {foodChecklist.name}
              </Title>
              <Progress
                percent={checklistProgress}
                format={() => `${checkedFoodIds.length}/${foodChecklist.totalItems}`}
                strokeColor={{ from: '#2563eb', to: '#f59e0b' }}
                style={{ marginBottom: 14 }}
              />
              <List
                dataSource={foodChecklist.foods}
                renderItem={(food) => {
                  const checked = checkedFoodIds.includes(food.id);
                  return (
                    <List.Item
                      actions={[
                        <Button
                          key={food.id}
                          type={checked ? 'primary' : 'default'}
                          onClick={() => toggleChecklistItem(food.id)}
                        >
                          {checked ? '已完成' : '标记打卡'}
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space wrap>
                            <Text strong>{food.name}</Text>
                            {food.isMustTry ? <Tag color="volcano">必吃</Tag> : null}
                            <Tag color="green">评分 {food.rating.toFixed(1)}</Tag>
                          </Space>
                        }
                        description={
                          <Space wrap>
                            <Text type="secondary">{food.facilityName}</Text>
                            <Tag color="blue">{food.cuisine}</Tag>
                            <Tag>￥{food.price.toFixed(0)}</Tag>
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            </>
          )}
        </Card>
      ) : null}

      {activeTab === 'combos' ? (
        <Card
          variant="borderless"
          style={{
            borderRadius: 18,
            boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
            background: 'rgba(255,255,255,0.96)',
          }}
        >
          <Row gutter={[12, 12]} align="middle" style={{ marginBottom: 14 }}>
            <Col xs={24} md={12}>
              <Select
                style={{ width: '100%' }}
                value={selectedFoodId || undefined}
                placeholder="选择一个基准菜品（可选）"
                onChange={setSelectedFoodId}
                options={allFoods.map((food) => ({
                  value: food.id,
                  label: `${food.name} · ${food.facilityName}`,
                }))}
              />
            </Col>
            <Col xs={24} md={6}>
              <Button type="primary" block loading={loadingCombos} onClick={handleLoadCombinations}>
                获取组合推荐
              </Button>
            </Col>
            <Col xs={24} md={6}>
              <Text type="secondary">根据口味、评分和价格，给出更适合一起体验的组合。</Text>
            </Col>
          </Row>

          {loadingCombos ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <Spin />
            </div>
          ) : foodCombinations.length === 0 ? (
            <Empty description="暂无组合推荐，点击按钮生成" />
          ) : (
            <Row gutter={[16, 16]}>
              {foodCombinations.map((combo) => (
                <Col key={combo.id} xs={24} md={12} xl={8}>
                  <Card
                    variant="borderless"
                    style={{
                      borderRadius: 14,
                      height: '100%',
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(248,250,252,0.9))',
                      boxShadow: '0 8px 20px rgba(15,23,42,0.06)',
                    }}
                  >
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Space>
                        <Text strong>{combo.name}</Text>
                        <Tag color="gold">热度 {combo.popularity}</Tag>
                      </Space>
                      <Text type="secondary">{combo.description}</Text>
                      <List
                        size="small"
                        dataSource={combo.foods}
                        renderItem={(item) => (
                          <List.Item style={{ paddingLeft: 0, paddingRight: 0 }}>
                            <Text>
                              {item.name} · {item.facilityName}
                            </Text>
                            <Text strong>￥{item.price.toFixed(0)}</Text>
                          </List.Item>
                        )}
                      />
                      <Text strong>组合总价：￥{combo.totalPrice.toFixed(0)}</Text>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card>
      ) : null}
    </div>
  );
};

export default FoodieComponent;
