import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Empty,
  Radio,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import MapComponent from '../components/MapComponent';
import PremiumPageHero from '../components/PremiumPageHero';
import recommendationService, {
  CityDestinationOption,
  CityItineraryDay,
  CityItineraryStop,
  CityTravelItinerary,
  CityTravelTheme,
} from '../services/recommendationService';
import { useAppDispatch, useAppSelector } from '../store';
import { updateInterests } from '../store/slices/userSlice';
import { resolveErrorMessage } from '../utils/errorMessage';
import { haversineDistanceKm } from '../utils/geoUtils';

const { Title, Paragraph, Text } = Typography;

const cardStyle: React.CSSProperties = {
  borderRadius: 24,
  boxShadow: '0 18px 40px rgba(15,23,42,0.08)',
  height: '100%',
};

const DEFAULT_DAY_START_MINUTES = 9 * 60 + 30;
const STOPS_PER_DAY_OPTIONS = [
  { label: '2 个景点', value: 2 },
  { label: '3 个景点', value: 3 },
  { label: '4 个景点', value: 4 },
];
const TRIP_DAY_OPTIONS = [
  { label: '1 天', value: 1 },
  { label: '2 天', value: 2 },
  { label: '3 天', value: 3 },
];
const DAY_COLOR_FALLBACK = ['#2563eb', '#16a34a', '#f59e0b', '#8b5cf6'];

const interestOptions = [
  { value: 'foodie', label: '美食', description: '优先强化美食密度、餐饮丰富度和适合边逛边吃的路线。' },
  { value: 'photographer', label: '拍照', description: '优先强化高出片景点、观景顺序和拍摄节奏。' },
  { value: 'cultureEnthusiast', label: '人文', description: '优先强化古迹、博物馆、历史街区等文化内容。' },
  { value: 'natureLover', label: '自然', description: '优先强化公园、水岸、山景和户外视野。' },
  { value: 'relaxationSeeker', label: '慢游', description: '优先降低赶路感，让每日停留更舒展。' },
  { value: 'sportsEnthusiast', label: '活力', description: '优先强化探索感和串联步行的连贯性。' },
  { value: 'socialSharer', label: '分享', description: '优先强化热门打卡点和适合分享的体验节点。' },
];

const themeOptions: Array<{ value: CityTravelTheme; label: string; summary: string }> = [
  { value: 'comprehensive', label: '综合', summary: '平衡热度、评分、体验密度和城市代表性，适合作为默认方案。' },
  { value: 'foodie', label: '美食', summary: '优先安排餐饮资源更丰富、适合逛吃的景点与街区。' },
  { value: 'photographer', label: '拍照', summary: '优先安排更容易出片、顺序更适合拍摄的景点。' },
  { value: 'culture', label: '人文', summary: '优先安排历史文化、古迹和博物馆类景点。' },
  { value: 'nature', label: '自然', summary: '优先安排公园、湖景、山水和户外景观。' },
  { value: 'relaxation', label: '慢游', summary: '优先安排节奏更舒缓、停留更舒服的路线。' },
  { value: 'personalized', label: '个性化', summary: '读取你保存的兴趣画像，动态重排每日景点顺序。' },
];

const themeLabelMap = Object.fromEntries(themeOptions.map((item) => [item.value, item.label])) as Record<
  CityTravelTheme,
  string
>;

const formatClock = (minutes: number) => {
  const normalized = Math.max(0, Math.round(minutes));
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const formatMinutes = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.round(Number(minutes || 0)));
  const hours = Math.floor(safeMinutes / 60);
  const remaining = safeMinutes % 60;
  if (hours <= 0) return `${remaining} 分钟`;
  if (remaining <= 0) return `${hours} 小时`;
  return `${hours} 小时 ${remaining} 分钟`;
};

const formatDistance = (distanceKm: number) => `${Number(distanceKm || 0).toFixed(1)} km`;

const estimateStopStayMinutes = (stop: CityItineraryStop) => {
  const joinedTags = (stop.highlightTags || []).join('|');
  let stayMinutes = 78;

  if (/文化|博物馆|古迹|历史/.test(joinedTags)) stayMinutes += 26;
  if (/美食|夜市|小吃|餐饮/.test(joinedTags)) stayMinutes += 18;
  if (/自然|公园|湖|山|风景/.test(joinedTags)) stayMinutes += 22;
  if (stop.popularity >= 15000) stayMinutes += 12;
  if (stop.averageRating >= 4.6) stayMinutes += 8;

  return Math.min(140, Math.max(60, Math.round(stayMinutes)));
};

