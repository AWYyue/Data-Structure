class TrieNode<T> {
  children: Map<string, TrieNode<T>> = new Map();
  payloads: T[] = [];
  isWord = false;
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

  insert(word: string, payload: T): void {
    const key = this.normalizer(word);
    if (!key) return;

    let node = this.root;
    for (const ch of key) {
      if (!node.children.has(ch)) {
        node.children.set(ch, new TrieNode<T>());
      }
      node = node.children.get(ch)!;
    }
    if (!node.isWord) {
      this.wordCount += 1;
      node.isWord = true;
    }
    node.payloads.push(payload);
  }

  searchExact(word: string): T[] {
    const node = this.findNode(this.normalizer(word));
    if (!node || !node.isWord) return [];
    return [...node.payloads];
  }

  searchByPrefix(prefix: string, limit: number = 50): T[] {
    const node = this.findNode(this.normalizer(prefix));
    if (!node) return [];

    const out: T[] = [];
    const stack: TrieNode<T>[] = [node];
    while (stack.length && out.length < limit) {
      const current = stack.pop()!;
      if (current.isWord) {
        for (const payload of current.payloads) {
          out.push(payload);
          if (out.length >= limit) break;
        }
      }
      for (const child of current.children.values()) {
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

