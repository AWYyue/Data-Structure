import { InvertedIndex } from '../algorithms/InvertedIndex';
import { Diary } from '../entities/Diary';

export type DiarySearchMode = 'all' | 'any';

export class DiarySearchIndex {
  private readonly fulltextIndex = new InvertedIndex();
  private readonly titleIndex = new Map<string, Set<string>>();
  private readonly destinationIndex = new Map<string, Set<string>>();
  private readonly diaryLookup = new Map<string, Diary>();

  rebuild(diaries: Diary[]): void {
    this.fulltextIndex.clear();
    this.titleIndex.clear();
    this.destinationIndex.clear();
    this.diaryLookup.clear();

    diaries.forEach((diary) => this.upsert(diary));
  }

  upsert(diary: Diary): void {
    if (!diary?.id || !diary.isShared) {
      this.remove(diary?.id || '');
      return;
    }

    this.diaryLookup.set(diary.id, diary);
    this.fulltextIndex.addDocument(diary.id, this.buildDocumentText(diary));
    this.addToMap(this.titleIndex, this.normalize(diary.title), diary.id);
    this.addToMap(this.destinationIndex, this.normalize(diary.destination), diary.id);
  }

  remove(diaryId: string): void {
    if (!diaryId) {
      return;
    }

    const diary = this.diaryLookup.get(diaryId);
    if (diary) {
      this.removeFromMap(this.titleIndex, this.normalize(diary.title), diaryId);
      this.removeFromMap(this.destinationIndex, this.normalize(diary.destination), diaryId);
    }

    this.diaryLookup.delete(diaryId);
    this.fulltextIndex.removeDocument(diaryId);
  }

  searchFulltext(query: string, mode: DiarySearchMode = 'any', limit = 20): string[] {
    const normalizedQuery = this.normalize(query);
    const rankedIds = this.fulltextIndex.search(query, mode, Math.max(limit * 3, limit)).map((item) => item.id);

    const fallbackIds = Array.from(this.diaryLookup.values())
      .filter((diary) => this.normalize(this.buildDocumentText(diary)).includes(normalizedQuery))
      .sort((left, right) => right.popularity - left.popularity)
      .map((diary) => diary.id);

    return this.mergeIds(rankedIds, fallbackIds).slice(0, Math.max(limit * 3, limit));
  }

  searchByExactTitle(title: string, limit = 20): string[] {
    const normalizedTitle = this.normalize(title);
    const exactIds = Array.from(this.titleIndex.get(normalizedTitle) ?? []);
    const prefixIds = Array.from(this.diaryLookup.values())
      .filter((diary) => this.normalize(diary.title).startsWith(normalizedTitle))
      .sort((left, right) => right.popularity - left.popularity)
      .map((diary) => diary.id);
    const includeIds = Array.from(this.diaryLookup.values())
      .filter((diary) => this.normalize(diary.title).includes(normalizedTitle))
      .sort((left, right) => right.popularity - left.popularity)
      .map((diary) => diary.id);

    return this.mergeIds(exactIds, prefixIds, includeIds).slice(0, limit);
  }

  searchByDestination(destination: string, limit = 20): string[] {
    const normalized = this.normalize(destination);
    const exact = Array.from(this.destinationIndex.get(normalized) ?? []);
    if (exact.length > 0) {
      return exact.slice(0, limit);
    }

    return Array.from(this.diaryLookup.values())
      .filter((diary) => {
        const normalizedDestination = this.normalize(diary.destination);
        const normalizedTitle = this.normalize(diary.title);
        return normalizedDestination.includes(normalized) || normalizedTitle.includes(normalized);
      })
      .sort((left, right) => right.popularity - left.popularity)
      .slice(0, limit)
      .map((diary) => diary.id);
  }

  getDocumentCount(): number {
    return this.diaryLookup.size;
  }

  private buildDocumentText(diary: Diary): string {
    return [
      diary.title,
      diary.destination,
      diary.content,
      diary.route?.join(' '),
      diary.user?.username,
    ]
      .filter(Boolean)
      .join(' ');
  }

  private normalize(value: string | null | undefined): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/博物馆/g, '博物院')
      .replace(/景点/g, '景区')
      .replace(/\s+/g, '');
  }

  private mergeIds(...groups: string[][]): string[] {
    const ordered = new Set<string>();
    groups.forEach((group) => {
      group.forEach((id) => ordered.add(id));
    });
    return Array.from(ordered);
  }

  private addToMap(target: Map<string, Set<string>>, key: string, diaryId: string): void {
    if (!key) {
      return;
    }

    if (!target.has(key)) {
      target.set(key, new Set());
    }
    target.get(key)!.add(diaryId);
  }

  private removeFromMap(target: Map<string, Set<string>>, key: string, diaryId: string): void {
    if (!key) {
      return;
    }

    const bucket = target.get(key);
    if (!bucket) {
      return;
    }

    bucket.delete(diaryId);
    if (bucket.size === 0) {
      target.delete(key);
    }
  }
}
