import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  App,
  AutoComplete,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  List,
  Radio,
  Row,
  Select,
  Skeleton,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { AimOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PremiumPageHero from '../components/PremiumPageHero';
import useCurrentLocation from '../hooks/useCurrentLocation';
import queryService, { Attraction, Facility } from '../services/queryService';
import { RootState, useAppDispatch, useAppSelector } from '../store';
import { searchFacilities, searchFood, searchScenicAreas } from '../store/slices/querySlice';
import { resolveErrorMessage } from '../utils/errorMessage';
import { resolveScenicCoverPresentation } from '../utils/scenicPresentation';

const { Title, Text, Paragraph } = Typography;

type SearchType = 'scenic' | 'facility' | 'food';
type SearchFormValues = { keyword?: string };
type ScenicSuggestionOption = { value: string };

interface QueryCenter {
  name: string;
  latitude: number;
  longitude: number;
  source: 'selected_place' | 'current_location';
}

const quickKeywords: Record<SearchType, string[]> = {
  scenic: ['校园', '古镇', '博物馆', '中心广场'],
  facility: ['卫生间', '游客中心', '停车场', '便利店'],
  food: ['小吃', '咖啡', '川菜', '特色餐厅'],
};

const typeLabelMap: Record<SearchType, string> = {
  scenic: '景区',
  facility: '设施',
  food: '美食',
};

const radiusOptions = [0.3, 0.5, 0.8, 1.2];
const scenicMinRatingOptions = [4.5, 4.0, 3.5];

const scenicCardTone = [
  'linear-gradient(135deg, rgba(109,93,252,0.92), rgba(56,189,248,0.42))',
  'linear-gradient(135deg, rgba(34,197,94,0.86), rgba(45,212,191,0.36))',
  'linear-gradient(135deg, rgba(251,146,60,0.92), rgba(251,191,36,0.4))',
  'linear-gradient(135deg, rgba(244,114,182,0.88), rgba(129,140,248,0.36))',
];

const scenicBadgePool = ['热门推荐', '高评分', '适合游览', '值得打卡', '校园漫游', '综合服务'];

const parseNumber = (value: string | null) => {
  const parsed = Number(value || '');
  return Number.isFinite(parsed) ? parsed : null;
};

const QueryPage: React.FC = () => {
  const [form] = Form.useForm<SearchFormValues>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchType, setSearchType] = useState<SearchType>('scenic');
  const [scenicAreaId, setScenicAreaId] = useState('');
  const [scenicAreaName, setScenicAreaName] = useState('');
  const [centerPoint, setCenterPoint] = useState<QueryCenter | null>(null);
  const [radiusKm, setRadiusKm] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [selectedScenicCategories, setSelectedScenicCategories] = useState<string[]>([]);
  const [minimumScenicRating, setMinimumScenicRating] = useState<number | null>(null);
  const [scenicCategoryOptions, setScenicCategoryOptions] = useState<string[]>([]);
  const [scenicSuggestions, setScenicSuggestions] = useState<ScenicSuggestionOption[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { scenicAreas, facilities, foods, isLoading, error } = useAppSelector((state: RootState) => state.query);
  const {
    location: rawCurrentLocation,
    error: currentLocationError,
    isLoading: resolvingCurrentLocation,
    requestLocation: requestCurrentLocation,
    getLatestError: getLatestCurrentLocationError,
  } = useCurrentLocation({
    autoRequest: true,
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 60000,
  });

  const busy = loading || isLoading;
  const scenicKeyword = Form.useWatch('keyword', form) || '';
  const hasScenicFilterCriteria = selectedScenicCategories.length > 0 || minimumScenicRating !== null;
  const currentLocationCenter = useMemo<QueryCenter | null>(
    () =>
      rawCurrentLocation
        ? {
            name: '当前位置',
            latitude: rawCurrentLocation.latitude,
            longitude: rawCurrentLocation.longitude,
            source: 'current_location',
          }
        : null,
    [rawCurrentLocation],
  );

  useEffect(() => {
    let cancelled = false;

    const loadScenicCategories = async () => {
      try {
        const response = await queryService.getScenicAreaCategories();
        if (!cancelled) {
          const categories = Array.isArray(response.data) && response.data.length > 0 ? response.data : ['景区', '校园'];
          setScenicCategoryOptions(categories);
        }
      } catch {
        if (!cancelled) {
          setScenicCategoryOptions(['景区', '校园']);
        }
      }
    };

    void loadScenicCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (searchType !== 'scenic') {
      setScenicSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    const prefix = scenicKeyword.trim();
    if (!prefix) {
      setScenicSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const response = await queryService.searchScenicAreaSuggestions(prefix, 8);
        if (!cancelled) {
          setScenicSuggestions((response.data || []).map((item) => ({ value: item })));
        }
      } catch {
        if (!cancelled) {
          setScenicSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingSuggestions(false);
        }
      }
    }, 240);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [scenicKeyword, searchType]);

  const results = useMemo(() => {
    if (searchType === 'scenic') return scenicAreas;
    if (searchType === 'facility') return facilities;
    return foods;
  }, [facilities, foods, scenicAreas, searchType]);

  const syncSearchParams = (
    nextType: SearchType,
    keyword: string,
    nextScenicAreaId: string,
    nextScenicAreaName: string,
    nextCenter: QueryCenter | null,
    nextRadiusKm: number,
    nextScenicCategories: string[] = selectedScenicCategories,
    nextMinimumScenicRating: number | null = minimumScenicRating,
  ) => {
    const next = new URLSearchParams();
    next.set('mode', nextType);
    if (keyword.trim()) next.set('keyword', keyword.trim());
    if (nextScenicAreaId) next.set('scenicAreaId', nextScenicAreaId);
    if (nextScenicAreaName) next.set('scenicName', nextScenicAreaName);
    if (nextCenter) {
      next.set('centerName', nextCenter.name);
      next.set('centerLat', String(nextCenter.latitude));
      next.set('centerLng', String(nextCenter.longitude));
      next.set('centerSource', nextCenter.source);
    }
    if (nextType === 'scenic') {
      nextScenicCategories.forEach((category) => next.append('category', category));
      if (typeof nextMinimumScenicRating === 'number') {
        next.set('minRating', String(nextMinimumScenicRating));
      }
    }
    if (nextType === 'facility') {
      next.set('radiusKm', String(nextRadiusKm));
    }
    setSearchParams(next);
  };

  const runSearch = async (
    type: SearchType,
    rawKeyword: string,
    nextScenicAreaId = scenicAreaId,
    nextCenter = centerPoint,
    nextRadiusKm = radiusKm,
    nextScenicCategories = selectedScenicCategories,
    nextMinimumScenicRating = minimumScenicRating,
  ) => {
    const keyword = rawKeyword.trim();
    setLoading(true);

    try {
      if (type === 'scenic') {
        if (!keyword && nextScenicCategories.length === 0 && nextMinimumScenicRating === null) {
          message.warning('请输入景区名称，或至少选择一个景区筛选条件。');
          return;
        }
        await dispatch(
          searchScenicAreas({
            name: keyword || undefined,
            categories: nextScenicCategories,
            minRating: nextMinimumScenicRating ?? undefined,
            limit: 24,
          }),
        ).unwrap();
        return;
      }

      if (type === 'facility') {
        if (!keyword && !nextScenicAreaId) {
          message.warning('请输入设施类别名称，或先限定景区范围。');
          return;
        }
        await dispatch(
          searchFacilities({
            type: keyword || undefined,
            scenicAreaId: nextScenicAreaId || undefined,
            latitude: nextCenter?.latitude,
            longitude: nextCenter?.longitude,
            radiusKm: nextRadiusKm,
            limit: 30,
          }),
        ).unwrap();
        return;
      }

      if (!keyword) {
        message.warning('请输入美食关键字。');
        return;
      }
      await dispatch(searchFood({ query: keyword, limit: 18 })).unwrap();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const mode = searchParams.get('mode');
    const keyword = searchParams.get('keyword') || '';
    const nextType: SearchType = mode === 'facility' || mode === 'food' ? mode : 'scenic';
    const nextScenicAreaId = searchParams.get('scenicAreaId') || '';
    const nextScenicAreaName = searchParams.get('scenicName') || '';
    const centerLat = parseNumber(searchParams.get('centerLat'));
    const centerLng = parseNumber(searchParams.get('centerLng'));
    const centerName = searchParams.get('centerName') || '';
    const centerSource = searchParams.get('centerSource') === 'current_location' ? 'current_location' : 'selected_place';
    const nextRadiusKm = parseNumber(searchParams.get('radiusKm')) || 0.5;
    const nextScenicCategories = searchParams.getAll('category').filter(Boolean);
    const nextMinimumScenicRating = parseNumber(searchParams.get('minRating'));
    const nextCenter: QueryCenter | null =
      centerLat !== null && centerLng !== null
        ? {
            name: centerName || '已选地点',
            latitude: centerLat,
            longitude: centerLng,
            source: centerSource,
          }
        : null;

    setSearchType(nextType);
    setScenicAreaId(nextScenicAreaId);
    setScenicAreaName(nextScenicAreaName);
    setCenterPoint(nextCenter);
    setRadiusKm(nextRadiusKm);
    setSelectedScenicCategories(nextScenicCategories);
    setMinimumScenicRating(nextMinimumScenicRating);
    form.setFieldsValue({ keyword });

    if (
      keyword ||
      (nextType === 'facility' && (nextScenicAreaId || nextCenter)) ||
      (nextType === 'scenic' && (nextScenicCategories.length > 0 || nextMinimumScenicRating !== null))
    ) {
      void runSearch(
        nextType,
        keyword,
        nextScenicAreaId,
        nextCenter,
        nextRadiusKm,
        nextScenicCategories,
        nextMinimumScenicRating,
      );
    }
  }, [form, searchParams]);

  const currentHint = useMemo(() => {
    if (searchType === 'facility') {
      return centerPoint
        ? `当前会以“${centerPoint.name}”为中心，在 ${radiusKm.toFixed(1)} 公里范围内查找设施，并优先按真实路网距离排序。`
        : scenicAreaName
        ? `当前会优先在“${scenicAreaName}”范围内查找设施；如果提供中心点，还会在附近范围内按路网距离继续排序。`
        : '支持输入设施类别名称查找附近服务设施，并按真实路网距离优先排序；也可以直接使用当前位置作为查询中心。';
    }

    if (searchType === 'food') {
      return '支持按菜系、店名和关键字检索美食，并继续跳转到景区美食页、旅行日记和导航模块。';
    }

    return '支持景区名称前缀联想、类别过滤和最低评分筛选；输入名称时会优先走 Trie 前缀检索，再继续进入详情、附近设施和导航模块。';
  }, [centerPoint, radiusKm, scenicAreaName, searchType]);

  const resultSummaryText =
    searchType === 'scenic'
      ? '这里会展示符合名称前缀、类别和评分条件的景区结果；你可以继续进入详情，或者以某个结果为中心查附近设施。'
      : searchType === 'facility'
      ? '设施结果会优先按真实路网距离排序；如果路网不可用，才回退到直线距离。'
      : '找到美食后，可以继续进入景区详情、美食推荐页和旅行日记。';

  const handleSubmit = async (values: SearchFormValues) => {
    const keyword = (values.keyword || '').trim();
    syncSearchParams(
      searchType,
      keyword,
      scenicAreaId,
      scenicAreaName,
      centerPoint,
      radiusKm,
      selectedScenicCategories,
      minimumScenicRating,
    );
    await runSearch(
      searchType,
      keyword,
      scenicAreaId,
      centerPoint,
      radiusKm,
      selectedScenicCategories,
      minimumScenicRating,
    );
  };

  const handleQuickKeyword = async (keyword: string) => {
    form.setFieldsValue({ keyword });
    syncSearchParams(
      searchType,
      keyword,
      scenicAreaId,
      scenicAreaName,
      centerPoint,
      radiusKm,
      selectedScenicCategories,
      minimumScenicRating,
    );
    await runSearch(
      searchType,
      keyword,
      scenicAreaId,
      centerPoint,
      radiusKm,
      selectedScenicCategories,
      minimumScenicRating,
    );
  };

  const handleSearchTypeChange = (value: SearchType) => {
    setSearchType(value);
    const keyword = form.getFieldValue('keyword') || '';
    syncSearchParams(
      value,
      keyword,
      scenicAreaId,
      scenicAreaName,
      centerPoint,
      radiusKm,
      selectedScenicCategories,
      minimumScenicRating,
    );
  };

  const handleUseCurrentLocationAsCenter = async () => {
    let nextCenter = currentLocationCenter;
    if (!nextCenter) {
      const nextLocation = await requestCurrentLocation();
      if (!nextLocation) {
        message.warning({
          key: 'query-current-location-error',
          content: getLatestCurrentLocationError() || currentLocationError || '当前位置获取失败，请检查浏览器定位权限。',
        });
        return;
      }

      nextCenter = {
        name: '当前位置',
        latitude: nextLocation.latitude,
        longitude: nextLocation.longitude,
        source: 'current_location',
      };
    }

    setCenterPoint(nextCenter);
    const keyword = form.getFieldValue('keyword') || '';
    syncSearchParams(
      searchType,
      keyword,
      scenicAreaId,
      scenicAreaName,
      nextCenter,
      radiusKm,
      selectedScenicCategories,
      minimumScenicRating,
    );
    if (searchType === 'facility') {
      await runSearch('facility', keyword, scenicAreaId, nextCenter, radiusKm);
    }
  };

  const handleClearCenter = () => {
    setCenterPoint(null);
    const keyword = form.getFieldValue('keyword') || '';
    syncSearchParams(
      searchType,
      keyword,
      scenicAreaId,
      scenicAreaName,
      null,
      radiusKm,
      selectedScenicCategories,
      minimumScenicRating,
    );
  };

  const handleClearScenicScope = () => {
    setScenicAreaId('');
    setScenicAreaName('');
    const keyword = form.getFieldValue('keyword') || '';
    syncSearchParams(
      searchType,
      keyword,
      '',
      '',
      centerPoint,
      radiusKm,
      selectedScenicCategories,
      minimumScenicRating,
    );
  };

  const handleRadiusChange = async (nextRadius: number) => {
    setRadiusKm(nextRadius);
    const keyword = form.getFieldValue('keyword') || '';
    syncSearchParams(
      searchType,
      keyword,
      scenicAreaId,
      scenicAreaName,
      centerPoint,
      nextRadius,
      selectedScenicCategories,
      minimumScenicRating,
    );
    if (searchType === 'facility' && (keyword || scenicAreaId || centerPoint)) {
      await runSearch('facility', keyword, scenicAreaId, centerPoint, nextRadius);
    }
  };

  const handleScenicCategoryChange = async (nextCategories: string[]) => {
    setSelectedScenicCategories(nextCategories);
    const keyword = form.getFieldValue('keyword') || '';
    syncSearchParams(
      searchType,
      keyword,
      scenicAreaId,
      scenicAreaName,
      centerPoint,
      radiusKm,
      nextCategories,
      minimumScenicRating,
    );
    if (searchType === 'scenic' && (keyword.trim() || nextCategories.length > 0 || minimumScenicRating !== null)) {
      await runSearch('scenic', keyword, scenicAreaId, centerPoint, radiusKm, nextCategories, minimumScenicRating);
    }
  };

  const handleScenicMinRatingChange = async (nextMinimumRating: number | null) => {
    setMinimumScenicRating(nextMinimumRating);
    const keyword = form.getFieldValue('keyword') || '';
    syncSearchParams(
      searchType,
      keyword,
      scenicAreaId,
      scenicAreaName,
      centerPoint,
      radiusKm,
      selectedScenicCategories,
      nextMinimumRating,
    );
    if (searchType === 'scenic' && (keyword.trim() || selectedScenicCategories.length > 0 || nextMinimumRating !== null)) {
      await runSearch('scenic', keyword, scenicAreaId, centerPoint, radiusKm, selectedScenicCategories, nextMinimumRating);
    }
  };

  const handleClearScenicFilters = async () => {
    setSelectedScenicCategories([]);
    setMinimumScenicRating(null);
    const keyword = form.getFieldValue('keyword') || '';
    syncSearchParams(searchType, keyword, scenicAreaId, scenicAreaName, centerPoint, radiusKm, [], null);
    if (searchType === 'scenic') {
      if (keyword.trim()) {
        await runSearch('scenic', keyword, scenicAreaId, centerPoint, radiusKm, [], null);
      }
    }
  };

  const handleExportData = async () => {
    setLoadingExport(true);
    try {
      const blob = await queryService.exportScenicAreaData();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `scenic-area-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('景区数据已导出。');
    } catch (error) {
      message.error(resolveErrorMessage(error, '导出景区数据失败。'));
    } finally {
      setLoadingExport(false);
    }
  };

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setLoadingImport(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const response = await queryService.importScenicAreaData(payload);
      message.success(
        `导入完成：景区 ${response.data.scenicAreas} 个，景点 ${response.data.attractions} 个，设施 ${response.data.facilities} 个。`,
      );
    } catch (error) {
      message.error(resolveErrorMessage(error, '导入失败，请检查 JSON 格式。'));
    } finally {
      setLoadingImport(false);
    }
  };

  const formatCoord = (latitude?: number, longitude?: number) => {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return '暂无坐标信息';
    }
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  };

  const toFacilityQueryAroundPlace = (
    placeName: string,
    latitude?: number,
    longitude?: number,
    nextScenicAreaId = scenicAreaId,
    nextScenicAreaName = scenicAreaName,
    keyword = '卫生间',
  ) => {
    const params = new URLSearchParams();
    params.set('mode', 'facility');
    params.set('keyword', keyword);
    if (nextScenicAreaId) params.set('scenicAreaId', nextScenicAreaId);
    if (nextScenicAreaName) params.set('scenicName', nextScenicAreaName);
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      params.set('centerName', placeName);
      params.set('centerLat', String(latitude));
      params.set('centerLng', String(longitude));
      params.set('centerSource', 'selected_place');
    }
    params.set('radiusKm', String(radiusKm));
    navigate(`/query?${params.toString()}`);
  };

  const renderFacilityActions = (item: Facility) => {
    const routeParams = new URLSearchParams();
    routeParams.set('source', 'query');
    if (scenicAreaId || item.scenicAreaId) {
      routeParams.set('scenicAreaId', scenicAreaId || item.scenicAreaId || '');
    }
    if (scenicAreaName) {
      routeParams.set('scenicName', scenicAreaName);
    }
    routeParams.set('keyword', item.name);
    routeParams.set('endName', item.name);
    if (typeof item.latitude === 'number' && typeof item.longitude === 'number') {
      routeParams.set('endLat', String(item.latitude));
      routeParams.set('endLng', String(item.longitude));
    }

    return (
      <Space wrap>
        <Button type="primary" onClick={() => navigate(`/path-planning?${routeParams.toString()}`)}>
          开始导航
        </Button>
        <Button
          onClick={() =>
            toFacilityQueryAroundPlace(
              item.name,
              item.latitude,
              item.longitude,
              scenicAreaId || item.scenicAreaId || '',
              scenicAreaName,
              form.getFieldValue('keyword') || item.category || '卫生间',
            )
          }
        >
          以这里为中心
        </Button>
        {scenicAreaId || item.scenicAreaId ? (
          <Button onClick={() => navigate(`/scenic-area/${scenicAreaId || item.scenicAreaId}`)}>查看所属景区</Button>
        ) : null}
      </Space>
    );
  };

  const renderFoodActions = (item: Attraction) => (
    <Space wrap>
      <Button onClick={() => navigate('/diary')}>去旅行日记</Button>
      {item.scenicAreaId ? (
        <Button type="primary" onClick={() => navigate(`/food-recommendation/${item.scenicAreaId}`)}>
          查看景区美食页
        </Button>
      ) : null}
    </Space>
  );

  return (
    <div style={{ padding: 8, maxWidth: 1240, margin: '0 auto' }}>
      <PremiumPageHero
        title="景区与设施查询"
        description="把景区浏览、场所查询、美食搜索放在同一个工作区里，并把结果自然接到导航、景区详情和旅行日记。"
        tags={['景区浏览', '附近设施', '路网排序', '一键导航']}
        metrics={[
          { label: '当前模式', value: typeLabelMap[searchType] },
          { label: '结果数量', value: results.length, suffix: '条' },
          { label: '景区范围', value: scenicAreaName || '未限定' },
          { label: '中心点', value: centerPoint?.name || '未设置' },
        ]}
        actions={
          <Space wrap>
            <Button type="primary" onClick={() => navigate('/journey')}>
              返回智能行程
            </Button>
            <Button onClick={handleExportData} loading={loadingExport}>
              导出景区数据
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} loading={loadingImport}>
              导入 JSON 数据
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleImportFileChange}
            />
          </Space>
        }
      />

      <Card
        variant="borderless"
        style={{ borderRadius: 20, marginBottom: 16, boxShadow: '0 14px 30px rgba(15,23,42,0.06)' }}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Form.Item label="查询模式" style={{ marginBottom: 0 }}>
                <Radio.Group
                  value={searchType}
                  onChange={(event) => handleSearchTypeChange(event.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                >
                  <Radio.Button value="scenic">景区</Radio.Button>
                  <Radio.Button value="facility">场所 / 设施</Radio.Button>
                  <Radio.Button value="food">美食</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col xs={24} lg={10}>
              <Form.Item
                name="keyword"
                label={`${typeLabelMap[searchType]}关键字`}
                rules={
                  searchType === 'facility' && (scenicAreaId || centerPoint)
                    ? []
                    : searchType === 'scenic' && hasScenicFilterCriteria
                    ? []
                    : [{ required: true, whitespace: true, message: '请输入查询关键字。' }]
                }
              >
                {searchType === 'scenic' ? (
                  <AutoComplete
                    allowClear
                    options={scenicSuggestions}
                    onSelect={(value) => form.setFieldValue('keyword', value)}
                    notFoundContent={loadingSuggestions ? <Spin size="small" /> : null}
                  >
                    <Input
                      allowClear
                      prefix={<SearchOutlined />}
                      placeholder="例如：北京大学、古镇、校园"
                    />
                  </AutoComplete>
                ) : (
                  <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder={
                      searchType === 'facility'
                        ? '例如：卫生间、游客中心、便利店'
                        : '例如：小吃、咖啡、特色餐厅'
                    }
                  />
                )}
              </Form.Item>
            </Col>
            <Col xs={24} lg={6} style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button type="primary" htmlType="submit" loading={busy} size="large" block>
                开始查询
              </Button>
            </Col>
          </Row>
        </Form>

        <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 12 }}>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {currentHint}
          </Paragraph>

          {searchType === 'facility' ? (
            <Alert
              type="info"
              showIcon
              message="高亮要求已接入"
              description="当前支持以某个地点或当前位置为中心，在指定范围内查找附近设施，并优先按真实路网距离排序；输入设施类别名称即可直接检索附近服务设施。"
            />
          ) : null}

          <Space wrap>
            {quickKeywords[searchType].map((keyword) => (
              <Button key={keyword} size="small" onClick={() => void handleQuickKeyword(keyword)}>
                {keyword}
              </Button>
            ))}
          </Space>

          {searchType === 'scenic' ? (
            <Space wrap align="start">
              <Space direction="vertical" size={6}>
                <Text strong>景区类别</Text>
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="选择类别后可直接筛选"
                  style={{ width: 260 }}
                  value={selectedScenicCategories}
                  options={scenicCategoryOptions.map((item) => ({ label: item, value: item }))}
                  onChange={(values) => void handleScenicCategoryChange(values)}
                />
              </Space>
              <Space direction="vertical" size={6}>
                <Text strong>最低评分</Text>
                <Select
                  allowClear
                  placeholder="不限评分"
                  style={{ width: 180 }}
                  value={minimumScenicRating}
                  options={scenicMinRatingOptions.map((item) => ({
                    label: `${item.toFixed(1)} 分及以上`,
                    value: item,
                  }))}
                  onChange={(value) => void handleScenicMinRatingChange(value ?? null)}
                />
              </Space>
              {hasScenicFilterCriteria ? (
                <Button onClick={() => void handleClearScenicFilters()}>清除景区筛选</Button>
              ) : null}
            </Space>
          ) : null}

          {searchType === 'facility' ? (
            <Space wrap>
              <Text strong>查询范围：</Text>
              {radiusOptions.map((item) => (
                <Button
                  key={item}
                  type={radiusKm === item ? 'primary' : 'default'}
                  size="small"
                  onClick={() => void handleRadiusChange(item)}
                >
                  {item.toFixed(1)} 公里
                </Button>
              ))}
            </Space>
          ) : null}

          <Space wrap>
            {centerPoint ? <Tag color="gold">当前中心点：{centerPoint.name}</Tag> : null}
            {scenicAreaName ? <Tag color="blue">当前景区范围：{scenicAreaName}</Tag> : null}
            {selectedScenicCategories.map((category) => (
              <Tag key={category} color="purple">
                类别：{category}
              </Tag>
            ))}
            {typeof minimumScenicRating === 'number' ? (
              <Tag color="magenta">最低评分：{minimumScenicRating.toFixed(1)}</Tag>
            ) : null}
            {currentLocationError ? <Tag color="red">{currentLocationError}</Tag> : null}
            <Button
              icon={<AimOutlined />}
              loading={resolvingCurrentLocation}
              onClick={() => void handleUseCurrentLocationAsCenter()}
            >
              使用当前位置作为中心点
            </Button>
            {centerPoint ? <Button onClick={handleClearCenter}>清除中心点</Button> : null}
            {scenicAreaName ? <Button onClick={handleClearScenicScope}>清除景区范围</Button> : null}
          </Space>
        </Space>
      </Card>

      <Card variant="borderless" style={{ borderRadius: 20, boxShadow: '0 14px 30px rgba(15,23,42,0.06)' }}>
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <div>
            <Title level={3} style={{ marginBottom: 2 }}>
              查询结果
            </Title>
            <Text type="secondary">{resultSummaryText}</Text>
          </div>

          {error ? <Alert type="error" showIcon message={error} /> : null}

          {!error && busy ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : searchType === 'scenic' ? (
            scenicAreas.length > 0 ? (
              <List
                grid={{ gutter: 16, xs: 1, sm: 2, md: 3 }}
                dataSource={scenicAreas}
                renderItem={(item, index) => {
                  const presentation = resolveScenicCoverPresentation(item);
                  return (
                    <List.Item>
                      <Card
                        variant="borderless"
                        hoverable
                        style={{
                          borderRadius: 24,
                          overflow: 'hidden',
                          background: 'linear-gradient(180deg, rgba(255,255,255,1), rgba(248,250,252,0.98))',
                          boxShadow: '0 18px 36px rgba(15,23,42,0.08)',
                          border: '1px solid rgba(226,232,240,0.72)',
                        }}
                        cover={
                          <div
                            style={{
                              height: 220,
                              padding: 14,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              background: scenicCardTone[index % scenicCardTone.length],
                              backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.72)), url(${presentation.coverImageUrl})`,
                              backgroundPosition: 'center',
                              backgroundSize: 'cover',
                              backgroundRepeat: 'no-repeat',
                              color: '#fff',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                              <Tag color="cyan">{presentation.cityLabel || item.category || '景区'}</Tag>
                              <Tag color="volcano">{scenicBadgePool[index % scenicBadgePool.length]}</Tag>
                            </div>
                            <div>
                              <div style={{ fontSize: 12, opacity: 0.92, marginBottom: 6 }}>{presentation.coverImageTheme}</div>
                              <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>{item.name}</div>
                            </div>
                          </div>
                        }
                      >
                        <Space direction="vertical" size={10} style={{ width: '100%' }}>
                          <Space wrap>
                            <Tag color="green">评分 {item.rating ?? item.averageRating ?? 0}</Tag>
                            <Tag color="orange">热度 {item.visitorCount ?? item.popularity ?? 0}</Tag>
                            <Tag color="blue">{presentation.cityLabel || '目的地'}</Tag>
                          </Space>
                          <Paragraph ellipsis={{ rows: 3 }} type="secondary" style={{ marginBottom: 0, minHeight: 66 }}>
                            {item.description || '暂无景区简介。'}
                          </Paragraph>
                          <Text type="secondary">
                            {formatCoord(item.latitude, item.longitude)}
                          </Text>
                          <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            <Button type="primary" block onClick={() => navigate(`/scenic-area/${item.id}`)}>
                              查看详情
                            </Button>
                            <Space wrap>
                              <Button
                                onClick={() =>
                                  toFacilityQueryAroundPlace(
                                    item.name,
                                    item.latitude,
                                    item.longitude,
                                    item.id,
                                    item.name,
                                  )
                                }
                              >
                                查询附近设施
                              </Button>
                              <Button
                                onClick={() =>
                                  navigate(
                                    `/path-planning?scenicAreaId=${item.id}&scenicName=${encodeURIComponent(item.name)}&keyword=${encodeURIComponent(item.name)}&endName=${encodeURIComponent(item.name)}${typeof item.latitude === 'number' && typeof item.longitude === 'number' ? `&endLat=${item.latitude}&endLng=${item.longitude}` : ''}`,
                                  )
                                }
                              >
                                去做导航
                              </Button>
                            </Space>
                          </Space>
                        </Space>
                      </Card>
                    </List.Item>
                  );
                }}
              />
            ) : (
              <Empty description="暂未找到匹配的景区结果。" />
            )
          ) : searchType === 'facility' ? (
            facilities.length > 0 ? (
              <List
                grid={{ gutter: 16, xs: 1, sm: 2, md: 3 }}
                dataSource={facilities}
                renderItem={(item) => (
                  <List.Item>
                    <Card
                      variant="borderless"
                      hoverable
                      style={{
                        borderRadius: 18,
                        background: 'rgba(248,250,252,0.96)',
                        boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
                      }}
                    >
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color="geekblue">{item.category || '设施'}</Tag>
                          {typeof item.distanceKm === 'number' ? (
                            <Tag color={item.distanceSource === 'road_network' ? 'blue' : 'default'}>
                              {item.distanceKm.toFixed(2)} 公里 · {item.distanceSource === 'road_network' ? '路网距离' : '直线备用'}
                            </Tag>
                          ) : null}
                        </Space>
                        <Title level={5} style={{ margin: 0 }}>
                          {item.name}
                        </Title>
                        <Text type="secondary">{item.description || '暂无设施说明。'}</Text>
                        <Text type="secondary">{formatCoord(item.latitude, item.longitude)}</Text>
                        {renderFacilityActions(item)}
                      </Space>
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="当前范围内暂未找到匹配设施。" />
            )
          ) : foods.length > 0 ? (
            <List
              grid={{ gutter: 16, xs: 1, sm: 2, md: 3 }}
              dataSource={foods}
              renderItem={(item) => (
                <List.Item>
                  <Card
                    variant="borderless"
                    hoverable
                    style={{
                      borderRadius: 18,
                      background: 'rgba(255,251,245,0.94)',
                      boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
                    }}
                  >
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color="gold">{item.cuisine || item.category || '美食'}</Tag>
                        <Tag color="green">评分 {item.rating ?? 0}</Tag>
                      </Space>
                      <Title level={5} style={{ margin: 0 }}>
                        {item.name}
                      </Title>
                      <Text type="secondary">{item.description || '暂无美食说明。'}</Text>
                      <Text type="secondary">{formatCoord(item.latitude, item.longitude)}</Text>
                      {renderFoodActions(item)}
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
          ) : (
            <Empty description="暂未找到匹配的美食结果。" />
          )}
        </Space>
      </Card>
    </div>
  );
};

export default QueryPage;
