type MatchMode = 'all' | 'any';

export interface SearchHit {
  id: string;
  score: number;
}

/**
 * 支持中文+英文混合分词的倒排索引，返回按相关度排序的文档命中结果。
 */
export class InvertedIndex {
  private readonly inverted: Map<string, Map<string, number>> = new Map();
  private readonly docs: Map<string, string> = new Map();

  addDocument(id: string, text: string): void {
    if (!id) {
      return;
    }
    this.removeDocument(id);
    this.docs.set(id, text);
    const terms = this.tokenize(text);
    const tf = new Map<string, number>();
    for (const term of terms) {
      tf.set(term, (tf.get(term) ?? 0) + 1);
    }
    for (const [term, count] of tf.entries()) {
      if (!this.inverted.has(term)) {
        this.inverted.set(term, new Map());
      }
      this.inverted.get(term)?.set(id, count);
    }
  }

  updateDocument(id: string, text: string): void {
    this.addDocument(id, text);
  }

  removeDocument(id: string): void {
    const prev = this.docs.get(id);
    if (!prev) {
      return;
    }
    const terms = new Set(this.tokenize(prev));
    for (const term of terms) {
      const postings = this.inverted.get(term);
      if (!postings) continue;
      postings.delete(id);
      if (!postings.size) {
        this.inverted.delete(term);
      }
    }
    this.docs.delete(id);
  }

  search(query: string, mode: MatchMode = 'all', limit: number = 20): SearchHit[] {
    const terms = this.tokenize(query);
    if (!terms.length) {
      return [];
    }

    const queryTf = new Map<string, number>();
    for (const term of terms) {
      queryTf.set(term, (queryTf.get(term) ?? 0) + 1);
    }

    const candidates = new Map<string, number>();
    const termDocCounts = new Map<string, number>();
    const totalDocs = Math.max(this.docs.size, 1);

    for (const [term, qCount] of queryTf.entries()) {
      const postings = this.inverted.get(term);
      if (!postings) {
        if (mode === 'all') {
          return [];
        }
        continue;
      }
      termDocCounts.set(term, postings.size);
      for (const [docId, tf] of postings.entries()) {
        const score = (candidates.get(docId) ?? 0) + this.tfIdf(tf, qCount, postings.size, totalDocs);
        candidates.set(docId, score);
      }
    }

    let entries = Array.from(candidates.entries());
    if (mode === 'all') {
      entries = entries.filter(([docId]) =>
        Array.from(queryTf.keys()).every((term) => this.inverted.get(term)?.has(docId)),
      );
    }

    const ranked = entries
      .map(([id, score]) => ({ id, score: Number(score.toFixed(6)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, limit));

    return ranked;
  }

  getDocument(id: string): string | undefined {
    return this.docs.get(id);
  }

  clear(): void {
    this.inverted.clear();
    this.docs.clear();
  }

  getDocumentCount(): number {
    return this.docs.size;
  }

  getVocabularySize(): number {
    return this.inverted.size;
  }

  private tfIdf(tf: number, qCount: number, docFreq: number, totalDocs: number): number {
    const tfPart = 1 + Math.log(1 + tf);
    const queryPart = 1 + Math.log(1 + qCount);
    const idfPart = Math.log(1 + totalDocs / (1 + docFreq));
    return tfPart * queryPart * idfPart;
  }

  private tokenize(text: string): string[] {
    if (!text) {
      return [];
    }
    const lower = text.toLowerCase();
    const latin = lower.match(/[a-z0-9]+/g) ?? [];
    const chinese = lower.match(/[\u4e00-\u9fa5]/g) ?? [];
    return [...latin, ...chinese].filter((term) => term.length > 0);
  }
}

