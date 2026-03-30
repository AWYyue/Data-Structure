import { InvertedIndex } from '../InvertedIndex';

describe('InvertedIndex', () => {
  it('returns ranked results for any/all mode', () => {
    const index = new InvertedIndex();
    index.addDocument('d1', '北京 博物馆 艺术 展览');
    index.addDocument('d2', '北京 小吃 美食');
    index.addDocument('d3', 'museum guide in beijing');

    const anyHits = index.search('北京 博物馆', 'any', 5);
    expect(anyHits.length).toBeGreaterThan(0);
    expect(anyHits[0].id).toBe('d1');

    const allHits = index.search('北京 博物馆', 'all', 5);
    expect(allHits.map((item) => item.id)).toEqual(['d1']);
  });

  it('updates and removes documents correctly', () => {
    const index = new InvertedIndex();
    index.addDocument('d1', 'old text');
    index.updateDocument('d1', 'new scenic diary');

    expect(index.search('new', 'any', 5).map((item) => item.id)).toContain('d1');
    index.removeDocument('d1');
    expect(index.search('new', 'any', 5)).toEqual([]);
  });
});
