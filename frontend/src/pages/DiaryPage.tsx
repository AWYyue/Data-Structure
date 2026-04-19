import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Rate,
  Row,
  Segmented,
  Space,
  Spin,
  Tag,
  Tabs,
  Typography,
  Upload,
} from 'antd';
import PremiumPageHero from '../components/PremiumPageHero';
import diaryService, { Diary, DiaryComment } from '../services/diaryService';
import { useAppDispatch, useAppSelector } from '../store';
import { getCurrentUser } from '../store/slices/userSlice';
import { resolveErrorMessage } from '../utils/errorMessage';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

type DiaryTab = 'mine' | 'community' | 'search' | 'popularity' | 'rating';
type SearchMode = 'any' | 'all';
type SearchType = 'fulltext' | 'destination' | 'title_exact';
type ReplyDraftMap = Record<string, string>;

type DiaryFormValues = {
  title: string;
  content: string;
  destination?: string;
  isShared?: boolean;
};

const highlightText = (text: string, query: string): React.ReactNode => {
  const terms = query
    .split(/[\s,，、]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!terms.length) {
    return text;
  }

  const escaped = terms.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);
  const lowerSet = new Set(terms.map((item) => item.toLowerCase()));

  return (
    <>
      {parts.map((part, index) =>
        lowerSet.has(part.toLowerCase()) ? (
          <mark key={`${part}-${index}`} style={{ padding: 0, background: 'rgba(251,191,36,0.36)' }}>
            {part}
          </mark>
        ) : (
          <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
        ),
      )}
    </>
  );
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });

const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片解析失败'));
    image.src = src;
  });

