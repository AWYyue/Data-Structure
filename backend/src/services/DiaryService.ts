import { AppDataSource } from '../config/database';
import { In } from 'typeorm';
import { HuffmanCompressor } from '../algorithms/HuffmanCompressor';
import { Diary } from '../entities/Diary';
import { DiaryComment } from '../entities/DiaryComment';
import { User } from '../entities/User';
import { normalizeStringArray } from '../utils/stringArrayField';
import { DiarySearchIndex, DiarySearchMode } from './DiarySearchIndex';

// 内存存储作为fallback
let memoryDiaries: Diary[] = [];
let memoryDiaryComments: DiaryComment[] = [];
let memoryNextDiaryId = 1;
let memoryNextCommentId = 1;
const generatedAnimations = new Map<string, { html: string; createdAt: number }>();
const diarySearchIndex = new DiarySearchIndex();
let diarySearchIndexLoaded = false;

// 获取仓库
function getDiaryRepository() {
  if (AppDataSource?.isInitialized) {
    return AppDataSource.getRepository(Diary);
  }
  return null;
}

function getDiaryCommentRepository() {
  if (AppDataSource?.isInitialized) {
    return AppDataSource.getRepository(DiaryComment);
  }
  return null;
}

function getUserRepository() {
  if (AppDataSource?.isInitialized) {
    return AppDataSource.getRepository(User);
  }
  return null;
}

const huffmanCompressor = new HuffmanCompressor();

export class DiaryService {
  getGeneratedAnimation(animationId: string): { html: string; createdAt: number } | null {
    return generatedAnimations.get(animationId) || null;
  }