const estimateTransferMinutes = (from: CityItineraryStop, to: CityItineraryStop) => {
  const distanceKm = haversineDistanceKm(from.latitude, from.longitude, to.latitude, to.longitude);
  return Math.max(18, Math.round(distanceKm * 5.5));
};

const estimateDisplayedDistanceKm = (stops: CityItineraryStop[]) => {
  if (stops.length < 2) return 0;
  let total = 0;
  for (let index = 0; index < stops.length - 1; index += 1) {
    total += haversineDistanceKm(
      stops[index].latitude,
      stops[index].longitude,
      stops[index + 1].latitude,
      stops[index + 1].longitude,
    );
  }
  return Number((total * 1.18).toFixed(1));
};

const buildDayTimeline = (day: CityItineraryDay) => {
  const schedule = new Map<string, { startMinutes: number; startLabel: string }>();
  if (!day.stops.length) {
    return {
      schedule,
      startLabel: '--:--',
      endLabel: '--:--',
      totalMinutes: 0,
    };
  }

  let cursor = DEFAULT_DAY_START_MINUTES;
  day.stops.forEach((stop, index) => {
    schedule.set(stop.id, { startMinutes: cursor, startLabel: formatClock(cursor) });
    cursor += estimateStopStayMinutes(stop);
    if (index < day.stops.length - 1) {
      cursor += estimateTransferMinutes(stop, day.stops[index + 1]);
    }
  });

  return {
    schedule,
    startLabel: formatClock(DEFAULT_DAY_START_MINUTES),
    endLabel: formatClock(cursor),
    totalMinutes: cursor - DEFAULT_DAY_START_MINUTES,
  };
};

const buildPresentedItinerary = (
  source: CityTravelItinerary,
  requestedTripDays: number,
  stopsPerDay: number,
): CityTravelItinerary => {
  const flatStops = source.days
    .flatMap((day) => [...day.stops].sort((left, right) => left.order - right.order))
    .sort((left, right) => left.day - right.day || left.order - right.order);

  if (!flatStops.length) return source;

  const displayedStops = flatStops.slice(0, Math.min(flatStops.length, requestedTripDays * stopsPerDay));
  const activeDayCount = Math.max(1, Math.min(requestedTripDays, Math.ceil(displayedStops.length / stopsPerDay)));
  const legends = Array.from({ length: activeDayCount }, (_, index) => ({
    id: `day-${index + 1}`,
    label: `第 ${index + 1} 天`,
    color: source.legend[index]?.color || DAY_COLOR_FALLBACK[index % DAY_COLOR_FALLBACK.length],
  }));

  const dayGroups: CityItineraryStop[][] = [];
  let cursor = 0;
  let remainingStops = displayedStops.length;

  for (let dayIndex = 0; dayIndex < activeDayCount; dayIndex += 1) {
    const daysLeft = activeDayCount - dayIndex;
    const count = Math.min(stopsPerDay, Math.ceil(remainingStops / daysLeft));
    const nextGroup = displayedStops.slice(cursor, cursor + count);
    cursor += count;
    remainingStops -= nextGroup.length;
    dayGroups.push(nextGroup);
  }

  const originalSegmentMap = new Map(source.segments.map((segment) => [`${segment.fromStopId}->${segment.toStopId}`, segment]));

  const days = dayGroups.map((group, dayIndex) => {
    const normalizedStops = group.map((stop, stopIndex) => ({
      ...stop,
      day: dayIndex + 1,
      order: stopIndex + 1,
    }));
    const timeline = buildDayTimeline({
      day: dayIndex + 1,
      title: `第 ${dayIndex + 1} 天`,
      estimatedDistanceKm: 0,
      estimatedTimeMinutes: 0,
      stops: normalizedStops,
    });

    return {
      day: dayIndex + 1,
      title: `第 ${dayIndex + 1} 天`,
      estimatedDistanceKm: estimateDisplayedDistanceKm(normalizedStops),
      estimatedTimeMinutes: timeline.totalMinutes,
      stops: normalizedStops,
    };
  });

  const segments = days.flatMap((day) =>
    day.stops.slice(0, -1).map((stop, index) => {
      const nextStop = day.stops[index + 1];
      const matchedSegment = originalSegmentMap.get(`${stop.id}->${nextStop.id}`);
      return {
        id: `day-${day.day}-segment-${index + 1}`,
        day: day.day,
        order: index + 1,
        fromStopId: stop.id,
        toStopId: nextStop.id,
        points:
          matchedSegment?.points?.length
            ? matchedSegment.points
            : [
                { latitude: stop.latitude, longitude: stop.longitude },
                { latitude: nextStop.latitude, longitude: nextStop.longitude },
              ],
        color: legends[day.day - 1]?.color || DAY_COLOR_FALLBACK[(day.day - 1) % DAY_COLOR_FALLBACK.length],
        label: `第 ${day.day} 天第 ${index + 1} 段`,
      };
    }),
  );

  return {
    ...source,
    tripDays: activeDayCount,
    days,
    segments,
    legend: legends,
    summary: {
      ...source.summary,
      totalStops: displayedStops.length,
      variationSignals: [
        ...source.summary.variationSignals,
        `已按“每日 ${stopsPerDay} 个景点”重排行程节奏`,
      ],
    },
  };
};

const JourneyPlannerPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { message } = App.useApp();
  const { user } = useAppSelector((state) => state.user);

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [savingInterests, setSavingInterests] = useState(false);
  const [cityOptions, setCityOptions] = useState<CityDestinationOption[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [cityLoadError, setCityLoadError] = useState<string | null>(null);
  const [selectedCityLabel, setSelectedCityLabel] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<CityTravelTheme>('comprehensive');
  const [tripDays, setTripDays] = useState(2);
  const [stopsPerDay, setStopsPerDay] = useState(3);
  const [rawItinerary, setRawItinerary] = useState<CityTravelItinerary | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | 'all'>(1);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    setSelectedInterests(Array.isArray(user?.interests) ? user.interests.map((item) => String(item)) : []);
    if (Array.isArray(user?.interests) && user.interests.length > 0) {
      setSelectedTheme('personalized');
    }
  }, [user?.id, user?.interests]);

  useEffect(() => {
    const loadCities = async () => {
      setLoadingCities(true);
      setCityLoadError(null);

      try {
        const response = await recommendationService.getCityDestinationOptions(12);
        const options = response.data || [];
        setCityOptions(options);
        setSelectedCityLabel((current) => current || options[0]?.cityLabel || '');
      } catch (error: unknown) {
        setCityOptions([]);
        setCityLoadError(resolveErrorMessage(error, '加载旅游城市失败，请稍后重试。'));
      } finally {
        setLoadingCities(false);
      }
    };

    void loadCities();
  }, []);

  const selectedCity = useMemo(
    () => cityOptions.find((item) => item.cityLabel === selectedCityLabel) || null,
    [cityOptions, selectedCityLabel],
  );

  const selectedThemeMeta = useMemo(
    () => themeOptions.find((item) => item.value === selectedTheme) || themeOptions[0],
    [selectedTheme],
  );

  const displayedItinerary = useMemo(
    () => (rawItinerary ? buildPresentedItinerary(rawItinerary, tripDays, stopsPerDay) : null),
    [rawItinerary, tripDays, stopsPerDay],
  );

  const selectedDayData = useMemo(
    () => displayedItinerary?.days.find((day) => day.day === selectedDay) || null,
    [displayedItinerary, selectedDay],
  );

  const selectedStop = useMemo(() => {
    if (!displayedItinerary || !selectedStopId) return null;
    for (const day of displayedItinerary.days) {
      const match = day.stops.find((stop) => stop.id === selectedStopId);
      if (match) return match;
    }
    return null;
  }, [displayedItinerary, selectedStopId]);

  const dayTimelineMap = useMemo(() => {
    if (!displayedItinerary) {
      return new Map<number, ReturnType<typeof buildDayTimeline>>();
    }
    return new Map(displayedItinerary.days.map((day) => [day.day, buildDayTimeline(day)]));
  }, [displayedItinerary]);

  const heroMetrics = useMemo(
    () => [
      { label: '当前城市', value: displayedItinerary?.cityLabel || selectedCity?.cityLabel || '待选择' },
      { label: '主题', value: themeLabelMap[displayedItinerary?.theme || selectedTheme] },
      { label: '天数', value: displayedItinerary?.tripDays || tripDays, suffix: '天' },
      { label: '景点数', value: displayedItinerary?.summary.totalStops || 0, suffix: '个' },
    ],
    [displayedItinerary, selectedCity, selectedTheme, tripDays],
  );

  const generateItinerary = async () => {
    if (!selectedCityLabel) return;

    const requestId = Date.now();
    latestRequestIdRef.current = requestId;
    setGenerating(true);
    setGenerationError(null);

    try {
      const response = await recommendationService.generateCityTravelItinerary({
        cityLabel: selectedCityLabel,
        theme: selectedTheme,
        tripDays,
      });

      if (latestRequestIdRef.current !== requestId) return;

      setRawItinerary(response.data);
      setSelectedDay(1);
      setSelectedStopId(response.data.days[0]?.stops[0]?.id || null);
    } catch (error: unknown) {
      if (latestRequestIdRef.current !== requestId) return;
      setRawItinerary(null);
      setSelectedStopId(null);
      setGenerationError(resolveErrorMessage(error, '生成城市旅游日程失败，请稍后重试。'));
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setGenerating(false);
      }
    }
  };

  useEffect(() => {
    if (!selectedCityLabel) return;
    void generateItinerary();
  }, [selectedCityLabel, selectedTheme, tripDays]);

  useEffect(() => {
    if (!displayedItinerary) return;
    if (selectedDay !== 'all' && !displayedItinerary.days.some((day) => day.day === selectedDay)) {
      setSelectedDay(displayedItinerary.days[0]?.day || 'all');
    }
    if (selectedStopId && !displayedItinerary.days.some((day) => day.stops.some((stop) => stop.id === selectedStopId))) {
      setSelectedStopId(displayedItinerary.days[0]?.stops[0]?.id || null);
    }
  }, [displayedItinerary, selectedDay, selectedStopId]);

  const handleSaveInterests = async () => {
    try {
      setSavingInterests(true);
      await dispatch(updateInterests(selectedInterests)).unwrap();
      message.success('兴趣画像已更新');
    } catch (error: unknown) {
      message.error(resolveErrorMessage(error, '保存兴趣画像失败'));
    } finally {
      setSavingInterests(false);
    }
  };

  const handleSelectDay = (day: number | 'all') => {
    setSelectedDay(day);
    if (day === 'all') return;
    const nextDay = displayedItinerary?.days.find((item) => item.day === day);
    if (nextDay?.stops[0]) {
      setSelectedStopId(nextDay.stops[0].id);
    }
  };

  const handleOpenDayNavigation = (day: CityTravelItinerary['days'][number]) => {
    if (!day.stops.length) return;

    const payload = day.stops.map((stop) => ({
      id: stop.scenicAreaId,
      name: stop.scenicAreaName,
      latitude: stop.latitude,
      longitude: stop.longitude,
    }));

    const query = new URLSearchParams({
      mode: 'multi',
      source: 'city-itinerary',
      strategy: 'shortest_time',
      transportations: 'walk',
      autoPlan: '1',
      dayLabel: day.title,
      cityLabel: displayedItinerary?.cityLabel || selectedCityLabel,
      dayRoutePayload: JSON.stringify(payload),
    });

    navigate(`/path-planning?${query.toString()}`);
  };

  const mapMarkers = useMemo(() => {
    if (!displayedItinerary) return [];

    return displayedItinerary.days.flatMap((day) => {
      const dayColor = displayedItinerary.legend.find((item) => item.id === `day-${day.day}`)?.color || '#2563eb';
      const dayTimeline = dayTimelineMap.get(day.day);

      return day.stops.map((stop, index) => {
        const isCurrentDay = selectedDay === 'all' || selectedDay === day.day;
        const isSelectedStop = selectedStopId === stop.id;
        const stopSchedule = dayTimeline?.schedule.get(stop.id);
        const nextStop = day.stops[index + 1];
        const previousStop = day.stops[index - 1];
        const selectedTooltipHtml = `
          <div style="
            background:rgba(255,255,255,0.96);
            color:#0f172a;
            border:1px solid rgba(37,99,235,0.16);
            box-shadow:0 12px 24px rgba(15,23,42,0.14);
            border-radius:14px;
            padding:8px 10px;
            min-width:150px;
            max-width:176px;
          ">
            <div style="font-size:10px;font-weight:700;color:${dayColor};margin-bottom:4px;">${stopSchedule?.startLabel || '--:--'} 开始游览</div>
            <div style="font-size:13px;font-weight:800;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${stop.scenicAreaName}</div>
            <div style="font-size:10px;color:#64748b;margin-top:3px;">第 ${day.day} 天 · 第 ${stop.order} 站 · 评分 ${stop.averageRating.toFixed(1)}</div>
          </div>
        `;
        const popupHtml = `
          <div style="min-width:270px;">
            <div style="display:flex;gap:12px;">
              <div style="
                width:78px;
                height:78px;
                border-radius:14px;
                background-image:linear-gradient(180deg, rgba(15,23,42,0.06), rgba(15,23,42,0.28)), url(${stop.coverImageUrl});
                background-size:cover;
                background-position:center;
                flex-shrink:0;
              "></div>
              <div style="min-width:0;">
                <div style="font-size:12px;color:#64748b;margin-bottom:4px;">第 ${day.day} 天 · 第 ${stop.order} 站</div>
                <div style="font-size:16px;font-weight:800;color:#0f172a;line-height:1.35;">${stop.scenicAreaName}</div>
                <div style="margin-top:6px;color:#2563eb;font-size:12px;font-weight:700;">开始游览：${stopSchedule?.startLabel || '--:--'}</div>
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
              <span style="padding:4px 8px;border-radius:999px;background:#eff6ff;color:#2563eb;font-size:11px;font-weight:700;">评分 ${stop.averageRating.toFixed(1)}</span>
              <span style="padding:4px 8px;border-radius:999px;background:#fff7ed;color:#ea580c;font-size:11px;font-weight:700;">热度 ${Math.round(stop.popularity)}</span>
              ${previousStop ? `<span style="padding:4px 8px;border-radius:999px;background:#ecfeff;color:#0f766e;font-size:11px;font-weight:700;">上一站 ${previousStop.scenicAreaName}</span>` : ''}
              ${nextStop ? `<span style="padding:4px 8px;border-radius:999px;background:#f5f3ff;color:#7c3aed;font-size:11px;font-weight:700;">下一站 ${nextStop.scenicAreaName}</span>` : ''}
            </div>
            <div style="margin-top:10px;color:#475569;line-height:1.55;">${stop.reason}</div>
          </div>
        `;

        return {
          id: stop.id,
          position: [stop.latitude, stop.longitude] as [number, number],
          title: popupHtml,
          disablePopup: true,
          type: 'waypoint' as const,
          imageUrl: stop.coverImageUrl,
          badgeLabel: `${stop.day}-${stop.order}`,
          tooltipPermanent: isSelectedStop,
          tooltipDirection: 'top' as const,
          tooltipOffset: [0, -22] as [number, number],
          tooltipHtml: isSelectedStop ? selectedTooltipHtml : undefined,
          borderColor: isSelectedStop ? '#0f172a' : '#ffffff',
          size: isSelectedStop ? 68 : isCurrentDay ? 54 : 46,
          opacity: isSelectedStop ? 1 : isCurrentDay ? 0.98 : 0.42,
          zIndexOffset: isSelectedStop ? 520 : isCurrentDay ? 300 : 140,
          dimmed: !isCurrentDay,
          shadowColor: dayColor,
        };
      });
    });
  }, [dayTimelineMap, displayedItinerary, selectedDay, selectedStopId]);

  const mapSegments = useMemo(() => {
    if (!displayedItinerary) return [];
    return displayedItinerary.segments.map((segment) => {
      const isActive = selectedDay === 'all' ? true : segment.day === selectedDay;
      return {
        id: segment.id,
        points: segment.points.map((point) => [point.latitude, point.longitude] as [number, number]),
        color: segment.color,
        isActive,
        opacity: selectedDay === 'all' ? 0.84 : isActive ? 0.96 : 0.12,
        weight: selectedDay === 'all' ? 5.6 : isActive ? 7.4 : 2.2,
        title: `${segment.label}`,
      };
    });
  }, [displayedItinerary, selectedDay]);

  const mapLegendItems = useMemo(
    () =>
      displayedItinerary?.legend.map((item) => ({
        id: item.id,
        label: item.label,
        color: item.color,
      })) || [],
    [displayedItinerary],
  );

  const mapFocusPoints = useMemo(() => {
    if (!displayedItinerary) return [];
    if (selectedStop) {
      return [[selectedStop.latitude, selectedStop.longitude] as [number, number]];
    }
    if (selectedDayData) {
      return selectedDayData.stops.map((stop) => [stop.latitude, stop.longitude] as [number, number]);
    }
    return displayedItinerary.days.flatMap((day) => day.stops.map((stop) => [stop.latitude, stop.longitude] as [number, number]));
  }, [displayedItinerary, selectedDayData, selectedStop]);

  return (
    <div style={{ padding: 8, maxWidth: 1440, margin: '0 auto' }}>
      <PremiumPageHero
        title="智能行程"
        description="先选旅游城市，再切换美食、拍照、人文、自然或个性化标签，系统会重新生成真正会变化的城市多日路线。"
        accent="teal"
        eyebrow="城市日程总览"
        coverImageUrl={selectedCity?.coverImageUrl}
        coverLabel={selectedCity?.coverImageTheme}
        tags={['城市级路线', '多日安排', '地图总览', '详细导航接力']}
        metrics={heroMetrics}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card variant="borderless" style={cardStyle}>
            <Title level={4} style={{ marginTop: 0 }}>
              兴趣画像
            </Title>
            <Paragraph type="secondary">保存兴趣标签后，选择“个性化”主题时会直接按你的偏好重新排列城市路线。</Paragraph>
            <Space wrap size={8}>
              {interestOptions.map((item) => (
                <Tag.CheckableTag
                  key={item.value}
                  checked={selectedInterests.includes(item.value)}
                  onChange={(checked) =>
                    setSelectedInterests((current) =>
                      checked ? [...new Set([...current, item.value])] : current.filter((value) => value !== item.value),
                    )
                  }
                >
                  {item.label}
                </Tag.CheckableTag>
              ))}
            </Space>

            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              {selectedInterests.length > 0 ? (
                interestOptions
                  .filter((item) => selectedInterests.includes(item.value))
                  .map((item) => (
                    <div
                      key={item.value}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 14,
                        background: '#f8fafc',
                        border: '1px solid rgba(148,163,184,0.22)',
                      }}
                    >
                      <Text strong>{item.label}</Text>
                      <div style={{ color: '#64748b', marginTop: 4 }}>{item.description}</div>
                    </div>
                  ))
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="先选一些兴趣标签，个性化路线才会更明显。" />
              )}
            </div>

            <Button type="primary" block loading={savingInterests} onClick={handleSaveInterests} style={{ marginTop: 16 }}>
              保存兴趣画像
            </Button>
          </Card>
        </Col>

        <Col xs={24} xl={16}>
          <Card variant="borderless" style={cardStyle}>
            <Title level={4} style={{ marginTop: 0 }}>
              行程设定
            </Title>
            <Paragraph type="secondary">这里直接生成城市级多日路线，并且可以按“每天去几个景点”重排出更合理的节奏。</Paragraph>

            <div style={{ marginBottom: 16 }}>
              <Text strong>主题标签</Text>
              <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                {themeOptions.map((item) => {
                  const active = item.value === selectedTheme;
                  return (
                    <div
                      key={item.value}
                      onClick={() => setSelectedTheme(item.value)}
                      style={{
                        cursor: 'pointer',
                        borderRadius: 18,
                        padding: '14px 16px',
                        border: active ? '1px solid rgba(37,99,235,0.38)' : '1px solid rgba(148,163,184,0.18)',
                        background: active ? 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(13,148,136,0.05))' : '#ffffff',
                      }}
                    >
                      <Text strong>{item.label}</Text>
                      <div style={{ color: '#64748b', marginTop: 8 }}>{item.summary}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Row gutter={[12, 12]}>
              <Col xs={24} md={12}>
                <div style={{ padding: 14, borderRadius: 18, background: '#f8fafc', border: '1px solid rgba(148,163,184,0.16)' }}>
                  <Text strong>旅行天数</Text>
                  <div style={{ marginTop: 12 }}>
                    <Radio.Group
                      options={TRIP_DAY_OPTIONS}
                      optionType="button"
                      buttonStyle="solid"
                      value={tripDays}
                      onChange={(event) => setTripDays(Number(event.target.value))}
                    />
                  </div>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div style={{ padding: 14, borderRadius: 18, background: '#f8fafc', border: '1px solid rgba(148,163,184,0.16)' }}>
                  <Text strong>每日景点数</Text>
                  <div style={{ marginTop: 12 }}>
                    <Radio.Group
                      options={STOPS_PER_DAY_OPTIONS}
                      optionType="button"
                      buttonStyle="solid"
                      value={stopsPerDay}
                      onChange={(event) => setStopsPerDay(Number(event.target.value))}
                    />
                  </div>
                </div>
              </Col>
            </Row>

            <Alert
              showIcon
              type={selectedTheme === 'personalized' ? 'warning' : 'success'}
              style={{ marginTop: 16, borderRadius: 16 }}
              message={`当前策略：${selectedThemeMeta.label}`}
              description={`当前按 ${tripDays} 天行程、每日 ${stopsPerDay} 个景点重排行程，时间会按城市内换乘与停留重新估算。`}
            />
          </Card>
        </Col>
      </Row>

      <Card variant="borderless" style={{ ...cardStyle, marginTop: 16 }}>
        <Title level={4} style={{ marginTop: 0 }}>
          目的城市
        </Title>
        <Paragraph type="secondary">先选旅游城市，系统会以这个城市内的多个景区作为节点，生成真正可用的多日路线。</Paragraph>
        {cityLoadError ? <Alert showIcon type="error" style={{ marginBottom: 14 }} message={cityLoadError} /> : null}

        {loadingCities ? (
          <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
            <Spin />
          </div>
        ) : cityOptions.length === 0 ? (
          <Empty description="暂时没有可用的城市数据。" />
        ) : (
          <Row gutter={[12, 12]}>
            {cityOptions.map((city) => {
              const active = city.cityLabel === selectedCityLabel;
              return (
                <Col xs={24} md={12} xl={8} key={city.cityLabel}>
                  <div
                    onClick={() => setSelectedCityLabel(city.cityLabel)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: 18,
                      overflow: 'hidden',
                      border: active ? '2px solid rgba(37,99,235,0.55)' : '1px solid rgba(148,163,184,0.16)',
                      background: '#fff',
                      boxShadow: active ? '0 14px 34px rgba(37,99,235,0.16)' : '0 8px 20px rgba(15,23,42,0.04)',
                    }}
                  >
                    <div
                      style={{
                        minHeight: 132,
                        padding: 16,
                        color: '#fff',
                        backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.10), rgba(15,23,42,0.52)), url(${city.coverImageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      <Title level={4} style={{ color: '#fff', margin: 0 }}>
                        {city.cityLabel}
                      </Title>
                      <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.86)' }}>{city.coverImageTheme}</div>
                    </div>
                    <div style={{ padding: 14 }}>
                      <Space wrap>
                        <Tag color="blue">{city.scenicCount} 个景区</Tag>
                        <Tag color="green">评分 {city.averageRating.toFixed(2)}</Tag>
                        <Tag color="orange">热度 {Math.round(city.averagePopularity)}</Tag>
                      </Space>
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={8}>
          <Card
            variant="borderless"
            style={cardStyle}
            extra={
              <Button type="primary" loading={generating} onClick={() => void generateItinerary()}>
                重新生成
              </Button>
            }
          >
            <Title level={4} style={{ marginTop: 0 }}>
              多日旅游日程
            </Title>
            <Paragraph type="secondary">未选中的天数只显示摘要，当前选中的那一天才展开详细站点，让左侧更轻一点。</Paragraph>

            {generationError ? <Alert showIcon type="error" message={generationError} style={{ marginBottom: 14 }} /> : null}

            {generating && !displayedItinerary ? (
              <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
                <Spin />
              </div>
            ) : !displayedItinerary ? (
              <Empty description="先选择城市，系统才能生成旅游日程。" />
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                <Alert
                  type="info"
                  showIcon
                  message={`${displayedItinerary.cityLabel} · ${themeLabelMap[displayedItinerary.theme]} · ${displayedItinerary.tripDays} 天`}
                  description={`共安排 ${displayedItinerary.summary.totalStops} 个景点，当前按每日 ${stopsPerDay} 个景点重排行程。`}
                />

                {displayedItinerary.days.map((day) => {
                  const active = selectedDay === day.day;
                  const timeline = dayTimelineMap.get(day.day);
                  return (
                    <div
                      key={day.day}
                      style={{
                        borderRadius: 18,
                        padding: 16,
                        border: active ? '1px solid rgba(37,99,235,0.34)' : '1px solid rgba(148,163,184,0.18)',
                        background: active ? 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(14,165,233,0.03))' : '#fff',
                      }}
                    >
                      <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                        <div
                          onClick={() => handleSelectDay(day.day)}
                          style={{ cursor: 'pointer', display: 'grid', gap: 8, flex: 1 }}
                        >
                          <Space wrap size={8}>
                            <Tag color="blue">{day.title}</Tag>
                            <Tag>{timeline ? `${timeline.startLabel} - ${timeline.endLabel}` : '--:--'}</Tag>
                            <Tag>{formatDistance(day.estimatedDistanceKm)}</Tag>
                            <Tag>{formatMinutes(day.estimatedTimeMinutes)}</Tag>
                          </Space>
                          <Text type="secondary">
                            {active ? '点击下方景点卡可同步聚焦地图。' : `${day.stops.map((stop) => stop.scenicAreaName).join(' · ')}`}
                          </Text>
                        </div>
                        <Space wrap>
                          <Button size="small" type={active ? 'primary' : 'default'} onClick={() => handleSelectDay(day.day)}>
                            聚焦本日
                          </Button>
                          <Button size="small" onClick={() => handleOpenDayNavigation(day)}>
                            进入详细导航
                          </Button>
                        </Space>
                      </Space>

                      {active ? (
                        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                          {day.stops.map((stop) => {
                            const isSelected = selectedStopId === stop.id;
                            const startLabel = timeline?.schedule.get(stop.id)?.startLabel || '--:--';
                            return (
                              <div
                                key={stop.id}
                                onClick={() => {
                                  setSelectedDay(day.day);
                                  setSelectedStopId(stop.id);
                                }}
                                style={{
                                  borderRadius: 16,
                                  padding: '12px 14px',
                                  cursor: 'pointer',
                                  border: isSelected ? '1px solid rgba(37,99,235,0.34)' : '1px solid rgba(148,163,184,0.16)',
                                  background: isSelected ? 'rgba(37,99,235,0.06)' : '#f8fafc',
                                }}
                              >
                                <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                                  <Space wrap size={8}>
                                    <Tag color={isSelected ? 'blue' : 'default'}>{`第 ${stop.order} 站`}</Tag>
                                    <Tag color="cyan">{startLabel}</Tag>
                                    <Text strong>{stop.scenicAreaName}</Text>
                                  </Space>
                                  <Space wrap size={6}>
                                    <Tag color="green">评分 {stop.averageRating.toFixed(1)}</Tag>
                                    <Tag color="orange">热度 {Math.round(stop.popularity)}</Tag>
                                  </Space>
                                </Space>
                                <div style={{ color: '#64748b', marginTop: 8 }}>{stop.reason}</div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <Space wrap size={6} style={{ marginTop: 12 }}>
                          {day.stops.map((stop) => (
                            <Tag key={stop.id}>{stop.scenicAreaName}</Tag>
                          ))}
                        </Space>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={16}>
          <Card variant="borderless" style={cardStyle}>
            <Space wrap style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  城市旅游路线总览图
                </Title>
                <Text type="secondary">点击地图或左侧景点后，会更近地聚焦这个景点，并弹出包含时间、评分、上下站点的近身信息卡。</Text>
              </div>
              <Space wrap>
                <Tag color={selectedDay === 'all' ? 'blue' : 'default'} onClick={() => handleSelectDay('all')} style={{ cursor: 'pointer', paddingInline: 12 }}>
                  全部天数
                </Tag>
                {(displayedItinerary?.days || []).map((day) => (
                  <Tag
                    key={day.day}
                    color={selectedDay === day.day ? 'blue' : 'default'}
                    onClick={() => handleSelectDay(day.day)}
                    style={{ cursor: 'pointer', paddingInline: 12 }}
                  >
                    {day.title}
                  </Tag>
                ))}
              </Space>
            </Space>

            {displayedItinerary ? (
              <>
                <Alert
                  showIcon
                  type="success"
                  style={{ marginBottom: 14, borderRadius: 16 }}
                  message={
                    selectedStop
                      ? `当前已聚焦：${selectedStop.scenicAreaName}`
                      : selectedDay === 'all'
                      ? '当前显示全部天数的总览路线'
                      : `当前突出显示第 ${selectedDay} 天`
                  }
                  description={
                    selectedStop
                      ? '点击景点后，地图会更近地聚焦该点位，并把该站时间、评分、热度、上下站信息放到近身信息卡里。'
                      : '非当前天数的路线会弱化；点击某个景点后会进一步缩放到该景点附近。'
                  }
                />
                <MapComponent
                  center={[displayedItinerary.center.latitude, displayedItinerary.center.longitude]}
                  zoom={11}
                  focusZoom={selectedStop ? 14 : selectedDayData ? 12 : 11}
                  preferFocusPoints={Boolean(selectedStop || selectedDayData)}
                  markers={mapMarkers}
                  activeMarkerId={selectedStopId}
                  onMarkerSelect={(marker) => {
                    setSelectedStopId(marker.id);
                    const match = displayedItinerary.days.find((day) => day.stops.some((stop) => stop.id === marker.id));
                    if (match) setSelectedDay(match.day);
                  }}
                  congestionSegments={mapSegments}
                  pathLegendItems={mapLegendItems}
                  focusPoints={mapFocusPoints}
                  showDirectionArrows
                  baseMapMode="scenic"
                />

                {selectedStop ? (
                  <div
                    style={{
                      marginTop: 16,
                      borderRadius: 20,
                      overflow: 'hidden',
                      border: '1px solid rgba(148,163,184,0.18)',
                      background: '#fff',
                    }}
                  >
                    <div
                      style={{
                        minHeight: 176,
                        padding: 18,
                        color: '#fff',
                        backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.16), rgba(15,23,42,0.56)), url(${selectedStop.coverImageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      <Space direction="vertical" size={6}>
                        <Tag color="blue">{`第 ${selectedStop.day} 天 · 第 ${selectedStop.order} 站`}</Tag>
                        <Text style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>{selectedStop.scenicAreaName}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.84)' }}>
                          当前站点会在地图上自动放大、聚焦，并且把关键信息贴近景点显示。
                        </Text>
                      </Space>
                    </div>
                    <div style={{ padding: 16 }}>
                      <Space wrap>
                        <Tag color="cyan">开始游览 {dayTimelineMap.get(selectedStop.day)?.schedule.get(selectedStop.id)?.startLabel || '--:--'}</Tag>
                        <Tag color="green">评分 {selectedStop.averageRating.toFixed(1)}</Tag>
                        <Tag color="orange">热度 {Math.round(selectedStop.popularity)}</Tag>
                        <Tag>{selectedStop.cityLabel}</Tag>
                      </Space>
                      <div style={{ color: '#475569', marginTop: 10 }}>{selectedStop.reason}</div>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <Empty description="生成日程后，这里会显示城市多日路线总览图。" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default JourneyPlannerPage;
