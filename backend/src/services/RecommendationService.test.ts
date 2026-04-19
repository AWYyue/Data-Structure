import { ScenicArea } from '../entities/ScenicArea';
import {
  AttractionRecommendationItem,
  RecommendationService,
  RecommendationUserProfile,
} from './RecommendationService';
import { ScenicPresentation } from '../utils/scenicPresentation';

const makeArea = (id: string, name: string, cityLabel = '北京') =>
  ({
    id,
    name,
    category: '景区',
    latitude: 39.960227,
    longitude: 116.3519331,
    averageRating: 4.6,
    popularity: 100000,
    visitorCount: 100000,
    coverImageUrl: '',
    coverImageTheme: '景区',
    cityLabel,
  }) as ScenicArea & ScenicPresentation;

describe('RecommendationService city itinerary coordinates', () => {
  it('spreads collapsed scenic coordinates into distinct city stops', () => {
    const service = new RecommendationService() as any;
    const areas = [
      makeArea('1', '故宫博物院'),
      makeArea('2', '颐和园'),
      makeArea('3', '北京奥林匹克公园'),
    ];

    const resolved = service.resolveCityAreaCoordinates('北京', areas);
    const coordinateKeys = areas.map((area) => {
      const coordinate = resolved.get(area.id);
      expect(coordinate).toBeDefined();
      return `${coordinate.latitude.toFixed(4)}:${coordinate.longitude.toFixed(4)}`;
    });

    expect(new Set(coordinateKeys).size).toBe(areas.length);
  });

  it('adds a visible bend to long overview segments', () => {
    const service = new RecommendationService() as any;
    const points = service.buildOverviewSegmentPoints(
      { latitude: 39.9163, longitude: 116.3972 },
      { latitude: 39.9999, longitude: 116.2755 },
      1,
      1,
    );

    expect(points).toHaveLength(3);
    expect(points[1].latitude).not.toBeCloseTo((points[0].latitude + points[2].latitude) / 2, 6);
  });
});

const makeRecommendationAttraction = (
  id: string,
  name: string,
  baseHeat: number,
  averageRating: number,
  tags: string[],
  distanceKm: number,
): AttractionRecommendationItem => ({
  id,
  name,
  baseHeat,
  averageRating,
  tags,
  distanceKm,
});

const makeUserProfile = (interestWeights: Record<string, number>): RecommendationUserProfile => ({
  id: 'user-1',
  interestWeights,
});

describe('RecommendationService attraction recommendations', () => {
  it('calculates a higher score for closer and hotter attractions', () => {
    const service = new RecommendationService();
    const nearby = makeRecommendationAttraction('a-1', '湖畔公园', 7600, 4.7, ['自然风光'], 0.4);
    const distant = makeRecommendationAttraction('a-2', '湖畔公园远端', 3200, 4.2, ['自然风光'], 3.8);

    expect(service.calculateScore(nearby)).toBeGreaterThan(service.calculateScore(distant));
  });

  it('keeps only the highest scored top-k attractions with a min-heap', () => {
    const service = new RecommendationService();
    const user = makeUserProfile({
      自然风光: 0.95,
      历史人文: 0.45,
    });
    const attractions = [
      makeRecommendationAttraction('a-1', '森林公园', 7800, 4.9, ['自然风光'], 0.3),
      makeRecommendationAttraction('a-2', '古城遗址', 6100, 4.8, ['历史人文'], 0.6),
      makeRecommendationAttraction('a-3', '商业街', 2500, 3.9, ['购物'], 2.8),
      makeRecommendationAttraction('a-4', '湖心花园', 7200, 4.6, ['自然风光'], 0.5),
    ];

    const result = service.getTopKRecommendations(attractions, 2, user);

    expect(result).toHaveLength(2);
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    expect(result.map((item) => item.name)).toEqual(['森林公园', '湖心花园']);
  });

  it('prioritizes attractions whose tags match the user interests', () => {
    const service = new RecommendationService();
    const user = makeUserProfile({
      自然风光: 0.9,
      博物馆: 0.4,
    });
    const attractions = [
      makeRecommendationAttraction('a-1', '滨水公园', 7000, 4.5, ['自然风光'], 1.2),
      makeRecommendationAttraction('a-2', '城市博物馆', 7800, 4.7, ['博物馆'], 1.5),
      makeRecommendationAttraction('a-3', '夜市街区', 7900, 4.6, ['美食'], 0.8),
    ];

    const result = service.recommendByTags(attractions, user, 2);

    expect(result).toHaveLength(2);
    expect(result[0].tagMatchScore).toBeGreaterThanOrEqual(result[1].tagMatchScore);
    expect(result.map((item) => item.name)).toContain('滨水公园');
    expect(result.map((item) => item.name)).toContain('城市博物馆');
    expect(result.map((item) => item.name)).not.toContain('夜市街区');
  });
});