  private normalizeImageUrls(imageUrls: unknown): string[] {
    return normalizeStringArray(imageUrls).filter((item) => /^data:image\/|^https?:\/\//i.test(item));
  }

  private normalizeVideoUrls(videoUrls: unknown): string[] {
    return normalizeStringArray(videoUrls).filter((item) => /^data:video\/|^https?:\/\//i.test(item));
  }

  private hydrateDiary<T extends Diary | null>(diary: T): T {
    if (!diary) {
      return diary;
    }

    if ((!diary.content || !diary.content.trim()) && diary.compressedContent?.length) {
      diary.content = huffmanCompressor.decompressFromBuffer(diary.compressedContent);
    }

    diary.route = normalizeStringArray(diary.route);
    diary.imageUrls = this.normalizeImageUrls(diary.imageUrls);
    diary.videoUrls = this.normalizeVideoUrls((diary as Diary).videoUrls);
    return diary;
  }

  private hydrateComment<T extends DiaryComment | null>(comment: T): T {
    if (!comment) {
      return comment;
    }

    if (comment.isDeleted) {
      comment.content = '该评论已删除';
      comment.rating = null;
    }

    if (Array.isArray(comment.replies)) {
      comment.replies = comment.replies.map((reply) => this.hydrateComment(reply));
    }

    return comment;
  }

  private collectCommentCascadeIds(
    comments: Array<Pick<DiaryComment, 'id' | 'parentCommentId'>>,
    rootCommentId: string,
  ): string[] {
    const collectedIds = new Set<string>([rootCommentId]);
    let changed = true;

    while (changed) {
      changed = false;
      for (const comment of comments) {
        if (comment.parentCommentId && collectedIds.has(comment.parentCommentId) && !collectedIds.has(comment.id)) {
          collectedIds.add(comment.id);
          changed = true;
        }
      }
    }

    return Array.from(collectedIds);
  }

  private async awardFirstCommentPopularity(diaryId: string, userId: string): Promise<number> {
    const diaryRepository = getDiaryRepository();
    const userRepository = getUserRepository();
    const commentToken = `diary-comment:${diaryId}`;

    if (diaryRepository && userRepository) {
      const [diary, user] = await Promise.all([
        diaryRepository.findOne({ where: { id: diaryId }, relations: ['user'] }),
        userRepository.findOne({ where: { id: userId } }),
      ]);

      if (!diary || !user) {
        return 0;
      }

      if (diary.userId === userId) {
        return 0;
      }

      user.viewedItems = normalizeStringArray(user.viewedItems);
      if (user.viewedItems.includes(commentToken)) {
        return 0;
      }

      user.viewedItems = [...user.viewedItems, commentToken];
      diary.popularity += 300;
      diary.updatedAt = new Date();

      await Promise.all([userRepository.save(user), diaryRepository.save(diary)]);
      if (diary.isShared) {
        this.syncDiarySearchIndex(diary);
      }
      return 300;
    }

    const diary = memoryDiaries.find((item) => item.id === diaryId);
    if (!diary) {
      return 0;
    }

    if (diary.userId === userId) {
      return 0;
    }

    const existingCommentCount = memoryDiaryComments.filter(
      (item) => item.diaryId === diaryId && item.userId === userId,
    ).length;
    if (existingCommentCount > 1) {
      return 0;
    }

    diary.popularity += 300;
    diary.updatedAt = new Date();
    if (diary.isShared) {
      this.syncDiarySearchIndex(diary);
    }
    return 300;
  }

  private buildCommentTree(comments: DiaryComment[]): DiaryComment[] {
    const nodeMap = new Map<string, DiaryComment>();
    const roots: DiaryComment[] = [];

    comments.forEach((comment) => {
      comment.replies = [];
      nodeMap.set(comment.id, this.hydrateComment(comment));
    });

    comments.forEach((comment) => {
      const current = nodeMap.get(comment.id)!;
      if (comment.parentCommentId) {
        const parent = nodeMap.get(comment.parentCommentId);
        if (parent) {
          parent.replies.push(current);
          return;
        }
      }
      roots.push(current);
    });

    const sortTree = (items: DiaryComment[]) => {
      items.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
      items.forEach((item) => sortTree(item.replies || []));
      return items;
    };

    return sortTree(roots);
  }

  private async canManageComment(commentId: string, actorUserId: string): Promise<DiaryComment> {
    const diaryCommentRepository = getDiaryCommentRepository();
    const comment = diaryCommentRepository
      ? await diaryCommentRepository.findOne({ where: { id: commentId } })
      : memoryDiaryComments.find((item) => item.id === commentId) || null;

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.userId === actorUserId) {
      return this.hydrateComment(comment);
    }

    const diary = await this.getDiaryById(comment.diaryId);
    if (!diary || diary.userId !== actorUserId) {
      throw new Error('You do not have permission to manage this comment');
    }

    return comment;
  }

  private async ensureSearchIndexLoaded(): Promise<void> {
    if (diarySearchIndexLoaded) {
      return;
    }

    const diaryRepository = getDiaryRepository();
    if (diaryRepository) {
      const sharedDiaries = await diaryRepository.find({
        where: { isShared: true },
        relations: ['user'],
      });
      diarySearchIndex.rebuild(sharedDiaries.map((item) => this.hydrateDiary(item)));
    } else {
      diarySearchIndex.rebuild(memoryDiaries.filter((item) => item.isShared).map((item) => this.hydrateDiary(item)));
    }

    diarySearchIndexLoaded = true;
  }

  private syncDiarySearchIndex(diary: Diary): void {
    diarySearchIndex.upsert(this.hydrateDiary(diary));
    diarySearchIndexLoaded = true;
  }

  private removeDiaryFromSearchIndex(diaryId: string): void {
    diarySearchIndex.remove(diaryId);
    diarySearchIndexLoaded = true;
  }

  private async assertDiaryOwner(diaryId: string, actorUserId?: string): Promise<Diary> {
    const diaryRepository = getDiaryRepository();
    const diary = diaryRepository
      ? await diaryRepository.findOne({ where: { id: diaryId } })
      : memoryDiaries.find((item) => item.id === diaryId) || null;

    if (!diary) {
      throw new Error('Diary not found');
    }

    if (actorUserId && diary.userId !== actorUserId) {
      throw new Error('You can only modify your own diary');
    }

    return diary;
  }

  private orderDiariesByIds(diaries: Diary[], orderedIds: string[]): Diary[] {
    const scoreMap = new Map(orderedIds.map((id, index) => [id, index]));
    return [...diaries].sort((left, right) => {
      const leftIndex = scoreMap.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = scoreMap.get(right.id) ?? Number.MAX_SAFE_INTEGER;
      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }
      return right.popularity - left.popularity;
    });
  }

