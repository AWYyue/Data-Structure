import React, { useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Card, Col, Empty, Input, List, Row, Space, Spin, Tabs, Tag, Typography } from 'antd';
import { AimOutlined, EnvironmentOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import MapComponent from '../components/MapComponent';
import PhotoSpotComponent from '../components/PhotoSpotComponent';
import PremiumPageHero from '../components/PremiumPageHero';
import useCurrentLocation from '../hooks/useCurrentLocation';
import pathPlanningService, { RoadNetworkEdge, RoadNetworkNode } from '../services/pathPlanningService';
import queryService, { Facility, ScenicAreaDetails } from '../services/queryService';
import { resolveErrorMessage } from '../utils/errorMessage';
import { resolveScenicCoverPresentation } from '../utils/scenicPresentation';

const { Title, Text, Paragraph } = Typography;

const facilityShortcuts = ['卫生间', '游客中心', '停车场', '超市', '便利店'];
const nearbyRadiusOptions = [0.3, 0.5, 0.8, 1.2];

type RoadNetwork = { nodes: RoadNetworkNode[]; edges: RoadNetworkEdge[] };
type ScenicPlaceMarker = {
  id: string;
  name: string;
  position: [number, number];
  markerType: 'default' | 'attraction' | 'facility' | 'start';
  placeKind: 'scenic' | 'attraction' | 'facility' | 'current_location';
  category?: string;
};

const hasCoordinate = (latitude?: number, longitude?: number) =>
  typeof latitude === 'number' &&
  typeof longitude === 'number' &&
  Number.isFinite(latitude) &&
  Number.isFinite(longitude);

const formatDistanceKm = (distanceKm?: number) => {
  const value = Number(distanceKm);
  if (!Number.isFinite(value) || value < 0) {
    return '距离待计算';
  }
  if (value < 1) {
    return `${Math.round(value * 1000)} 米`;
  }
  return `${value.toFixed(2)} 公里`;
};

const formatDistanceSource = (source?: Facility['distanceSource']) =>
  source === 'road_network' ? '按路网距离排序' : source === 'haversine' ? '按直线距离排序' : '距离排序';

const markerIdForNearbyFacility = (facilityId: string) => `facility-${facilityId}`;

const ScenicAreaDetailPage: React.FC = () => {
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<ScenicAreaDetails | null>(null);
  const [roadNetwork, setRoadNetwork] = useState<RoadNetwork | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<ScenicPlaceMarker | null>(null);
  const [nearbyFacilities, setNearbyFacilities] = useState<Facility[]>([]);
  const [nearbyFacilityKeyword, setNearbyFacilityKeyword] = useState('');
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState(0.8);
  const [loadingNearbyFacilities, setLoadingNearbyFacilities] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [focusedNearbyFacilityId, setFocusedNearbyFacilityId] = useState<string | null>(null);
  const {
    location: currentLocation,
    error: currentLocationError,
    isLoading: resolvingCurrentLocation,
    isWatching: isWatchingCurrentLocation,
    requestLocation,
    startWatching,
    stopWatching,
    getLatestError: getLatestCurrentLocationError,
  } = useCurrentLocation({
    enableHighAccuracy: true,
    timeout: 8000,
    maximumAge: 60000,
  });

  useEffect(() => {
    if (!id) {
      return;
    }
    void loadData(id);
  }, [id]);

  const loadData = async (scenicAreaId: string) => {
    setLoading(true);
    setError(null);
    setSelectedPlace(null);
    setNearbyFacilities([]);
    setNearbyError(null);
    setFocusedNearbyFacilityId(null);

    try {
      const [detailsResp, roadResp] = await Promise.all([
        queryService.getScenicAreaDetails(scenicAreaId),
        pathPlanningService.getRoadNetwork(scenicAreaId),
      ]);
      setDetails(detailsResp.data);
      setRoadNetwork(roadResp.data);
    } catch (loadError: unknown) {
      setError(resolveErrorMessage(loadError, '景区详情加载失败，请稍后重试。'));
      console.error(loadError);
    } finally {
      setLoading(false);
    }
  };

  const runNearbyFacilitySearch = async (
    place: ScenicPlaceMarker,
    overrides?: { keyword?: string; radiusKm?: number },
  ) => {
    if (!details) {
      return;
    }

    const nextKeyword = overrides?.keyword ?? nearbyFacilityKeyword;
    const nextRadiusKm = overrides?.radiusKm ?? nearbyRadiusKm;
    setLoadingNearbyFacilities(true);
    setNearbyError(null);

    try {
      const response = await queryService.searchFacilities({
        type: nextKeyword.trim() || undefined,
        scenicAreaId: details.scenicArea.id,
        latitude: place.position[0],
        longitude: place.position[1],
        radiusKm: nextRadiusKm,
        limit: 30,
      });
      const sortedFacilities = [...response.data].sort((left, right) => {
        const leftDistance = Number(left.distanceKm ?? Number.POSITIVE_INFINITY);
        const rightDistance = Number(right.distanceKm ?? Number.POSITIVE_INFINITY);
        return leftDistance - rightDistance;
      });
      setNearbyFacilities(sortedFacilities);
      setFocusedNearbyFacilityId(sortedFacilities[0]?.id ?? null);
    } catch (searchError: unknown) {
      setNearbyFacilities([]);
      setNearbyError(resolveErrorMessage(searchError, '附近设施查询失败，请稍后重试。'));
      setFocusedNearbyFacilityId(null);
    } finally {
      setLoadingNearbyFacilities(false);
    }
  };

  const createCurrentLocationPlace = (latitude: number, longitude: number): ScenicPlaceMarker => ({
    id: 'current-location',
    name: '当前位置',
    position: [latitude, longitude],
    markerType: 'start',
    placeKind: 'current_location',
    category: '当前位置',
  });

  const placeMarkers = useMemo(() => {
    if (!details) {
      return [] as ScenicPlaceMarker[];
    }

    const scenic = details.scenicArea;
    const scenicMarkers =
      hasCoordinate(scenic.latitude, scenic.longitude)
        ? [
            {
              id: `scenic-${scenic.id}`,
              name: scenic.name,
              position: [Number(scenic.latitude), Number(scenic.longitude)] as [number, number],
              markerType: 'default' as const,
              placeKind: 'scenic' as const,
              category: scenic.category,
            },
          ]
        : [];

    const attractionMarkers = details.attractions
      .filter((item) => hasCoordinate(item.latitude, item.longitude))
      .map(
        (item) =>
          ({
            id: `attraction-${item.id}`,
            name: item.name,
            position: [Number(item.latitude), Number(item.longitude)] as [number, number],
            markerType: 'attraction' as const,
            placeKind: 'attraction' as const,
            category: item.category || item.type,
          }) satisfies ScenicPlaceMarker,
      );

    const facilityMarkers = details.facilities
      .filter((item) => hasCoordinate(item.latitude, item.longitude))
      .map(
        (item) =>
          ({
            id: `facility-${item.id}`,
            name: item.name,
            position: [Number(item.latitude), Number(item.longitude)] as [number, number],
            markerType: 'facility' as const,
            placeKind: 'facility' as const,
            category: item.category,
          }) satisfies ScenicPlaceMarker,
      );

    return [...scenicMarkers, ...attractionMarkers, ...facilityMarkers];
  }, [details]);

  const nearbyFacilityMarkers = useMemo(
    () =>
      nearbyFacilities
        .filter((item) => hasCoordinate(item.latitude, item.longitude))
        .map(
          (item) =>
            ({
              id: markerIdForNearbyFacility(item.id),
              name: item.name,
              position: [Number(item.latitude), Number(item.longitude)] as [number, number],
              markerType: 'facility' as const,
              placeKind: 'facility' as const,
              category: item.category,
            }) satisfies ScenicPlaceMarker,
        ),
    [nearbyFacilities],
  );

  const currentLocationMarker = useMemo(
    () =>
      selectedPlace?.placeKind === 'current_location'
        ? {
            id: selectedPlace.id,
            name: selectedPlace.name,
            position: selectedPlace.position,
            markerType: 'start' as const,
            placeKind: 'current_location' as const,
            category: '当前位置',
          }
        : null,
    [selectedPlace],
  );

  const markerLookup = useMemo(() => {
    const map = new Map<string, ScenicPlaceMarker>();
    placeMarkers.forEach((item) => map.set(item.id, item));
    nearbyFacilityMarkers.forEach((item) => {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });
    if (currentLocationMarker) {
      map.set(currentLocationMarker.id, currentLocationMarker);
    }
    return map;
  }, [currentLocationMarker, nearbyFacilityMarkers, placeMarkers]);

  const displayMarkers = useMemo(() => {
    const markerMap = new Map<string, ScenicPlaceMarker>();
    placeMarkers.forEach((item) => markerMap.set(item.id, item));
    nearbyFacilityMarkers.forEach((item) => {
      if (!markerMap.has(item.id)) {
        markerMap.set(item.id, item);
      }
    });
    if (currentLocationMarker) {
      markerMap.set(currentLocationMarker.id, currentLocationMarker);
    }
    if (selectedPlace && !markerMap.has(selectedPlace.id)) {
      markerMap.set(selectedPlace.id, {
        ...selectedPlace,
        markerType: 'start',
      });
    }

    return Array.from(markerMap.values()).map((item) => ({
      id: item.id,
      position: item.position,
      title: item.name,
      type: selectedPlace?.id === item.id ? 'start' : item.markerType,
    }));
  }, [currentLocationMarker, nearbyFacilityMarkers, placeMarkers, selectedPlace]);

  const nearbyFocusPoints = useMemo<[number, number][]>(
    () => {
      const focusedFacility = nearbyFacilities.find((item) => item.id === focusedNearbyFacilityId) || null;
      if (selectedPlace && focusedFacility && hasCoordinate(focusedFacility.latitude, focusedFacility.longitude)) {
        return [
          selectedPlace.position,
          [Number(focusedFacility.latitude), Number(focusedFacility.longitude)] as [number, number],
        ];
      }

      return [
        ...(selectedPlace ? [selectedPlace.position] : []),
        ...nearbyFacilities
          .filter((item) => hasCoordinate(item.latitude, item.longitude))
          .map((item) => [Number(item.latitude), Number(item.longitude)] as [number, number]),
      ];
    },
    [focusedNearbyFacilityId, nearbyFacilities, selectedPlace],
  );

  const handleMarkerSelect = (marker: { id: string }) => {
    const matched = markerLookup.get(marker.id);
    if (!matched) {
      return;
    }
    setFocusedNearbyFacilityId(null);
    setSelectedPlace(matched);
    void runNearbyFacilitySearch(matched);
  };

  const handleQuickNearbyFilter = (keyword: string) => {
    setNearbyFacilityKeyword(keyword);
    if (selectedPlace) {
      void runNearbyFacilitySearch(selectedPlace, { keyword });
    }
  };

  const handleNearbyRadiusChange = (radiusKm: number) => {
    setNearbyRadiusKm(radiusKm);
    if (selectedPlace) {
      void runNearbyFacilitySearch(selectedPlace, { radiusKm });
    }
  };

  const handleNearbyKeywordSubmit = () => {
    if (!selectedPlace) {
      message.warning('请先在地图上点击一个场所，或使用当前位置作为查询中心。');
      return;
    }
    void runNearbyFacilitySearch(selectedPlace);
  };

  const handleUseCurrentLocationNearby = () => {
    void (async () => {
      const nextLocation = await requestLocation();
      if (!nextLocation) {
        message.warning({
          key: 'scenic-current-location-error',
          content: getLatestCurrentLocationError() || currentLocationError || '当前位置获取失败，请检查浏览器定位权限。',
        });
        return;
      }

      const currentPlace = createCurrentLocationPlace(nextLocation.latitude, nextLocation.longitude);
      setSelectedPlace(currentPlace);
      await runNearbyFacilitySearch(currentPlace);
    })();
  };

  const handleToggleCurrentLocationTracking = () => {
    if (isWatchingCurrentLocation) {
      stopWatching();
      message.success('已停止实时跟踪当前位置。');
      return;
    }

    const started = startWatching();
    if (started) {
      message.success('已开启实时跟踪，会持续更新当前位置并刷新附近设施。');
    } else {
      message.warning({
        key: 'scenic-current-location-error',
        content: getLatestCurrentLocationError() || currentLocationError || '当前位置获取失败，请检查浏览器定位权限。',
      });
    }
  };

  const handleUseFacilityAsCenter = (facility: Facility) => {
    if (!hasCoordinate(facility.latitude, facility.longitude)) {
      return;
    }

    const nextPlace: ScenicPlaceMarker = {
      id: markerIdForNearbyFacility(facility.id),
      name: facility.name,
      position: [Number(facility.latitude), Number(facility.longitude)],
      markerType: 'facility',
      placeKind: 'facility',
      category: facility.category,
    };
    setFocusedNearbyFacilityId(null);
    setSelectedPlace(nextPlace);
    void runNearbyFacilitySearch(nextPlace);
  };

  const handleFocusNearbyFacility = (facility: Facility) => {
    setFocusedNearbyFacilityId(facility.id);
  };

  useEffect(() => {
    if (!details || selectedPlace || !placeMarkers.length) {
      return;
    }

    const defaultPlace = placeMarkers.find((item) => item.placeKind === 'scenic') || placeMarkers[0];
    setSelectedPlace(defaultPlace);
    void runNearbyFacilitySearch(defaultPlace, { keyword: '' });
  }, [details, placeMarkers, selectedPlace]);

  useEffect(() => {
    if (!currentLocation || !isWatchingCurrentLocation) {
      return;
    }

    const trackedPlace = createCurrentLocationPlace(currentLocation.latitude, currentLocation.longitude);
    setSelectedPlace(trackedPlace);
    void runNearbyFacilitySearch(trackedPlace);
  }, [currentLocation, isWatchingCurrentLocation]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 120 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !details) {
    return (
      <Card style={{ borderRadius: 18 }}>
        <Space direction="vertical" size={16}>
          <Alert type="error" showIcon message={error || '景区详情加载失败'} />
          <Button type="primary" onClick={() => id && loadData(id)}>
            重新加载
          </Button>
        </Space>
      </Card>
    );
  }

  const scenic = details.scenicArea;
  const scenicPresentation = resolveScenicCoverPresentation(scenic);
  const cityLabel = scenic.cityLabel || scenicPresentation.cityLabel || '精选目的地';
  const coverTheme = scenic.coverImageTheme || scenicPresentation.coverImageTheme || scenic.category || '景区';
  const center: [number, number] = [
    Number(scenic.latitude ?? 39.9042),
    Number(scenic.longitude ?? 116.4074),
  ];

  const buildScenicQueryParams = () => {
    const params = new URLSearchParams({
      scenicAreaId: scenic.id,
      scenicName: scenic.name,
    });
    return params;
  };

  const toFacilityQueryAroundPlace = (place: ScenicPlaceMarker, keyword = nearbyFacilityKeyword) => {
    const params = buildScenicQueryParams();
    params.set('mode', 'facility');
    if (keyword.trim()) {
      params.set('keyword', keyword.trim());
    }
    params.set('centerName', place.name);
    params.set('centerLat', String(place.position[0]));
    params.set('centerLng', String(place.position[1]));
    params.set('centerSource', place.placeKind === 'current_location' ? 'current_location' : 'selected_place');
    params.set('radiusKm', String(nearbyRadiusKm));
    navigate(`/query?${params.toString()}`);
  };

  const toPathPlanningBetweenPlaces = (targetName: string, targetLatitude?: number, targetLongitude?: number) => {
    const params = buildScenicQueryParams();
    if (selectedPlace) {
      params.set('startName', selectedPlace.name);
      params.set('startLat', String(selectedPlace.position[0]));
      params.set('startLng', String(selectedPlace.position[1]));
      params.set('startSource', selectedPlace.placeKind === 'current_location' ? 'current_location' : 'selected_place');
    }
    params.set('keyword', targetName);
    params.set('endName', targetName);
    if (typeof targetLatitude === 'number' && typeof targetLongitude === 'number') {
      params.set('endLat', String(targetLatitude));
      params.set('endLng', String(targetLongitude));
    }
    navigate(`/path-planning?${params.toString()}`);
  };

  const toPathPlanning = (keyword?: string) => {
    const params = buildScenicQueryParams();
    if (keyword) {
      params.set('keyword', keyword);
    }
    navigate(`/path-planning?${params.toString()}`);
  };

  const toFacilityQuery = (keyword: string) => {
    const params = new URLSearchParams({
      mode: 'facility',
      scenicAreaId: scenic.id,
      scenicName: scenic.name,
      keyword,
    });

    if (hasCoordinate(scenic.latitude, scenic.longitude)) {
      params.set('centerName', scenic.name);
      params.set('centerLat', String(scenic.latitude));
      params.set('centerLng', String(scenic.longitude));
      params.set('centerSource', 'selected_place');
      params.set('radiusKm', '0.8');
    }

    navigate(`/query?${params.toString()}`);
  };

  const toFood = () => navigate(`/food-recommendation/${scenic.id}?scenicName=${encodeURIComponent(scenic.name)}`);
  const toIndoorNavigation = () => navigate('/indoor-navigation');

  const selectedPlaceSummary =
    selectedPlace?.placeKind === 'current_location'
      ? '当前位置'
      : selectedPlace?.placeKind === 'scenic'
      ? '景区中心'
      : selectedPlace?.placeKind === 'attraction'
      ? '景点'
      : '设施';

  const previewPlaces = [
    ...details.attractions.slice(0, 6).map((item) => ({
      id: `attraction-${item.id}`,
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      category: item.category || item.type || '景点',
      markerType: 'attraction' as const,
      placeKind: 'attraction' as const,
    })),
    ...details.facilities.slice(0, 6).map((item) => ({
      id: `facility-${item.id}`,
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      category: item.category || '设施',
      markerType: 'facility' as const,
      placeKind: 'facility' as const,
    })),
  ];

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: 8 }}>
      <PremiumPageHero
        title={scenic.name}
        eyebrow={`${cityLabel} · 场所查询与导航联动`}
        description={
          scenic.description ||
          '点击地图上的景区、景点或设施，即可按真实路网距离查找附近的卫生间、超市、游客中心等服务设施，并直接继续导航。'
        }
        tags={[scenic.category || '景区', '点击地图查附近设施', '按路网距离排序']}
        metrics={[
          { label: '评分', value: scenic.rating ?? scenic.averageRating ?? 0 },
          { label: '热度', value: scenic.popularity ?? scenic.visitorCount ?? 0 },
          { label: '景点数量', value: details.attractions.length, suffix: '个' },
          { label: '设施数量', value: details.facilities.length, suffix: '个' },
        ]}
        coverImageUrl={scenicPresentation.coverImageUrl}
        coverLabel={coverTheme}
        actions={
          <Space wrap>
            <Button type="primary" onClick={() => toPathPlanning()}>
              进入户外导航
            </Button>
            <Button onClick={() => toFacilityQuery('游客中心')}>查询附近设施</Button>
            <Button onClick={toFood}>查看美食推荐</Button>
            <Button onClick={toIndoorNavigation}>室内导航</Button>
          </Space>
        }
      />

      <Tabs
        defaultActiveKey="overview"
        items={[
          {
            key: 'overview',
            label: '地图总览',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={11}>
                  <Card
                    variant="borderless"
                    style={{ borderRadius: 22, boxShadow: '0 14px 30px rgba(15,23,42,0.06)' }}
                  >
                    <Space direction="vertical" size={14} style={{ width: '100%' }}>
                      <div>
                        <Title level={4} style={{ margin: 0 }}>
                          场所查询
                        </Title>
                        <Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
                          先在右侧地图上点击一个场所，系统会在该点附近指定范围内查找服务设施，并优先按真实路网距离排序。
                        </Paragraph>
                      </div>

                      <div
                        style={{
                          borderRadius: 18,
                          padding: '14px 16px',
                          background: 'linear-gradient(135deg, rgba(109,93,252,0.08), rgba(56,189,248,0.08))',
                          border: '1px solid rgba(191,219,254,0.7)',
                        }}
                      >
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                          <Space wrap>
                            <Tag color="blue">当前中心</Tag>
                            <Text strong>{selectedPlace?.name || scenic.name}</Text>
                            <Tag>{selectedPlaceSummary}</Tag>
                            {selectedPlace?.category ? <Tag color="purple">{selectedPlace.category}</Tag> : null}
                          </Space>
                          <Text type="secondary">
                            可切换查询范围，或使用当前位置作为中心点。点击结果中的“开始导航”可直接跳到路径规划。
                          </Text>
                        </Space>
                      </div>

                      <Space.Compact style={{ width: '100%' }}>
                        <Input
                          value={nearbyFacilityKeyword}
                          onChange={(event) => setNearbyFacilityKeyword(event.target.value)}
                          onPressEnter={handleNearbyKeywordSubmit}
                          placeholder="输入设施类别，例如：超市、卫生间、游客中心"
                          allowClear
                        />
                        <Button type="primary" icon={<SearchOutlined />} onClick={handleNearbyKeywordSubmit}>
                          开始查询
                        </Button>
                      </Space.Compact>

                      <Space wrap>
                        {facilityShortcuts.map((keyword) => (
                          <Button
                            key={keyword}
                            size="small"
                            type={nearbyFacilityKeyword === keyword ? 'primary' : 'default'}
                            onClick={() => handleQuickNearbyFilter(keyword)}
                          >
                            {keyword}
                          </Button>
                        ))}
                      </Space>

                      <Space wrap>
                        <Text type="secondary">查询范围：</Text>
                        {nearbyRadiusOptions.map((radius) => (
                          <Button
                            key={radius}
                            size="small"
                            type={nearbyRadiusKm === radius ? 'primary' : 'default'}
                            onClick={() => handleNearbyRadiusChange(radius)}
                          >
                            {radius} 公里
                          </Button>
                        ))}
                      </Space>

                      <Space wrap>
                        <Button onClick={handleNearbyKeywordSubmit}>按当前中心刷新</Button>
                        <Button
                          icon={<AimOutlined />}
                          loading={resolvingCurrentLocation}
                          onClick={handleUseCurrentLocationNearby}
                        >
                          使用当前位置
                        </Button>
                        <Button type={isWatchingCurrentLocation ? 'primary' : 'default'} onClick={handleToggleCurrentLocationTracking}>
                          {isWatchingCurrentLocation ? '停止实时跟踪' : '实时跟踪当前位置'}
                        </Button>
                        {selectedPlace ? (
                          <Button icon={<EnvironmentOutlined />} onClick={() => toFacilityQueryAroundPlace(selectedPlace)}>
                            在查询页展开
                          </Button>
                        ) : null}
                      </Space>

                      <Space wrap>
                        {isWatchingCurrentLocation ? <Tag color="green">实时定位中</Tag> : null}
                        {currentLocation ? (
                          <Tag color="blue">
                            {`定位：${currentLocation.latitude.toFixed(5)}, ${currentLocation.longitude.toFixed(5)}`}
                          </Tag>
                        ) : null}
                        {currentLocationError ? <Tag color="red">{currentLocationError}</Tag> : null}
                      </Space>

                      {nearbyError ? <Alert type="warning" showIcon message={nearbyError} /> : null}

                      <div>
                        <Space wrap style={{ marginBottom: 12 }}>
                          <Title level={5} style={{ margin: 0 }}>
                            附近设施结果
                          </Title>
                          <Tag color="green">{formatDistanceSource(nearbyFacilities[0]?.distanceSource)}</Tag>
                          <Tag>{`范围 ${nearbyRadiusKm} 公里`}</Tag>
                          <Tag color="blue">{`共 ${nearbyFacilities.length} 条`}</Tag>
                        </Space>
                        <Paragraph type="secondary" style={{ marginTop: 0 }}>
                          结果默认按距离由近到远排序。点击某一条结果后，地图会聚焦到该设施，方便继续导航。
                        </Paragraph>

                        {loadingNearbyFacilities ? (
                          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                            <Spin />
                          </div>
                        ) : nearbyFacilities.length ? (
                          <List
                            dataSource={nearbyFacilities}
                            itemLayout="vertical"
                            split={false}
                            renderItem={(item, index) => (
                              <List.Item
                                key={item.id}
                                onClick={() => handleFocusNearbyFacility(item)}
                                style={{
                                  borderRadius: 18,
                                  marginBottom: 12,
                                  padding: 16,
                                  cursor: 'pointer',
                                  border:
                                    focusedNearbyFacilityId === item.id
                                      ? '1px solid rgba(37,99,235,0.9)'
                                      : '1px solid rgba(226,232,240,0.9)',
                                  background:
                                    focusedNearbyFacilityId === item.id
                                      ? 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(56,189,248,0.08))'
                                      : '#ffffff',
                                  boxShadow:
                                    focusedNearbyFacilityId === item.id
                                      ? '0 10px 24px rgba(37,99,235,0.12)'
                                      : 'none',
                                }}
                                actions={[
                                  <Button
                                    key="navigate"
                                    type="link"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      toPathPlanningBetweenPlaces(item.name, item.latitude, item.longitude);
                                    }}
                                  >
                                    开始导航
                                  </Button>,
                                  <Button
                                    key="center"
                                    type="link"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleUseFacilityAsCenter(item);
                                    }}
                                  >
                                    以这里为中心
                                  </Button>,
                                ]}
                              >
                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                  <Space wrap>
                                    <Tag color="blue">{`第 ${index + 1} 个`}</Tag>
                                    <Text strong>{item.name}</Text>
                                    <Tag color="gold">{item.category || '设施'}</Tag>
                                    {focusedNearbyFacilityId === item.id ? <Tag color="processing">地图已聚焦</Tag> : null}
                                  </Space>
                                  <Space wrap>
                                    <Text>{formatDistanceKm(item.distanceKm)}</Text>
                                    <Text type="secondary">{formatDistanceSource(item.distanceSource)}</Text>
                                  </Space>
                                  <Text type="secondary">{item.description || '可继续以该设施为中心查找附近服务点。'}</Text>
                                </Space>
                              </List.Item>
                            )}
                          />
                        ) : (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="当前条件下暂未查到设施，可以切换类别、扩大范围或更换中心点。"
                          />
                        )}
                      </div>
                    </Space>
                  </Card>

                  <Card
                    variant="borderless"
                    style={{ borderRadius: 22, marginTop: 16, boxShadow: '0 14px 30px rgba(15,23,42,0.06)' }}
                  >
                    <Title level={4} style={{ marginTop: 0 }}>
                      热门场所速览
                    </Title>
                    <List
                      dataSource={previewPlaces}
                      renderItem={(item) => (
                        <List.Item>
                          <List.Item.Meta
                            title={item.name}
                            description={
                              <Space wrap>
                                <Tag>{item.category}</Tag>
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() => {
                                    if (hasCoordinate(item.latitude, item.longitude)) {
                                      const place: ScenicPlaceMarker = {
                                        id: item.id,
                                        name: item.name,
                                        position: [Number(item.latitude), Number(item.longitude)],
                                        markerType: item.markerType,
                                        placeKind: item.placeKind,
                                        category: item.category,
                                      };
                                      setSelectedPlace(place);
                                      void runNearbyFacilitySearch(place);
                                    }
                                  }}
                                >
                                  设为中心
                                </Button>
                              </Space>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>

                <Col xs={24} lg={13}>
                  <Card
                    variant="borderless"
                    style={{ borderRadius: 22, boxShadow: '0 14px 30px rgba(15,23,42,0.06)' }}
                  >
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      <div>
                        <Title level={4} style={{ margin: 0 }}>
                          景区地图
                        </Title>
                        <Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
                          点击地图上的景区、景点或设施，即可把它设为查询中心；地图会同时展示中心点和附近设施。
                        </Paragraph>
                      </div>

                      <Space wrap>
                        <Tag color="green">绿色 S：当前位置或起始中心</Tag>
                        <Tag color="purple">紫色 景：景点</Tag>
                        <Tag color="gold">橙色 设：设施</Tag>
                      </Space>

                      <MapComponent
                        center={center}
                        zoom={16}
                        markers={displayMarkers}
                        activeMarkerId={
                          focusedNearbyFacilityId ? markerIdForNearbyFacility(focusedNearbyFacilityId) : selectedPlace?.id || null
                        }
                        onMarkerSelect={handleMarkerSelect}
                        focusPoints={nearbyFocusPoints.length ? nearbyFocusPoints : [center]}
                        roadNetwork={roadNetwork || undefined}
                        showRoadNetwork
                        baseMapMode="scenic"
                        scenicAreaName={scenic.name}
                      />
                    </Space>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'services',
            label: '游中服务',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12} xl={6}>
                  <Card
                    variant="borderless"
                    style={{ borderRadius: 22, height: '100%', boxShadow: '0 14px 30px rgba(15,23,42,0.06)' }}
                  >
                    <Space direction="vertical" size={10}>
                      <Title level={4} style={{ margin: 0 }}>
                        户外路径规划
                      </Title>
                      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                        从景区、景点或设施继续进入路径规划，支持单点导航与多点游览路线。
                      </Paragraph>
                      <Button type="primary" onClick={() => toPathPlanning()}>
                        去规划路线
                      </Button>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} md={12} xl={6}>
                  <Card
                    variant="borderless"
                    style={{ borderRadius: 22, height: '100%', boxShadow: '0 14px 30px rgba(15,23,42,0.06)' }}
                  >
                    <Space direction="vertical" size={10}>
                      <Title level={4} style={{ margin: 0 }}>
                        附近设施查询
                      </Title>
                      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                        输入类别名称，或直接点击地图上的场所作为中心点，按真实路网距离查找附近服务设施。
                      </Paragraph>
                      <Button onClick={() => toFacilityQuery('游客中心')}>查询设施</Button>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} md={12} xl={6}>
                  <Card
                    variant="borderless"
                    style={{ borderRadius: 22, height: '100%', boxShadow: '0 14px 30px rgba(15,23,42,0.06)' }}
                  >
                    <Space direction="vertical" size={10}>
                      <Title level={4} style={{ margin: 0 }}>
                        景区美食推荐
                      </Title>
                      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                        根据景区上下文继续查看附近美食，并衔接到日记和导航模块。
                      </Paragraph>
                      <Button onClick={toFood}>去看美食</Button>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} md={12} xl={6}>
                  <Card
                    variant="borderless"
                    style={{ borderRadius: 22, height: '100%', boxShadow: '0 14px 30px rgba(15,23,42,0.06)' }}
                  >
                    <Space direction="vertical" size={10}>
                      <Title level={4} style={{ margin: 0 }}>
                        室内导航
                      </Title>
                      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                        当目标位于建筑内部时，可以继续进入室内导航完成入口到房间的路线引导。
                      </Paragraph>
                      <Button onClick={toIndoorNavigation}>进入室内导航</Button>
                    </Space>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'photo',
            label: '摄影打卡',
            children: <PhotoSpotComponent scenicAreaId={id || ''} />,
          },
        ]}
      />
    </div>
  );
};

export default ScenicAreaDetailPage;