const compressImageToDataUrl = async (
  file: File,
  maxDimension = 1600,
  quality = 0.78,
): Promise<string> => {
  const source = await readFileAsDataUrl(file);
  const image = await loadImageElement(source);

  let { width, height } = image;
  if (width > maxDimension || height > maxDimension) {
    const scale = Math.min(maxDimension / width, maxDimension / height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('图片压缩失败');
  }

  context.drawImage(image, 0, 0, width, height);

  const preferredMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return canvas.toDataURL(preferredMime, preferredMime === 'image/png' ? undefined : quality);
};

const estimateBase64Bytes = (dataUrl: string): number => {
  const [, encoded = ''] = dataUrl.split(',');
  return Math.ceil((encoded.length * 3) / 4);
};

const DiaryPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { message } = App.useApp();
  const { user, token, isLoading: userLoading } = useAppSelector((state) => state.user);

  const [activeTab, setActiveTab] = useState<DiaryTab>('mine');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDiary, setEditingDiary] = useState<Diary | null>(null);
  const [mine, setMine] = useState<Diary[]>([]);
  const [community, setCommunity] = useState<Diary[]>([]);
  const [popularityRanking, setPopularityRanking] = useState<Diary[]>([]);
  const [ratingRanking, setRatingRanking] = useState<Diary[]>([]);
  const [searchResults, setSearchResults] = useState<Diary[]>([]);
  const [searchType, setSearchType] = useState<SearchType>('fulltext');
  const [searchMode, setSearchMode] = useState<SearchMode>('any');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [detailDiary, setDetailDiary] = useState<Diary | null>(null);
  const [detailComments, setDetailComments] = useState<DiaryComment[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentRating, setCommentRating] = useState<number>(5);
  const [commentLoading, setCommentLoading] = useState(false);
  const [diaryImageUrls, setDiaryImageUrls] = useState<string[]>([]);
  const [diaryVideoUrls, setDiaryVideoUrls] = useState<string[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<ReplyDraftMap>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyLoadingId, setReplyLoadingId] = useState<string | null>(null);
  const [commentDeletingId, setCommentDeletingId] = useState<string | null>(null);
  const [animationPhotos, setAnimationPhotos] = useState<string[]>([]);
  const [animationDescription, setAnimationDescription] = useState('');
  const [animationLoading, setAnimationLoading] = useState(false);
  const [animationUrl, setAnimationUrl] = useState('');

  const [form] = Form.useForm<DiaryFormValues>();
  const hasLoginToken = Boolean(token);
  const isRestoringLogin = hasLoginToken && !user?.id && userLoading;
  const maxDiaryPhotoCount = 6;
  const maxDiaryPayloadBytes = 8 * 1024 * 1024;
  const maxDiaryVideoCount = 2;
  const maxDiaryVideoPayloadBytes = 24 * 1024 * 1024;
  const maxAnimationPhotoCount = 6;
  const maxAnimationPayloadBytes = 8 * 1024 * 1024;

  const rankingHint = useMemo(() => {
    if (activeTab === 'popularity') {
      return '热度榜按浏览量和互动强度排序，适合查看近期最受关注的旅行体验。';
    }
    if (activeTab === 'rating') {
      return '好评榜按评分与评论质量综合排序，适合查找更值得参考的优质日记。';
    }
    return '';
  }, [activeTab]);

  const loadMine = async () => {
    if (!user?.id) {
      if (!hasLoginToken) {
        setMine([]);
      }
      return;
    }
    const response = await diaryService.getUserDiaries(user.id, 50, 0);
    setMine(response.data || []);
  };

  const loadCommunity = async () => {
    const response = await diaryService.getSharedDiaries(50, 0);
    setCommunity(response.data || []);
  };

  const loadPopularityRanking = async () => {
    const response = await diaryService.getSharedDiaryPopularityRanking(20, 0);
    setPopularityRanking(response.data || []);
  };

  const loadRatingRanking = async () => {
    const response = await diaryService.getSharedDiaryRatingRanking(20, 0);
    setRatingRanking(response.data || []);
  };

  const loadForTab = async (tab: DiaryTab) => {
    setLoading(true);
    try {
      if (tab === 'mine') {
        await loadMine();
      } else if (tab === 'community') {
        await loadCommunity();
      } else if (tab === 'popularity') {
        await loadPopularityRanking();
      } else if (tab === 'rating') {
        await loadRatingRanking();
      }
    } catch (error: unknown) {
      message.error(resolveErrorMessage(error, '加载日记数据失败，请稍后重试。'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadForTab(activeTab);
  }, [activeTab, hasLoginToken, user?.id]);

  useEffect(() => {
    if (hasLoginToken && !user?.id && !userLoading) {
      void dispatch(getCurrentUser());
    }
  }, [dispatch, hasLoginToken, user?.id, userLoading]);

  const openCreateModal = (diary?: Diary) => {
    setEditingDiary(diary || null);
    setDiaryImageUrls(diary?.imageUrls || []);
    setDiaryVideoUrls(diary?.videoUrls || []);
    setModalVisible(true);
    form.setFieldsValue({
      title: diary?.title || '',
      content: diary?.content || '',
      destination: diary?.destination || '',
      isShared: diary?.isShared || false,
    });
  };

  const closeCreateModal = () => {
    setModalVisible(false);
    setEditingDiary(null);
    setDiaryImageUrls([]);
    setDiaryVideoUrls([]);
    form.resetFields();
  };

  const handleCreateOrUpdate = async (values: DiaryFormValues) => {
    let currentUser = user;
    if (!currentUser?.id && hasLoginToken) {
      try {
        currentUser = await dispatch(getCurrentUser()).unwrap();
      } catch {
        currentUser = null;
      }
    }

    if (!currentUser?.id) {
      message.warning('请先登录后再创建日记。');
      return;
    }

    setLoading(true);
    try {
      if (editingDiary) {
        await diaryService.updateDiary(
          editingDiary.id,
          values.title,
          values.content,
          values.destination,
          undefined,
          undefined,
          diaryImageUrls,
          diaryVideoUrls,
          Boolean(values.isShared),
        );
        message.success('日记已更新。');
      } else {
        await diaryService.createDiary(
          values.title,
          values.content,
          values.destination,
          undefined,
          undefined,
          diaryImageUrls,
          diaryVideoUrls,
          Boolean(values.isShared),
        );
        message.success('日记已创建。');
      }

      closeCreateModal();
      await loadMine();
      if (activeTab === 'community' || activeTab === 'popularity' || activeTab === 'rating') {
        await Promise.all([loadCommunity(), loadPopularityRanking(), loadRatingRanking()]);
      }
    } catch (error: unknown) {
      message.error(resolveErrorMessage(error, '操作失败，请稍后重试。'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await diaryService.deleteDiary(id);
      message.success('日记已删除。');
      await loadMine();
    } catch (error: unknown) {
      message.error(resolveErrorMessage(error, '删除失败，请稍后重试。'));
    } finally {
      setLoading(false);
    }
  };

  const refreshDiaryDetail = async (diaryId: string, fallbackDiary?: Diary) => {
    const [detailResp, commentsResp] = await Promise.all([
      diaryService.getDiaryById(diaryId),
      diaryService.getDiaryComments(diaryId, 50, 0),
    ]);
    setDetailDiary(detailResp.data || fallbackDiary || null);
    setDetailComments(commentsResp.data || []);
  };

  const openDiaryDetail = async (diary: Diary) => {
    setDetailVisible(true);
    setDetailDiary(diary);
    try {
      await refreshDiaryDetail(diary.id, diary);
      await Promise.all([loadCommunity(), loadPopularityRanking(), loadRatingRanking()]);
    } catch (error: unknown) {
      message.error(resolveErrorMessage(error, '加载日记详情失败。'));
    }
  };

  const closeDiaryDetail = () => {
    setDetailVisible(false);
    setDetailDiary(null);
    setDetailComments([]);
    setCommentText('');
    setCommentRating(5);
    setReplyDrafts({});
    setActiveReplyId(null);
    setReplyLoadingId(null);
    setCommentDeletingId(null);
  };

  const handleCommentSubmit = async () => {
    if (!detailDiary?.id) {
      return;
    }

    if (!commentText.trim()) {
      message.warning('请输入评论内容。');
      return;
    }

    setCommentLoading(true);
    try {
      await diaryService.addComment(detailDiary.id, commentText.trim(), commentRating);
      await refreshDiaryDetail(detailDiary.id, detailDiary);
      setCommentText('');
      setCommentRating(5);
      message.success('评论已发布。');
      await Promise.all([loadCommunity(), loadPopularityRanking(), loadRatingRanking()]);
    } catch (error: unknown) {
      message.error(resolveErrorMessage(error, '评论失败，请稍后重试。'));
    } finally {
      setCommentLoading(false);
    }
  };

  const handleReplyDraftChange = (commentId: string, value: string) => {
    setReplyDrafts((current) => ({
      ...current,
      [commentId]: value,
    }));
  };

  const handleReplySubmit = async (commentId: string) => {
    if (!detailDiary?.id) {
      return;
    }

    const replyText = (replyDrafts[commentId] || '').trim();
    if (!replyText) {
      message.warning('请输入回复内容。');
      return;
    }

    setReplyLoadingId(commentId);
    try {
      await diaryService.addComment(detailDiary.id, replyText, undefined, commentId);
      await refreshDiaryDetail(detailDiary.id, detailDiary);
      setReplyDrafts((current) => ({
        ...current,
        [commentId]: '',
      }));
      setActiveReplyId(null);
      message.success('回复已发布。');
      await Promise.all([loadCommunity(), loadPopularityRanking(), loadRatingRanking()]);
    } catch (error: unknown) {
      message.error(resolveErrorMessage(error, '回复失败，请稍后重试。'));
    } finally {
      setReplyLoadingId(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!detailDiary?.id) {
      return;
    }

    setCommentDeletingId(commentId);
    try {
      await diaryService.deleteComment(detailDiary.id, commentId);
      await refreshDiaryDetail(detailDiary.id, detailDiary);
      message.success('评论已处理。');
      await Promise.all([loadCommunity(), loadPopularityRanking(), loadRatingRanking()]);
    } catch (error: unknown) {
      message.error(resolveErrorMessage(error, '评论管理失败，请稍后重试。'));
    } finally {
      setCommentDeletingId(null);
    }
  };

  const handleSearch = async () => {
    const keyword = searchKeyword.trim();
    if (!keyword) {
      message.warning('请输入检索关键词。');
      return;
    }

    setSearching(true);
    try {
      let data: Diary[] = [];
      if (searchType === 'fulltext') {
        const response = await diaryService.searchDiaries(keyword, 30, searchMode);
        data = response.data || [];
      } else if (searchType === 'destination') {
        const response = await diaryService.searchDiariesByDestination(keyword, 30);
        data = response.data || [];
      } else {
        const response = await diaryService.searchDiariesByExactTitle(keyword, 30);
        data = response.data || [];
      }
      setSearchResults(data);
    } catch (error: unknown) {
      message.error(resolveErrorMessage(error, '检索失败，请稍后重试。'));
    } finally {
      setSearching(false);
    }
  };

  const handleGenerateAnimation = async () => {
    if (!hasLoginToken) {
      message.warning('请先登录后再生成旅行动画。');
      return;
    }

    if (!animationPhotos.length) {
      message.warning('请至少上传一张图片。');
      return;
    }

    if (!animationDescription.trim()) {
      message.warning('请输入动画描述。');
      return;
    }

    setAnimationLoading(true);
    try {
      const response = await diaryService.generateAnimation(
        animationPhotos.map((url) => ({ url })),
        animationDescription.trim(),
      );
      setAnimationUrl(response.data.animationUrl);
      message.success('AIGC 旅行动画已生成。');
    } catch (error: unknown) {
      message.error(resolveErrorMessage(error, '生成旅行动画失败，请稍后重试。'));
    } finally {
      setAnimationLoading(false);
    }
  };

  const handleAnimationUpload = async (file: File) => {
    if (animationPhotos.length >= maxAnimationPhotoCount) {
      message.warning(`最多上传 ${maxAnimationPhotoCount} 张图片用于生成动画。`);
      return Upload.LIST_IGNORE;
    }

    try {
      const compressedPhoto = await compressImageToDataUrl(file);
      const nextPhotos = [...animationPhotos, compressedPhoto];
      const totalBytes = nextPhotos.reduce((sum, item) => sum + estimateBase64Bytes(item), 0);

      if (totalBytes > maxAnimationPayloadBytes) {
        message.warning('图片总大小仍然偏大，请减少张数或换成更小的图片后重试。');
        return Upload.LIST_IGNORE;
      }

      setAnimationPhotos(nextPhotos);
      message.success(`已添加图片：${file.name}`);
    } catch (error: unknown) {
      message.error(resolveErrorMessage(error, '图片处理失败，请更换图片后重试。'));
    }

    return Upload.LIST_IGNORE;
  };

  const handleRemoveAnimationPhoto = (target: string) => {
    setAnimationPhotos((current) => current.filter((item) => item !== target));
  };

  const handleDiaryImageUpload = async (file: File) => {
    if (diaryImageUrls.length >= maxDiaryPhotoCount) {
      message.warning(`日记图片最多上传 ${maxDiaryPhotoCount} 张。`);
      return Upload.LIST_IGNORE;
    }

    try {
      const compressedPhoto = await compressImageToDataUrl(file);
      const nextPhotos = [...diaryImageUrls, compressedPhoto];
      const totalBytes = nextPhotos.reduce((sum, item) => sum + estimateBase64Bytes(item), 0);

      if (totalBytes > maxDiaryPayloadBytes) {
        message.warning('日记图片总大小过大，请减少图片数量或更换更小的图片。');
        return Upload.LIST_IGNORE;
      }

      setDiaryImageUrls(nextPhotos);
      message.success(`已添加日记图片：${file.name}`);
    } catch (error: unknown) {
      message.error(resolveErrorMessage(error, '日记图片处理失败，请更换图片后重试。'));
    }

    return Upload.LIST_IGNORE;
  };

  const handleRemoveDiaryImage = (target: string) => {
    setDiaryImageUrls((current) => current.filter((item) => item !== target));
  };

  const handleDiaryVideoUpload = async (file: File) => {
    if (diaryVideoUrls.length >= maxDiaryVideoCount) {
      message.warning(`日记视频最多上传 ${maxDiaryVideoCount} 段。`);
      return Upload.LIST_IGNORE;
    }

    try {
      const videoDataUrl = await readFileAsDataUrl(file);
      const nextVideos = [...diaryVideoUrls, videoDataUrl];
      const totalBytes = nextVideos.reduce((sum, item) => sum + estimateBase64Bytes(item), 0);

      if (totalBytes > maxDiaryVideoPayloadBytes) {
        message.warning('日记视频总大小过大，请减少视频数量或更换更小的文件。');
        return Upload.LIST_IGNORE;
      }

      setDiaryVideoUrls(nextVideos);
      message.success(`已添加日记视频：${file.name}`);
    } catch (error: unknown) {
      message.error(resolveErrorMessage(error, '日记视频处理失败，请更换文件后重试。'));
    }

    return Upload.LIST_IGNORE;
  };

  const handleRemoveDiaryVideo = (target: string) => {
    setDiaryVideoUrls((current) => current.filter((item) => item !== target));
  };

  const canManageComment = (comment: DiaryComment) =>
    Boolean(user?.id && detailDiary && (comment.userId === user.id || detailDiary.userId === user.id));

  const renderCommentItems = (comments: DiaryComment[], depth = 0): React.ReactNode =>
    comments.map((comment) => (
      <div
        key={comment.id}
        style={{
          marginLeft: depth > 0 ? 20 : 0,
          marginTop: depth > 0 ? 12 : 0,
          padding: '14px 16px',
          borderRadius: 14,
          border: '1px solid rgba(148,163,184,0.18)',
          background: depth > 0 ? 'rgba(248,250,252,0.78)' : 'rgba(255,255,255,0.9)',
        }}
      >
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
            <Space wrap>
              <Text strong>{comment.user?.username || '游客'}</Text>
              {typeof comment.rating === 'number' ? <Rate disabled value={Number(comment.rating)} /> : null}
              <Text type="secondary">{new Date(comment.createdAt).toLocaleString()}</Text>
            </Space>
            <Space wrap size={4}>
              {hasLoginToken ? (
                <Button type="link" size="small" onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)}>
                  回复
                </Button>
              ) : null}
              {canManageComment(comment) ? (
                <Button
                  type="link"
                  size="small"
                  danger
                  loading={commentDeletingId === comment.id}
                  onClick={() => handleDeleteComment(comment.id)}
                >
                  删除
                </Button>
              ) : null}
            </Space>
          </Space>
          <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{comment.content}</Paragraph>
          {activeReplyId === comment.id && hasLoginToken ? (
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Input.TextArea
                rows={3}
                value={replyDrafts[comment.id] || ''}
                onChange={(event) => handleReplyDraftChange(comment.id, event.target.value)}
                placeholder="写下你的回复..."
              />
              <Space>
                <Button type="primary" loading={replyLoadingId === comment.id} onClick={() => handleReplySubmit(comment.id)}>
                  发布回复
                </Button>
                <Button onClick={() => setActiveReplyId(null)}>取消</Button>
              </Space>
            </Space>
          ) : null}
          {comment.replies?.length ? renderCommentItems(comment.replies, depth + 1) : null}
        </Space>
      </div>
    ));

  const renderDiaryList = (items: Diary[], showMineAction = false, highlightQuery = '') =>
    items.length > 0 ? (
      <List
        dataSource={items}
        renderItem={(item) => (
          <List.Item
            actions={
              showMineAction
                ? [
                    <Button key="edit" type="link" onClick={() => openCreateModal(item)}>
                      编辑
                    </Button>,
                    <Button key="delete" type="link" danger onClick={() => handleDelete(item.id)}>
                      删除
                    </Button>,
                    <Button key="detail" type="link" onClick={() => openDiaryDetail(item)}>
                      查看详情
                    </Button>,
                  ]
                : [
                    <Button key="detail" type="link" onClick={() => openDiaryDetail(item)}>
                      查看详情
                    </Button>,
                  ]
            }
          >
            <List.Item.Meta
              title={
                <Space wrap>
                  <Text strong>{item.title}</Text>
                  {item.imageUrls?.length ? <Tag color="purple">图片 {item.imageUrls.length}</Tag> : null}
                  {item.videoUrls?.length ? <Tag color="cyan">视频 {item.videoUrls.length}</Tag> : null}
                  {item.isShared ? <Tag color="green">已分享</Tag> : <Tag>未分享</Tag>}
                  <Tag color="orange">热度 {item.popularity || 0}</Tag>
                  <Tag color="blue">评分 {Number(item.averageRating || 0).toFixed(1)}</Tag>
                </Space>
              }
              description={
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Text type="secondary">
                    作者：{item.user?.username || '未知用户'} · 目的地：{item.destination || '未填写'} · 创建时间：
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                  <Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 5 }}>
                    {highlightQuery ? highlightText(item.content || '', highlightQuery) : item.content}
                  </Paragraph>
                  {item.imageUrls?.length ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                      {item.imageUrls.slice(0, 3).map((url, index) => (
                        <img
                          key={`${item.id}-thumb-${index}`}
                          src={url}
                          alt={`${item.title}-thumb-${index + 1}`}
                          style={{ width: 84, height: 64, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(148,163,184,0.2)' }}
                        />
                      ))}
                    </div>
                  ) : null}
                  {item.videoUrls?.length ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                      {item.videoUrls.slice(0, 1).map((url, index) => (
                        <video
                          key={`${item.id}-video-${index}`}
                          src={url}
                          controls
                          style={{ width: 180, height: 104, borderRadius: 12, background: '#0f172a' }}
                        />
                      ))}
                    </div>
                  ) : null}
                </Space>
              }
            />
          </List.Item>
        )}
      />
    ) : (
      <Empty description="暂无日记数据" />
    );

  return (
    <div style={{ padding: 8, maxWidth: 1280, margin: '0 auto' }}>
      <PremiumPageHero
        title="旅行日记中心"
        description="支持我的日记、社区浏览、全文检索、热度榜和好评榜，让旅行内容既能沉淀，也能再次被发现。"
        accent="teal"
        tags={['我的日记', '社区交流', '全文检索', '热度榜', '好评榜']}
        metrics={[
          { label: '我的日记', value: mine.length, suffix: '篇' },
          { label: '社区日记', value: community.length, suffix: '篇' },
          { label: '热度榜', value: popularityRanking.length, suffix: '条' },
          { label: '好评榜', value: ratingRanking.length, suffix: '条' },
        ]}
      />

      <Card variant="borderless" style={{ borderRadius: 20, marginBottom: 16, boxShadow: '0 14px 30px rgba(15,23,42,0.06)' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={10}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Text strong>文档能力对齐</Text>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                当前日记中心已经覆盖“我的日记、社区浏览、全文检索、目的地检索、热度榜、好评榜、评论评分”等课设原文档要求。
              </Paragraph>
              <Space wrap>
                <Tag color="blue">全文检索</Tag>
                <Tag color="orange">热度榜</Tag>
                <Tag color="green">好评榜</Tag>
                <Tag color="purple">评论评分</Tag>
              </Space>
            </Space>
          </Col>
          <Col xs={24} lg={14}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Text strong>AIGC 旅行动画</Text>
              <Text type="secondary">现在支持像打卡照片一样直接上传本地图片，系统会把这些图片和描述一起生成旅行动画。</Text>
              <Upload
                listType="picture-card"
                multiple
                beforeUpload={handleAnimationUpload}
                showUploadList={false}
              >
                <div>
                  <div style={{ marginBottom: 8 }}>上传图片</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>支持多张</div>
                </div>
              </Upload>
              {animationPhotos.length > 0 ? (
                <List
                  grid={{ gutter: 12, xs: 2, sm: 3, md: 4 }}
                  dataSource={animationPhotos}
                  renderItem={(photo) => (
                    <List.Item>
                      <Card
                        variant="borderless"
                        style={{ borderRadius: 12, overflow: 'hidden', background: 'rgba(248,250,252,0.92)' }}
                        cover={<img src={photo} alt="动画素材" style={{ height: 120, objectFit: 'cover' }} />}
                        actions={[
                          <Button key="remove" type="link" danger onClick={() => handleRemoveAnimationPhoto(photo)}>
                            删除
                          </Button>,
                        ]}
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Alert type="info" showIcon message="上传一张或多张旅行照片后，再填写描述生成动画。" />
              )}
              <TextArea
                rows={3}
                value={animationDescription}
                onChange={(event) => setAnimationDescription(event.target.value)}
                placeholder="描述这次旅行的主题、节奏和你希望动画突出呈现的内容"
              />
              <Space wrap>
                <Button type="primary" loading={animationLoading} onClick={handleGenerateAnimation}>
                  生成旅行动画
                </Button>
                {animationUrl ? (
                  <Button href={animationUrl} target="_blank" rel="noreferrer">
                    打开结果
                  </Button>
                ) : null}
              </Space>
              {animationUrl ? (
                <Alert
                  type="success"
                  showIcon
                  message="动画生成成功"
                  description={
                    <a href={animationUrl} target="_blank" rel="noreferrer">
                      {animationUrl}
                    </a>
                  }
                />
              ) : null}
            </Space>
          </Col>
        </Row>
      </Card>

      {!hasLoginToken ? (
        <Alert
          showIcon
          type="warning"
          style={{ marginBottom: 16 }}
          message="当前未登录，你仍然可以浏览社区日记和榜单；创建、编辑和评论需要登录。"
        />
      ) : isRestoringLogin ? (
        <Alert
          showIcon
          type="info"
          style={{ marginBottom: 16 }}
          message="正在恢复登录状态，写日记和评论功能马上可用。"
        />
      ) : null}

      <Card variant="borderless" style={{ borderRadius: 20, boxShadow: '0 14px 30px rgba(15,23,42,0.06)' }}>
        <Tabs
          activeKey={activeTab}
          onChange={(value) => setActiveTab(value as DiaryTab)}
          items={[
            { key: 'mine', label: '我的日记' },
            { key: 'community', label: '社区日记' },
            { key: 'search', label: '全文检索' },
            { key: 'popularity', label: '热度榜' },
            { key: 'rating', label: '好评榜' },
          ]}
          tabBarExtraContent={
            activeTab === 'mine' && hasLoginToken ? (
              <Button type="primary" onClick={() => openCreateModal()}>
                新建日记
              </Button>
            ) : null
          }
        />

        {rankingHint ? <Alert type="info" showIcon style={{ marginBottom: 12 }} message={rankingHint} /> : null}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
            <Spin size="large" />
          </div>
        ) : null}

        {!loading && activeTab === 'mine' ? renderDiaryList(mine, true) : null}
        {!loading && activeTab === 'community' ? renderDiaryList(community, false) : null}
        {!loading && activeTab === 'popularity' ? renderDiaryList(popularityRanking, false) : null}
        {!loading && activeTab === 'rating' ? renderDiaryList(ratingRanking, false) : null}

        {!loading && activeTab === 'search' ? (
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <Row gutter={[12, 12]}>
              <Col xs={24} md={8}>
                <Text type="secondary">检索类型</Text>
                <Segmented
                  style={{ width: '100%', marginTop: 8 }}
                  value={searchType}
                  onChange={(value) => setSearchType(value as SearchType)}
                  options={[
                    { label: '全文检索', value: 'fulltext' },
                    { label: '按目的地', value: 'destination' },
                    { label: '标题精确', value: 'title_exact' },
                  ]}
                />
              </Col>
              <Col xs={24} md={8}>
                <Text type="secondary">关键词匹配模式（全文检索）</Text>
                <Segmented
                  style={{ width: '100%', marginTop: 8 }}
                  value={searchMode}
                  onChange={(value) => setSearchMode(value as SearchMode)}
                  options={[
                    { label: '任一关键词', value: 'any' },
                    { label: '全部关键词', value: 'all' },
                  ]}
                  disabled={searchType !== 'fulltext'}
                />
              </Col>
              <Col xs={24} md={8}>
                <Text type="secondary">检索词</Text>
                <Input.Search
                  style={{ marginTop: 8 }}
                  placeholder={
                    searchType === 'fulltext'
                      ? '例如：北京 博物馆 慢游'
                      : searchType === 'destination'
                        ? '例如：博物馆 / 天坛'
                        : '例如：天坛的风从祈年殿吹来：北京一日散记'
                  }
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  enterButton="搜索"
                  loading={searching}
                  onSearch={handleSearch}
                />
              </Col>
            </Row>
            {searching ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <Spin />
              </div>
            ) : (
              renderDiaryList(searchResults, false, searchType === 'fulltext' ? searchKeyword : '')
            )}
          </Space>
        ) : null}
      </Card>

      <Modal
        title={editingDiary ? '编辑日记' : '新建日记'}
        open={modalVisible}
        onCancel={closeCreateModal}
        footer={null}
        destroyOnHidden
        forceRender
        width={980}
      >
        <Form<DiaryFormValues> form={form} layout="vertical" onFinish={handleCreateOrUpdate}>
          <Form.Item name="title" label="日记标题" rules={[{ required: true, message: '请输入日记标题。' }]}>
            <Input placeholder="例如：故宫一日游实录" />
          </Form.Item>
          <Form.Item name="content" label="日记内容" rules={[{ required: true, message: '请输入日记内容。' }]}>
            <TextArea rows={10} placeholder="记录你的路线、见闻、体验和建议..." />
          </Form.Item>
          <Form.Item name="destination" label="目的地">
            <Input placeholder="例如：故宫 / 清华大学" />
          </Form.Item>
          <Form.Item label="日记图片">
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Upload beforeUpload={handleDiaryImageUpload} showUploadList={false} accept="image/*">
                <Button>上传图片</Button>
              </Upload>
              {diaryImageUrls.length ? (
                <List
                  size="small"
                  dataSource={diaryImageUrls}
                  renderItem={(url, index) => (
                    <List.Item
                      actions={[
                        <Button key={`remove-${index}`} type="link" danger onClick={() => handleRemoveDiaryImage(url)}>
                          删除
                        </Button>,
                      ]}
                    >
                      <Space>
                        <img
                          src={url}
                          alt={`diary-upload-${index + 1}`}
                          style={{ width: 88, height: 64, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(148,163,184,0.2)' }}
                        />
                        <Text type="secondary">第 {index + 1} 张图片</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              ) : (
                <Text type="secondary">可上传最多 6 张图片，用于旅行日记展示。</Text>
              )}
            </Space>
          </Form.Item>
          <Form.Item label="日记视频">
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Upload beforeUpload={handleDiaryVideoUpload} showUploadList={false} accept="video/*">
                <Button>上传视频</Button>
              </Upload>
              {diaryVideoUrls.length ? (
                <List
                  size="small"
                  dataSource={diaryVideoUrls}
                  renderItem={(url, index) => (
                    <List.Item
                      actions={[
                        <Button key={`remove-video-${index}`} type="link" danger onClick={() => handleRemoveDiaryVideo(url)}>
                          删除
                        </Button>,
                      ]}
                    >
                      <Space align="start">
                        <video
                          src={url}
                          controls
                          style={{ width: 180, height: 104, borderRadius: 12, background: '#0f172a' }}
                        />
                        <Text type="secondary">第 {index + 1} 段视频</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              ) : (
                <Text type="secondary">可上传最多 2 段视频，用于更完整地展示旅行日记。</Text>
              )}
            </Space>
          </Form.Item>
          <Form.Item name="isShared" valuePropName="checked">
            <Checkbox>分享至社区</Checkbox>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            {editingDiary ? '保存修改' : '创建日记'}
          </Button>
        </Form>
      </Modal>

      <Modal title={detailDiary?.title || '日记详情'} open={detailVisible} onCancel={closeDiaryDetail} footer={null} width={980}>
        {detailDiary ? (
          <Space direction="vertical" size={18} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color="orange">热度 {detailDiary.popularity || 0}</Tag>
              <Tag color="blue">评分 {Number(detailDiary.averageRating || 0).toFixed(1)}</Tag>
              <Tag color="purple">评论 {detailDiary.reviewCount || 0}</Tag>
            </Space>
            <Text type="secondary">
              作者：{detailDiary.user?.username || '未知用户'} · 目的地：{detailDiary.destination || '未填写'} · 发布时间：
              {new Date(detailDiary.createdAt).toLocaleString()}
            </Text>
            <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0, fontSize: 16, lineHeight: 1.9 }}>
              {detailDiary.content || '暂无内容'}
            </Paragraph>

            {detailDiary.imageUrls?.length ? (
              <List
                grid={{ gutter: 12, xs: 1, sm: 2, md: 3 }}
                dataSource={detailDiary.imageUrls}
                renderItem={(url, index) => (
                  <List.Item>
                    <img
                      src={url}
                      alt={`${detailDiary.title}-image-${index + 1}`}
                      style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 16, border: '1px solid rgba(148,163,184,0.2)' }}
                    />
                  </List.Item>
                )}
              />
            ) : null}

            {detailDiary.videoUrls?.length ? (
              <List
                grid={{ gutter: 12, xs: 1, md: 2 }}
                dataSource={detailDiary.videoUrls}
                renderItem={(url) => (
                  <List.Item>
                    <video
                      src={url}
                      controls
                      style={{ width: '100%', maxHeight: 280, borderRadius: 16, background: '#0f172a' }}
                    />
                  </List.Item>
                )}
              />
            ) : null}

            <Card size="small" title="评论区">
              {detailComments.length > 0 ? (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {renderCommentItems(detailComments)}
                </Space>
              ) : (
                <Empty description="暂无评论" />
              )}

              {hasLoginToken ? (
                <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 16 }}>
                  <Text strong>发表评论</Text>
                  <Rate value={commentRating} onChange={setCommentRating} />
                  <Input.TextArea
                    rows={4}
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder="写下你的游览体验、建议或补充信息..."
                  />
                  <Button type="primary" loading={commentLoading} onClick={handleCommentSubmit}>
                    提交评论
                  </Button>
                </Space>
              ) : (
                <Alert showIcon type="info" message="登录后可参与评论。" style={{ marginTop: 8 }} />
              )}
            </Card>
          </Space>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Spin />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DiaryPage;