  private buildAnimationPreviewHtml(photos: { url: string }[], description: string): string {
    const safeDescription = description
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const slides = photos
      .slice(0, 6)
      .map(
        (photo, index) => `
          <div class="slide" style="animation-delay:${index * 3}s">
            <img src="${photo.url}" alt="旅行画面 ${index + 1}" />
          </div>`,
      )
      .join('\n');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>旅行动画预览</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background:
        radial-gradient(circle at top, rgba(56, 189, 248, 0.22), transparent 38%),
        linear-gradient(160deg, #08111f 0%, #0f172a 55%, #111827 100%);
      color: #f8fafc;
      font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
    }
    .shell {
      width: min(960px, 100%);
      background: rgba(8, 17, 31, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 28px;
      overflow: hidden;
      box-shadow: 0 28px 80px rgba(15, 23, 42, 0.42);
    }
    .hero {
      padding: 28px 28px 18px;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
    }
    .title {
      margin: 0 0 10px;
      font-size: clamp(28px, 4vw, 42px);
      line-height: 1.08;
      font-weight: 700;
    }
    .desc {
      margin: 0;
      color: rgba(226, 232, 240, 0.84);
      font-size: 15px;
      line-height: 1.7;
      max-width: 720px;
      white-space: pre-wrap;
    }
    .badge {
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(56, 189, 248, 0.14);
      color: #7dd3fc;
      font-size: 13px;
      white-space: nowrap;
      border: 1px solid rgba(56, 189, 248, 0.24);
    }
    .stage {
      position: relative;
      aspect-ratio: 16 / 9;
      background: rgba(15, 23, 42, 0.76);
      overflow: hidden;
    }
    .slide {
      position: absolute;
      inset: 0;
      opacity: 0;
      animation: fade 18s infinite;
    }
    .slide img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scale(1.05);
      animation: kenburns 18s infinite;
    }
    .overlay {
      position: absolute;
      inset: auto 0 0 0;
      padding: 20px 24px;
      background: linear-gradient(to top, rgba(2, 6, 23, 0.82), transparent);
      color: rgba(255,255,255,0.92);
      font-size: 14px;
      letter-spacing: 0.03em;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 24px 24px;
      color: rgba(226, 232, 240, 0.84);
      font-size: 13px;
      flex-wrap: wrap;
    }
    @keyframes fade {
      0% { opacity: 0; }
      6% { opacity: 1; }
      28% { opacity: 1; }
      34% { opacity: 0; }
      100% { opacity: 0; }
    }
    @keyframes kenburns {
      0% { transform: scale(1.03); }
      50% { transform: scale(1.08); }
      100% { transform: scale(1.12); }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div>
        <h1 class="title">旅行动画预览</h1>
        <p class="desc">${safeDescription}</p>
      </div>
      <div class="badge">共 ${photos.length} 张照片</div>
    </section>
    <section class="stage">
      ${slides}
      <div class="overlay">系统已根据你上传的照片生成可预览的动态故事板效果</div>
    </section>
    <section class="footer">
      <span>当前版本为站内预览动画，适合展示旅行回忆与故事节奏。</span>
      <span>生成时间：${new Date().toLocaleString('zh-CN')}</span>
    </section>
  </main>
</body>
</html>`;
  }
  // 创建日记
  async createDiary(diaryData: {
    userId: string;
    title: string;
    content: string;
    destination?: string;
    visitDate?: Date;
    route?: string[];
    imageUrls?: string[];
    videoUrls?: string[];
    isShared?: boolean;
  }): Promise<Diary> {
    const diaryRepository = getDiaryRepository();
    // 压缩内容
    const compressedContent = huffmanCompressor.compressToBuffer(diaryData.content);
    
    if (diaryRepository) {
      // 创建日记
      const diary = diaryRepository.create({
        userId: diaryData.userId,
        title: diaryData.title,
        content: diaryData.content,
        compressedContent,
        destination: diaryData.destination,
        visitDate: diaryData.visitDate,
        route: normalizeStringArray(diaryData.route),
        imageUrls: this.normalizeImageUrls(diaryData.imageUrls),
        videoUrls: this.normalizeVideoUrls(diaryData.videoUrls),
        isShared: diaryData.isShared || false
      });

      const savedDiary = await diaryRepository.save(diary);
      if (savedDiary.isShared) {
        this.syncDiarySearchIndex(savedDiary);
      }
      return this.hydrateDiary(savedDiary);
    } else {
      // 使用内存存储
      const diary = {
        id: `memory-diary-${memoryNextDiaryId++}`,
        userId: diaryData.userId,
        title: diaryData.title,
        content: diaryData.content,
        compressedContent,
        destination: diaryData.destination,
        visitDate: diaryData.visitDate,
        route: normalizeStringArray(diaryData.route),
        imageUrls: this.normalizeImageUrls(diaryData.imageUrls),
        videoUrls: this.normalizeVideoUrls(diaryData.videoUrls),
        isShared: diaryData.isShared || false,
        reviewCount: 0,
        averageRating: 0,
        popularity: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: null as any,
        comments: []
      } as Diary;
      memoryDiaries.push(diary);
      if (diary.isShared) {
        this.syncDiarySearchIndex(diary);
      }
      return this.hydrateDiary(diary);
    }
  }

  // 获取日记详情
  async getDiaryById(diaryId: string): Promise<Diary | null> {
    const diaryRepository = getDiaryRepository();
    
    if (diaryRepository) {
      const diary = await diaryRepository.findOne({
        where: { id: diaryId },
        relations: ['user', 'comments', 'comments.user']
      });
      return this.hydrateDiary(diary);
    } else {
      // 使用内存存储
      const diary = memoryDiaries.find(d => d.id === diaryId);
      if (diary) {
        // 添加评论
        diary.comments = memoryDiaryComments.filter(c => c.diaryId === diaryId);
      }
      return this.hydrateDiary(diary || null);
    }
  }

  // 获取用户的日记列表
  async getUserDiaries(userId: string, limit: number = 10, offset: number = 0): Promise<Diary[]> {
    const diaryRepository = getDiaryRepository();
    
    if (diaryRepository) {
      const diaries = await diaryRepository.find({
        where: { userId },
        order: { createdAt: 'ASC' },
        relations: ['user']
      });
      return diaries.map((item) => this.hydrateDiary(item));
    } else {
      // 使用内存存储
      return memoryDiaries
        .filter(d => d.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(offset, offset + limit)
        .map((item) => this.hydrateDiary(item));
    }
  }

  // 获取分享的日记列表
  async getSharedDiaries(limit: number = 10, offset: number = 0): Promise<Diary[]> {
    const diaryRepository = getDiaryRepository();
    
    if (diaryRepository) {
      const diaries = await diaryRepository.find({
        where: { isShared: true },
        order: { popularity: 'DESC' },
        take: limit,
        skip: offset,
        relations: ['user']
      });
      return diaries.map((item) => this.hydrateDiary(item));
    } else {
      // 使用内存存储
      return memoryDiaries
        .filter(d => d.isShared)
        .sort((a, b) => b.popularity - a.popularity)
        .slice(offset, offset + limit)
        .map((item) => this.hydrateDiary(item));
    }
  }

  // 更新日记
  async updateDiary(diaryId: string, updateData: {
    title?: string;
    content?: string;
    destination?: string;
    visitDate?: Date;
    route?: string[];
    imageUrls?: string[];
    videoUrls?: string[];
    isShared?: boolean;
  }, actorUserId?: string): Promise<Diary> {
    const diaryRepository = getDiaryRepository();
    let diary = await this.assertDiaryOwner(diaryId, actorUserId);
    
    if (diaryRepository) {
      // 如果更新内容，重新压缩
      if (updateData.content) {
        diary.compressedContent = huffmanCompressor.compressToBuffer(updateData.content);
      }

      // 更新其他字段
      Object.assign(diary, updateData);
      if (updateData.route !== undefined) {
        diary.route = normalizeStringArray(updateData.route);
      }
      if (updateData.imageUrls !== undefined) {
        diary.imageUrls = this.normalizeImageUrls(updateData.imageUrls);
      }
      if (updateData.videoUrls !== undefined) {
        diary.videoUrls = this.normalizeVideoUrls(updateData.videoUrls);
      }

      const savedDiary = await diaryRepository.save(diary);
      if (savedDiary.isShared) {
        this.syncDiarySearchIndex(savedDiary);
      } else {
        this.removeDiaryFromSearchIndex(savedDiary.id);
      }

      return this.hydrateDiary(savedDiary);
    } else {
      // 使用内存存储
      // 如果更新内容，重新压缩
      if (updateData.content) {
        diary.compressedContent = huffmanCompressor.compressToBuffer(updateData.content);
      }

      // 更新其他字段
      Object.assign(diary, updateData);
      if (updateData.route !== undefined) {
        diary.route = normalizeStringArray(updateData.route);
      }
      if (updateData.imageUrls !== undefined) {
        diary.imageUrls = this.normalizeImageUrls(updateData.imageUrls);
      }
      if (updateData.videoUrls !== undefined) {
        diary.videoUrls = this.normalizeVideoUrls(updateData.videoUrls);
      }
      diary.updatedAt = new Date();

      // 更新内存存储
      const index = memoryDiaries.findIndex(d => d.id === diaryId);
      if (index !== -1) {
        memoryDiaries[index] = diary;
      }

      if (diary.isShared) {
        this.syncDiarySearchIndex(diary);
      } else {
        this.removeDiaryFromSearchIndex(diary.id);
      }

      return this.hydrateDiary(diary);
    }
  }

  // 删除日记
  async deleteDiary(diaryId: string, actorUserId?: string): Promise<void> {
    const diaryRepository = getDiaryRepository();
    await this.assertDiaryOwner(diaryId, actorUserId);
    
    if (diaryRepository) {
      const result = await diaryRepository.delete(diaryId);
      if (result.affected === 0) {
        throw new Error('Diary not found');
      }
      this.removeDiaryFromSearchIndex(diaryId);
    } else {
      // 使用内存存储
      const index = memoryDiaries.findIndex(d => d.id === diaryId);
      if (index === -1) {
        throw new Error('Diary not found');
      }
      // 删除日记
      memoryDiaries.splice(index, 1);
      // 删除相关评论
      memoryDiaryComments = memoryDiaryComments.filter(c => c.diaryId !== diaryId);
      this.removeDiaryFromSearchIndex(diaryId);
    }
  }

  // 分享日记
  async shareDiary(diaryId: string, actorUserId?: string): Promise<Diary> {
    const diaryRepository = getDiaryRepository();
    let diary = await this.assertDiaryOwner(diaryId, actorUserId);
    
    if (diaryRepository) {
      diary.isShared = true;
      const savedDiary = await diaryRepository.save(diary);
      this.syncDiarySearchIndex(savedDiary);
      return this.hydrateDiary(savedDiary);
    } else {
      // 使用内存存储
      diary.isShared = true;
      diary.updatedAt = new Date();

      // 更新内存存储
      const index = memoryDiaries.findIndex(d => d.id === diaryId);
      if (index !== -1) {
        memoryDiaries[index] = diary;
      }

      this.syncDiarySearchIndex(diary);
      return this.hydrateDiary(diary);
    }
  }

  // 添加评论
  async addComment(commentData: {
    diaryId: string;
    userId: string;
    content: string;
    rating?: number;
    parentCommentId?: string;
  }): Promise<DiaryComment> {
    const diaryRepository = getDiaryRepository();
    const diaryCommentRepository = getDiaryCommentRepository();
    const normalizedContent = String(commentData.content || '').trim();

    if (!normalizedContent) {
      throw new Error('Comment content is required');
    }
    
    if (diaryRepository && diaryCommentRepository) {
      // 检查日记是否存在
      const diary = await diaryRepository.findOne({ where: { id: commentData.diaryId } });
      if (!diary) {
        throw new Error('Diary not found');
      }

      // 创建评论
      if (commentData.parentCommentId) {
        const parentComment = await diaryCommentRepository.findOne({
          where: { id: commentData.parentCommentId, diaryId: commentData.diaryId },
        });
        if (!parentComment) {
          throw new Error('Parent comment not found');
        }
      }

      const comment = diaryCommentRepository.create({
        diaryId: commentData.diaryId,
        userId: commentData.userId,
        parentCommentId: commentData.parentCommentId || null,
        content: normalizedContent,
        rating: commentData.parentCommentId ? null : commentData.rating,
        isDeleted: false
      });

      const savedComment = await diaryCommentRepository.save(comment);
      await this.awardFirstCommentPopularity(commentData.diaryId, commentData.userId);

      // 更新日记的评论数和平均评分
      await this.updateDiaryStats(commentData.diaryId);

      const hydrated = await diaryCommentRepository.findOne({
        where: { id: savedComment.id },
        relations: ['user']
      });
      return this.hydrateComment(hydrated || savedComment);
    } else {
      // 使用内存存储
      // 检查日记是否存在
      const diary = memoryDiaries.find(d => d.id === commentData.diaryId);
      if (!diary) {
        throw new Error('Diary not found');
      }

      // 创建评论
      if (commentData.parentCommentId) {
        const parentComment = memoryDiaryComments.find(
          (item) => item.id === commentData.parentCommentId && item.diaryId === commentData.diaryId,
        );
        if (!parentComment) {
          throw new Error('Parent comment not found');
        }
      }

      const comment = {
        id: `memory-comment-${memoryNextCommentId++}`,
        diaryId: commentData.diaryId,
        userId: commentData.userId,
        parentCommentId: commentData.parentCommentId || null,
        content: normalizedContent,
        rating: commentData.parentCommentId ? null : commentData.rating ?? null,
        isDeleted: false,
        diary: null as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: null as any,
        parentComment: null as any,
        replies: [],
      } as DiaryComment;

      memoryDiaryComments.push(comment);
      await this.awardFirstCommentPopularity(commentData.diaryId, commentData.userId);

      // 更新日记的评论数和平均评分
      await this.updateDiaryStats(commentData.diaryId);

      return this.hydrateComment(comment);
    }
  }

  // 获取日记评论
  async getDiaryComments(diaryId: string, limit: number = 20, offset: number = 0): Promise<DiaryComment[]> {
    const diaryCommentRepository = getDiaryCommentRepository();
    
    if (diaryCommentRepository) {
      const comments = await diaryCommentRepository.find({
        where: { diaryId },
        order: { createdAt: 'ASC' },
        relations: ['user']
      });
      return this.buildCommentTree(comments.filter((comment) => !comment.isDeleted)).slice(offset, offset + limit);
    } else {
      // 使用内存存储
      const comments = memoryDiaryComments
        .filter(c => c.diaryId === diaryId && !c.isDeleted)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      return this.buildCommentTree(comments).slice(offset, offset + limit);
    }
  }

  async deleteComment(commentId: string, actorUserId: string): Promise<DiaryComment> {
    const diaryCommentRepository = getDiaryCommentRepository();
    const comment = await this.canManageComment(commentId, actorUserId);

    if (diaryCommentRepository) {
      const diaryComments = await diaryCommentRepository.find({
        where: { diaryId: comment.diaryId },
      });
      const deleteIds = this.collectCommentCascadeIds(diaryComments, commentId);
      if (deleteIds.length > 0) {
        await diaryCommentRepository.delete(deleteIds);
        await this.updateDiaryStats(comment.diaryId);
      }
      return this.hydrateComment(comment);
    }

    const deleteIds = this.collectCommentCascadeIds(
      memoryDiaryComments.filter((item) => item.diaryId === comment.diaryId),
      commentId,
    );
    memoryDiaryComments = memoryDiaryComments.filter((item) => !deleteIds.includes(item.id));
    await this.updateDiaryStats(comment.diaryId);
    return this.hydrateComment(comment);
  }

  // 更新日记统计信息
  private async updateDiaryStats(diaryId: string): Promise<void> {
    const diaryCommentRepository = getDiaryCommentRepository();
    const diaryRepository = getDiaryRepository();
    
    if (diaryCommentRepository && diaryRepository) {
      // 获取所有评论
      const comments = await diaryCommentRepository.find({ where: { diaryId } });
      const activeComments = comments.filter(c => !c.isDeleted);
      
      // 计算平均评分
      const ratings = activeComments
        .filter(c => c.rating !== null && c.rating !== undefined)
        .map(c => Number(c.rating));
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : 0;

      // 更新日记
      await diaryRepository.update(diaryId, {
        reviewCount: activeComments.length,
        averageRating: averageRating
      });
      const diary = await diaryRepository.findOne({ where: { id: diaryId }, relations: ['user'] });
      if (diary?.isShared) {
        this.syncDiarySearchIndex(diary);
      }
    } else {
      // 使用内存存储
      // 获取所有评论
      const comments = memoryDiaryComments.filter(c => c.diaryId === diaryId);
      const activeComments = comments.filter(c => !c.isDeleted);
      
      // 计算平均评分
      const ratings = activeComments
        .filter(c => c.rating !== null && c.rating !== undefined)
        .map(c => Number(c.rating));
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : 0;

      // 更新日记
      const diary = memoryDiaries.find(d => d.id === diaryId);
      if (diary) {
        diary.reviewCount = activeComments.length;
        diary.averageRating = averageRating;
        diary.updatedAt = new Date();
        if (diary.isShared) {
          this.syncDiarySearchIndex(diary);
        }
      }
    }
  }

  // 增加日记热度
  async incrementDiaryPopularity(diaryId: string, viewerUserId?: string): Promise<number> {
    if (!viewerUserId) {
      return 0;
    }

    const diaryRepository = getDiaryRepository();
    const userRepository = getUserRepository();
    const viewToken = `diary:${diaryId}`;
    
    if (diaryRepository && userRepository) {
      const [diary, viewer] = await Promise.all([
        diaryRepository.findOne({ where: { id: diaryId }, relations: ['user'] }),
        userRepository.findOne({ where: { id: viewerUserId } }),
      ]);
      if (!diary) {
        return 0;
      }
      if (!viewer || diary.userId === viewerUserId) {
        return 0;
      }
      viewer.viewedItems = normalizeStringArray(viewer.viewedItems);
      if (viewer.viewedItems.includes(viewToken)) {
        return 0;
      }
      viewer.viewedItems = [...viewer.viewedItems, viewToken];
      diary.popularity += 500;
      diary.updatedAt = new Date();
      await Promise.all([userRepository.save(viewer), diaryRepository.save(diary)]);
      if (diary.isShared) {
        this.syncDiarySearchIndex(diary);
      }
      return 500;
    } else {
      // 使用内存存储
      const diary = memoryDiaries.find(d => d.id === diaryId);
      if (!diary || diary.userId === viewerUserId) {
        return 0;
      }
      diary.popularity += 500;
      diary.updatedAt = new Date();
      if (diary.isShared) {
        this.syncDiarySearchIndex(diary);
      }
      return 500;
    }
  }

  // 搜索日记
  async searchDiaries(query: string, limit: number = 10, mode: DiarySearchMode = 'any'): Promise<Diary[]> {
    const diaryRepository = getDiaryRepository();
    await this.ensureSearchIndexLoaded();
    const orderedIds = diarySearchIndex.searchFulltext(query, mode, limit);

    if (!orderedIds.length) {
      return [];
    }
    
    if (diaryRepository) {
      const diaries = await diaryRepository.find({
        where: { id: In(orderedIds), isShared: true },
        relations: ['user']
      });
      return this.orderDiariesByIds(diaries.map((item) => this.hydrateDiary(item)), orderedIds).slice(0, limit);
    } else {
      // 使用内存存储
      const diaries = memoryDiaries.filter((item) => orderedIds.includes(item.id));
      return this.orderDiariesByIds(diaries.map((item) => this.hydrateDiary(item)), orderedIds).slice(0, limit);
    }
  }

  // 根据目的地搜索日记
  async searchDiariesByDestination(destination: string, limit: number = 10): Promise<Diary[]> {
    const diaryRepository = getDiaryRepository();
    await this.ensureSearchIndexLoaded();
    const orderedIds = diarySearchIndex.searchByDestination(destination, limit);

    if (!orderedIds.length) {
      return [];
    }
    
    if (diaryRepository) {
      const diaries = await diaryRepository.find({
        where: { id: In(orderedIds), isShared: true },
        relations: ['user']
      });
      return this.orderDiariesByIds(diaries.map((item) => this.hydrateDiary(item)), orderedIds).slice(0, limit);
    } else {
      // 使用内存存储
      const diaries = memoryDiaries.filter((item) => orderedIds.includes(item.id));
      return this.orderDiariesByIds(diaries.map((item) => this.hydrateDiary(item)), orderedIds).slice(0, limit);
    }
  }

  // 生成AIGC动画
  async searchDiariesByExactTitle(title: string, limit: number = 10): Promise<Diary[]> {
    const diaryRepository = getDiaryRepository();
    await this.ensureSearchIndexLoaded();
    const orderedIds = diarySearchIndex.searchByExactTitle(title, limit);

    if (!orderedIds.length) {
      return [];
    }

    if (diaryRepository) {
      const diaries = await diaryRepository.find({
        where: { id: In(orderedIds), isShared: true },
        relations: ['user']
      });
      return this.orderDiariesByIds(diaries.map((item) => this.hydrateDiary(item)), orderedIds).slice(0, limit);
    }

    const diaries = memoryDiaries.filter((item) => orderedIds.includes(item.id));
    return this.orderDiariesByIds(diaries.map((item) => this.hydrateDiary(item)), orderedIds).slice(0, limit);
  }

  private buildPremiumAnimationPreviewHtml(photos: { url: string }[], description: string): string {
    const safeDescription = description
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const stagePhotos = photos.slice(0, 6);
    const slides = stagePhotos
      .map(
        (photo, index) => `
          <article class="slide" data-index="${index}">
            <img src="${photo.url}" alt="旅行画面 ${index + 1}" />
            <div class="shade"></div>
            <div class="caption">
              <span class="caption-kicker">旅行片段 ${index + 1}</span>
              <h2>把旅途中值得回看的瞬间，做成一段连贯的故事</h2>
            </div>
          </article>`,
      )
      .join('\n');

    const indicators = stagePhotos
      .map(
        (_, index) => `
          <button class="indicator" type="button" data-target="${index}" aria-label="切换到第 ${index + 1} 段">
            <span></span>
          </button>`,
      )
      .join('\n');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>旅行动画预览</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background:
        radial-gradient(circle at top, rgba(56, 189, 248, 0.22), transparent 36%),
        radial-gradient(circle at bottom right, rgba(245, 158, 11, 0.16), transparent 24%),
        linear-gradient(160deg, #08111f 0%, #0f172a 55%, #111827 100%);
      color: #f8fafc;
      font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
    }
    .shell {
      width: min(1040px, 100%);
      background: rgba(8, 17, 31, 0.74);
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 30px;
      overflow: hidden;
      box-shadow: 0 30px 80px rgba(15, 23, 42, 0.46);
      backdrop-filter: blur(18px);
    }
    .hero {
      padding: 28px 28px 16px;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .title {
      margin: 0 0 10px;
      font-size: clamp(30px, 4vw, 44px);
      line-height: 1.05;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .desc {
      margin: 0;
      color: rgba(226, 232, 240, 0.84);
      font-size: 15px;
      line-height: 1.8;
      max-width: 700px;
      white-space: pre-wrap;
    }
    .badge {
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(56, 189, 248, 0.14);
      color: #7dd3fc;
      font-size: 13px;
      border: 1px solid rgba(56, 189, 248, 0.24);
      white-space: nowrap;
    }
    .meta {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      padding: 0 28px 20px;
      color: rgba(226, 232, 240, 0.8);
      font-size: 13px;
    }
    .chip {
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.56);
      border: 1px solid rgba(148, 163, 184, 0.18);
    }
    .stage {
      position: relative;
      aspect-ratio: 16 / 9;
      background: rgba(15, 23, 42, 0.76);
      overflow: hidden;
    }
    .slide {
      position: absolute;
      inset: 0;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.9s ease;
    }
    .slide.active {
      opacity: 1;
    }
    .slide img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scale(1.02);
      transition: transform 4.2s ease;
      filter: saturate(1.04) contrast(1.02);
    }
    .slide.active img {
      transform: scale(1.1);
    }
    .shade {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(to top, rgba(2, 6, 23, 0.84), rgba(2, 6, 23, 0.14) 46%, rgba(2, 6, 23, 0.32)),
        linear-gradient(to right, rgba(2, 6, 23, 0.28), transparent 36%, transparent 64%, rgba(2, 6, 23, 0.22));
    }
    .stage-top {
      position: absolute;
      inset: 16px 16px auto 16px;
      z-index: 4;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }
    .stage-title {
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(8, 15, 28, 0.58);
      border: 1px solid rgba(255, 255, 255, 0.14);
      font-size: 13px;
      color: rgba(255,255,255,0.92);
    }
    .control-btn {
      border: 0;
      border-radius: 999px;
      padding: 10px 16px;
      background: rgba(8, 15, 28, 0.64);
      color: #f8fafc;
      font-size: 13px;
      cursor: pointer;
      border: 1px solid rgba(255,255,255,0.14);
    }
    .caption {
      position: absolute;
      left: 24px;
      right: 24px;
      bottom: 30px;
      z-index: 3;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .caption-kicker {
      width: fit-content;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(56, 189, 248, 0.16);
      border: 1px solid rgba(125, 211, 252, 0.28);
      color: #bae6fd;
      font-size: 12px;
      letter-spacing: 0.04em;
    }
    .caption h2 {
      margin: 0;
      font-size: clamp(22px, 2.8vw, 38px);
      line-height: 1.2;
      max-width: 760px;
      text-shadow: 0 12px 28px rgba(15, 23, 42, 0.5);
    }
    .timeline {
      display: flex;
      gap: 8px;
      padding: 16px 24px 8px;
    }
    .indicator {
      flex: 1;
      padding: 0;
      background: transparent;
      border: 0;
      cursor: pointer;
    }
    .indicator span {
      display: block;
      width: 100%;
      height: 4px;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.2);
      overflow: hidden;
      position: relative;
    }
    .indicator span::after {
      content: "";
      position: absolute;
      inset: 0;
      transform: scaleX(0);
      transform-origin: left center;
      background: linear-gradient(90deg, #38bdf8, #f59e0b);
    }
    .indicator.active span::after {
      animation: progress 3.6s linear forwards;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 24px 26px;
      color: rgba(226, 232, 240, 0.82);
      font-size: 13px;
      flex-wrap: wrap;
    }
    @keyframes progress {
      from { transform: scaleX(0); }
      to { transform: scaleX(1); }
    }
    @media (max-width: 720px) {
      .hero, .meta, .footer {
        padding-left: 18px;
        padding-right: 18px;
      }
      .caption {
        left: 18px;
        right: 18px;
        bottom: 22px;
      }
      .stage-top {
        inset: 12px 12px auto 12px;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div>
        <h1 class="title">旅行动画预览</h1>
        <p class="desc">${safeDescription}</p>
      </div>
      <div class="badge">共 ${photos.length} 张照片</div>
    </section>
    <section class="meta">
      <span class="chip">旅行叙事模式</span>
      <span class="chip">镜头数量 ${stagePhotos.length}</span>
      <span class="chip">自动转场节奏 3.6 秒</span>
    </section>
    <section class="stage">
      <div class="stage-top">
        <div class="stage-title">沉浸式故事板</div>
        <button class="control-btn" type="button" id="togglePlay">暂停播放</button>
      </div>
      ${slides}
    </section>
    <section class="timeline">
      ${indicators}
    </section>
    <section class="footer">
      <span>当前为站内动态预览版，适合快速回看旅行片段与节奏。</span>
      <span>生成时间：${new Date().toLocaleString('zh-CN')}</span>
    </section>
  </main>
  <script>
    const slides = Array.from(document.querySelectorAll('.slide'));
    const indicators = Array.from(document.querySelectorAll('.indicator'));
    const togglePlayButton = document.getElementById('togglePlay');
    let currentIndex = 0;
    let paused = false;
    let timer = null;
    const duration = 3600;
    const renderState = () => {
      slides.forEach((slide, index) => slide.classList.toggle('active', index === currentIndex));
      indicators.forEach((indicator, index) => indicator.classList.toggle('active', index === currentIndex));
    };
    const schedule = () => {
      window.clearTimeout(timer);
      if (paused || slides.length <= 1) return;
      timer = window.setTimeout(() => {
        currentIndex = (currentIndex + 1) % slides.length;
        renderState();
        schedule();
      }, duration);
    };
    togglePlayButton?.addEventListener('click', () => {
      paused = !paused;
      togglePlayButton.textContent = paused ? '继续播放' : '暂停播放';
      if (paused) {
        window.clearTimeout(timer);
      } else {
        schedule();
      }
    });
    indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => {
        currentIndex = index;
        renderState();
        schedule();
      });
    });
    renderState();
    schedule();
  </script>
</body>
</html>`;
  }

  async generateAnimation(photos: { url: string }[], description: string): Promise<string> {
    // 模拟AIGC服务调用
    console.log('生成动画中...');
    console.log(`使用${photos.length}张照片和描述: ${description}`);
    
    // 模拟生成过程（30秒内完成）
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 模拟返回动画URL
    const animationId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    generatedAnimations.set(animationId, {
      html: this.buildPremiumAnimationPreviewHtml(photos, description),
      createdAt: Date.now()
    });
    return animationId;
  }
}
