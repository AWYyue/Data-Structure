export class TrieNode<T> {
  children: Map<string, TrieNode<T>> = new Map();
  payloads: T[] = [];
  words: string[] = [];
  isEnd = false;
}

export interface TrieEntry<T> {
  word: string;
  payload?: T;
}

/**
 * 泛型 Trie：用于名称前缀查询。
 */
export class Trie<T> {
  private root = new TrieNode<T>();
  private wordCount = 0;
  private readonly normalizer: (input: string) => string;

  constructor(normalizer?: (input: string) => string) {
    this.normalizer = normalizer ?? ((input) => input.toLowerCase().trim());
  }

  insert(word: string, payload?: T): void {
    const rawWord = word.trim();
    const key = this.normalizer(word);
    if (!key) return;

    let node = this.root;
    for (const ch of key) {
      if (!node.children.has(ch)) {
        node.children.set(ch, new TrieNode<T>());
      }
      node = node.children.get(ch)!;
    }
    if (!node.isEnd) {
      this.wordCount += 1;
      node.isEnd = true;
    }
    if (!node.words.includes(rawWord)) {
      node.words.push(rawWord);
    }
    if (payload !== undefined) {
      node.payloads.push(payload);
    }
  }

  bulkInsert(entries: Array<TrieEntry<T>>): void {
    for (const entry of entries) {
      this.insert(entry.word, entry.payload);
    }
  }

  searchExact(word: string): T[] {
    const node = this.findNode(this.normalizer(word));
    if (!node || !node.isEnd) return [];
    return [...node.payloads];
  }

  searchExactWords(word: string): string[] {
    const node = this.findNode(this.normalizer(word));
    if (!node || !node.isEnd) return [];
    return [...node.words];
  }

  searchPrefix(prefix: string, limit: number = 50): string[] {
    const node = this.findNode(this.normalizer(prefix));
    if (!node) return [];

    const out: string[] = [];
    const seen = new Set<string>();
    const stack: TrieNode<T>[] = [node];
    while (stack.length && out.length < limit) {
      const current = stack.pop()!;
      if (current.isEnd) {
        for (const word of current.words) {
          if (seen.has(word)) {
            continue;
          }
          seen.add(word);
          out.push(word);
          if (out.length >= limit) break;
        }
      }
      const children = Array.from(current.children.values()).reverse();
      for (const child of children) {
        stack.push(child);
      }
    }
    return out;
  }

  searchByPrefix(prefix: string, limit: number = 50): T[] {
    const node = this.findNode(this.normalizer(prefix));
    if (!node) return [];

    const out: T[] = [];
    const stack: TrieNode<T>[] = [node];
    while (stack.length && out.length < limit) {
      const current = stack.pop()!;
      if (current.isEnd) {
        for (const payload of current.payloads) {
          out.push(payload);
          if (out.length >= limit) break;
        }
      }
      const children = Array.from(current.children.values()).reverse();
      for (const child of children) {
        stack.push(child);
      }
    }
    return out;
  }

  clear(): void {
    this.root = new TrieNode<T>();
    this.wordCount = 0;
  }

  size(): number {
    return this.wordCount;
  }

  private findNode(key: string): TrieNode<T> | null {
    if (!key) return null;
    let node = this.root;
    for (const ch of key) {
      const next = node.children.get(ch);
      if (!next) return null;
      node = next;
    }
    return node;
  }
}

export const buildTrieFromEntries = <T>(
  entries: Array<TrieEntry<T>>,
  normalizer?: (input: string) => string,
): Trie<T> => {
  const trie = new Trie<T>(normalizer);
  trie.bulkInsert(entries);
  return trie;
};

export const buildTrieFromWords = (
  words: string[],
  normalizer?: (input: string) => string,
): Trie<string> => {
  return buildTrieFromEntries(
    words.map((word) => ({ word, payload: word })),
    normalizer,
  );
};

