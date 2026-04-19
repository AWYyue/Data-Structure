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

  it('initializes a scenic trie and applies category/rating filters', () => {
    const service = new QueryService() as any;
    const scenicAreas = [
      {
        id: 's1',
        name: '博物馆公园',
        description: '城市中心公园',
        category: '公园',
        rating: 4.7,
        tags: '博物馆,公园',
        createdAt: new Date(),
        updatedAt: new Date(),
        averageRating: 4.8,
      },
      {
        id: 's2',
        name: '博物馆广场',
        description: '文化活动广场',
        category: '广场',
        rating: 4.2,
        tags: '文化,广场',
        createdAt: new Date(),
        updatedAt: new Date(),
        averageRating: 4.1,
      },
      {
        id: 's3',
        name: '城市公园',
        description: '亲子游乐地',
        category: '公园',
        rating: 4.5,
        tags: '亲子,自然',
        createdAt: new Date(),
        updatedAt: new Date(),
        averageRating: 4.6,
      },
    ];

    const trie = service.initializeScenicTrie(scenicAreas);
    expect(trie.searchPrefix('博物')).toEqual(['博物馆公园', '博物馆广场']);

    const filtered = service.applyScenicAreaFilters(scenicAreas, ['公园'], 4.6);
    expect(filtered.map((item: { id: string }) => item.id)).toEqual(['s1', 's3']);
  });

  it('supports scenic suggestions by contains match and keyword match', () => {
    const service = new QueryService() as any;
    const scenicAreas = [
      {
        id: 's1',
        name: '上海博物馆',
        description: '城市历史与艺术展陈',
        category: '景区',
        rating: 4.8,
        tags: '博物馆,上海,历史人文',
        createdAt: new Date(),
        updatedAt: new Date(),
        averageRating: 4.9,
        popularity: 80000,
      },
      {
        id: 's2',
        name: '天津博物馆',
        description: '近代文化主题展馆',
        category: '景区',
        rating: 4.7,
        tags: '博物馆,天津,文化',
        createdAt: new Date(),
        updatedAt: new Date(),
        averageRating: 4.8,
        popularity: 76000,
      },
      {
        id: 's3',
        name: '圆明园遗址公园',
        description: '遗址保护与历史教育基地',
        category: '景区',
        rating: 4.8,
        tags: '遗址,公园,历史人文',
        createdAt: new Date(),
        updatedAt: new Date(),
        averageRating: 4.8,
        popularity: 79000,
      },
      {
        id: 's4',
        name: '玄武湖公园',
        description: '自然风光与环湖漫游',
        category: '景区',
        rating: 4.6,
        tags: '公园,南京,自然风光',
        createdAt: new Date(),
        updatedAt: new Date(),
        averageRating: 4.7,
        popularity: 70000,
      },
    ];

    service.scenicSnapshot = scenicAreas;
    service.scenicTrie = service.initializeScenicTrie(scenicAreas);

    expect(service.collectScenicSuggestionMatches('博物馆', 5).map((item: { name: string }) => item.name)).toEqual(
      expect.arrayContaining(['上海博物馆', '天津博物馆']),
    );
    expect(service.collectScenicSuggestionMatches('遗址', 5).map((item: { name: string }) => item.name)).toContain(
      '圆明园遗址公园',
    );
  });
});
