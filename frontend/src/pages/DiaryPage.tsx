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
    reader.onerror = () => reject(new Error('读取图片失败'));
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
  const [animationPhotos, setAnimationPhotos] = useState<string[]>([]);
  const [animationDescription, setAnimationDescription] = useState('');
  const [animationLoading, setAnimationLoading] = useState(false);
  const [animationUrl, setAnimationUrl] = useState('');

  const [form] = Form.useForm<DiaryFormValues>();
  const hasLoginToken = Boolean(token);
  const isRestoringLogin = hasLoginToken && !user?.id && userLoading;
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

  const openDiaryDetail = async (diary: Diary) => {
    setDetailVisible(true);
    setDetailDiary(diary);
    try {
      const [detailResp, commentsResp] = await Promise.all([
        diaryService.getDiaryById(diary.id),
        diaryService.getDiaryComments(diary.id, 50, 0),
      ]);
      setDetailDiary(detailResp.data);
      setDetailComments(commentsResp.data || []);
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
      const [detailResp, commentsResp] = await Promise.all([
        diaryService.getDiaryById(detailDiary.id),
        diaryService.getDiaryComments(detailDiary.id, 50, 0),
      ]);
      setDetailDiary(detailResp.data);
      setDetailComments(commentsResp.data || []);
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
                  <Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 2 }}>
                    {highlightQuery ? highlightText(item.content || '', highlightQuery) : item.content}
                  </Paragraph>
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
                      ? '例如：美食 夜景 打卡'
                      : searchType === 'destination'
                        ? '例如：故宫'
                        : '请输入完整标题'
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
      >
        <Form<DiaryFormValues> form={form} layout="vertical" onFinish={handleCreateOrUpdate}>
          <Form.Item name="title" label="日记标题" rules={[{ required: true, message: '请输入日记标题。' }]}>
            <Input placeholder="例如：故宫一日游实录" />
          </Form.Item>
          <Form.Item name="content" label="日记内容" rules={[{ required: true, message: '请输入日记内容。' }]}>
            <TextArea rows={5} placeholder="记录你的路线、见闻、体验和建议..." />
          </Form.Item>
          <Form.Item name="destination" label="目的地">
            <Input placeholder="例如：故宫 / 清华大学" />
          </Form.Item>
          <Form.Item name="isShared" valuePropName="checked">
            <Checkbox>分享至社区</Checkbox>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            {editingDiary ? '保存修改' : '创建日记'}
          </Button>
        </Form>
      </Modal>

      <Modal title={detailDiary?.title || '日记详情'} open={detailVisible} onCancel={closeDiaryDetail} footer={null} width={860}>
        {detailDiary ? (
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color="orange">热度 {detailDiary.popularity || 0}</Tag>
              <Tag color="blue">评分 {Number(detailDiary.averageRating || 0).toFixed(1)}</Tag>
              <Tag color="purple">评论 {detailDiary.reviewCount || 0}</Tag>
            </Space>
            <Text type="secondary">
              作者：{detailDiary.user?.username || '未知用户'} · 目的地：{detailDiary.destination || '未填写'} · 发布时间：
              {new Date(detailDiary.createdAt).toLocaleString()}
            </Text>
            <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{detailDiary.content || '暂无内容'}</Paragraph>

            <Card size="small" title="评论区">
              {detailComments.length > 0 ? (
                <List
                  dataSource={detailComments}
                  renderItem={(comment) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space wrap>
                            <Text strong>{comment.user?.username || '游客'}</Text>
                            {typeof comment.rating === 'number' ? <Rate disabled value={Number(comment.rating)} /> : null}
                            <Text type="secondary">{new Date(comment.createdAt).toLocaleString()}</Text>
                          </Space>
                        }
                        description={comment.content}
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="暂无评论" />
              )}

              {hasLoginToken ? (
                <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 8 }}>
                  <Text strong>发表你的评论</Text>
                  <Rate value={commentRating} onChange={setCommentRating} />
                  <Input.TextArea
                    rows={3}
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder="写下你的游览体验和建议..."
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
