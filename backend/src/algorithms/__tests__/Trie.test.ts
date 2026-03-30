import { Trie } from '../Trie';

describe('Trie', () => {
  it('supports exact and prefix search', () => {
    const trie = new Trie<string>();
    trie.insert('北京大学', 'pku');
    trie.insert('北京天安门', 'tiananmen');
    trie.insert('Beijing Museum', 'museum');

    expect(trie.searchExact('  beijing museum ')).toEqual(['museum']);

    const prefixHits = trie.searchByPrefix('北京');
    expect(prefixHits).toContain('pku');
    expect(prefixHits).toContain('tiananmen');
  });

  it('clears all data', () => {
    const trie = new Trie<number>();
    trie.insert('alpha', 1);
    trie.insert('alphabet', 2);

    expect(trie.size()).toBe(2);
    trie.clear();
    expect(trie.size()).toBe(0);
    expect(trie.searchByPrefix('alp')).toEqual([]);
  });
});
