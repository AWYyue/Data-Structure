import { QueryService } from './QueryService';

describe('QueryService', () => {
  it('propagates distances from a zero-distance start node in dijkstra', () => {
    const service = new QueryService() as any;
    const distances = service.dijkstraDistances(
      [
        { fromNodeId: 'start', toNodeId: 'mid', scenicAreaId: 's1', distance: 120 },
        { fromNodeId: 'mid', toNodeId: 'end', scenicAreaId: 's1', distance: 80 },
      ],
      'start',
    ) as Map<string, number>;

    expect(distances.get('start')).toBe(0);
    expect(distances.get('mid')).toBeCloseTo(0.12, 6);
    expect(distances.get('end')).toBeCloseTo(0.2, 6);
  });
});
