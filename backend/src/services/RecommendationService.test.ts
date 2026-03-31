import { ScenicArea } from '../entities/ScenicArea';
import { RecommendationService } from './RecommendationService';
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
