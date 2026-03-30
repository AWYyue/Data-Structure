import React, { useEffect, useMemo, useState } from 'react';
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Input,
  List,
  Modal,
  Rate,
  Row,
  Space,
  Typography,
  Upload,
} from 'antd';
import {
  CameraOutlined,
  ClockCircleOutlined,
  LikeOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import MapComponent from './MapComponent';
import { photoSpotService, type PhotoCheckin, type PhotoSpot } from '../services/photoSpotService';
import { resolveErrorMessage } from '../utils/errorMessage';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface PhotoSpotComponentProps {
  attractionId?: string;
  scenicAreaId?: string;
}

type CheckinStats = {
  totalCheckins: number;
  recentCheckins: PhotoCheckin[];
};

const crowdLabelMap: Record<string, string> = {
  low: '较低',
  medium: '适中',
  high: '较高',
};

const lightingLabelMap: Record<string, string> = {
  excellent: '极佳',
  good: '良好',
  fair: '一般',
  poor: '偏弱',
};

const crowdColorMap: Record<string, string> = {
  low: '#16a34a',
  medium: '#d97706',
  high: '#dc2626',
};

const lightingColorMap: Record<string, string> = {
  excellent: '#16a34a',
  good: '#2563eb',
  fair: '#d97706',
  poor: '#dc2626',
};

const PhotoSpotComponent: React.FC<PhotoSpotComponentProps> = ({ attractionId, scenicAreaId }) => {
  const { message } = App.useApp();
  const targetId = attractionId || scenicAreaId || '';
  const [photoSpots, setPhotoSpots] = useState<PhotoSpot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<PhotoSpot | null>(null);
  const [checkinStats, setCheckinStats] = useState<CheckinStats | null>(null);
  const [popularPhotos, setPopularPhotos] = useState<PhotoCheckin[]>([]);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState('');
  const [caption, setCaption] = useState('');

  useEffect(() => {
    if (!targetId) {
      setPhotoSpots([]);
      setPopularPhotos([]);
      setSelectedSpot(null);
      setCheckinStats(null);
      return;
    }

    void loadPhotoSpots();
    void loadPopularPhotos();
  }, [targetId]);

  const loadPhotoSpots = async () => {
    setLoading(true);
    try {
      const spots = await photoSpotService.getPhotoSpots(targetId);
      setPhotoSpots(spots);
      setSelectedSpot((current) => current || spots[0] || null);
    } catch (error: unknown) {
      console.error('加载拍照位置失败:', error);
      message.error(resolveErrorMessage(error, '加载拍照位置失败，请稍后重试。'));
    } finally {
      setLoading(false);
    }
  };

  const loadPopularPhotos = async () => {
    try {
      const photos = await photoSpotService.getPopularPhotos(targetId);
      setPopularPhotos(photos);
    } catch (error: unknown) {
      console.error('加载热门照片失败:', error);
    }
  };

  const handleSpotSelect = async (spot: PhotoSpot) => {
    setSelectedSpot(spot);
    try {
      const stats = await photoSpotService.getCheckinStats(spot.id);
      setCheckinStats(stats);
    } catch (error: unknown) {
      console.error('加载打卡统计失败:', error);
      setCheckinStats(null);
    }
  };

  useEffect(() => {
    if (!selectedSpot?.id) {
      setCheckinStats(null);
      return;
    }
    void handleSpotSelect(selectedSpot);
  }, [selectedSpot?.id]);

  const handleUpload = async () => {
    if (!selectedSpot) {
      message.warning('请先选择拍照位置。');
      return;
    }

    if (!currentPhoto) {
      message.warning('请先选择照片。');
      return;
    }

    setUploading(true);
    try {
      await photoSpotService.uploadCheckinPhoto(selectedSpot.id, currentPhoto, caption.trim() || undefined);
      message.success('打卡照片已上传。');
      setUploadModalVisible(false);
      setCurrentPhoto('');
      setCaption('');
      const stats = await photoSpotService.getCheckinStats(selectedSpot.id);
      setCheckinStats(stats);
      await loadPopularPhotos();
    } catch (error: unknown) {
      console.error('上传打卡照片失败:', error);
      message.error(resolveErrorMessage(error, '上传打卡照片失败，请稍后重试。'));
    } finally {
      setUploading(false);
    }
  };

  const bestSpotSummary = useMemo(() => {
    if (!selectedSpot) {
      return '先从左侧选择一个拍照点，系统会展示位置、光线和打卡数据。';
    }
    return `${selectedSpot.name} 适合在 ${selectedSpot.bestTime || '推荐时段'} 前往，当前人流 ${crowdLabelMap[selectedSpot.crowdLevel] || '适中'}，光线 ${lightingLabelMap[selectedSpot.lightingCondition] || '良好'}。`;
  }, [selectedSpot]);

  return (
    <div style={{ padding: '8px 0' }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card
          variant="borderless"
          style={{
            borderRadius: 18,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,250,252,0.96))',
            boxShadow: '0 12px 28px rgba(15,23,42,0.06)',
          }}
        >
          <Space direction="vertical" size={6} style={{ width: '100%' }}>
            <Title level={4} style={{ margin: 0 }}>
              摄影打卡
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              查看景区内适合拍照的点位，参考最佳时段、人流和光线，再把现场照片上传成旅行打卡内容。
            </Paragraph>
            <Text type="secondary">{bestSpotSummary}</Text>
          </Space>
        </Card>

        {popularPhotos.length > 0 ? (
          <Card variant="borderless" style={{ borderRadius: 18, boxShadow: '0 12px 28px rgba(15,23,42,0.06)' }}>
            <Title level={4} style={{ marginTop: 0 }}>
              热门照片
            </Title>
            <List
              grid={{ gutter: 16, xs: 1, sm: 2, lg: 3 }}
              dataSource={popularPhotos}
              renderItem={(photo) => (
                <List.Item>
                  <Card
                    hoverable
                    variant="borderless"
                    cover={<img alt={photo.caption || '热门打卡照片'} src={photo.photoUrl} style={{ height: 170, objectFit: 'cover' }} />}
                    style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.96)' }}
                  >
                    <Card.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={photo.caption || '旅行打卡'}
                      description={
                        <Space split={<span>·</span>}>
                          <Text>{photo.likes} <LikeOutlined /></Text>
                          <Text type="secondary">{photo.timestamp ? new Date(photo.timestamp).toLocaleString() : '最近上传'}</Text>
                        </Space>
                      }
                    />
                  </Card>
                </List.Item>
              )}
            />
          </Card>
        ) : null}

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={10}>
            <Card variant="borderless" style={{ borderRadius: 18, height: '100%', boxShadow: '0 12px 28px rgba(15,23,42,0.06)' }}>
              <Title level={4} style={{ marginTop: 0 }}>
                最佳拍照位置
              </Title>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Text type="secondary">正在加载拍照点位...</Text>
                </div>
              ) : photoSpots.length > 0 ? (
                <List
                  dataSource={photoSpots}
                  renderItem={(spot) => (
                    <List.Item
                      key={spot.id}
                      onClick={() => void handleSpotSelect(spot)}
                      style={{
                        cursor: 'pointer',
                        borderRadius: 12,
                        padding: 12,
                        background: selectedSpot?.id === spot.id ? 'rgba(37,99,235,0.06)' : 'transparent',
                      }}
                    >
                      <List.Item.Meta
                        title={
                          <Space wrap>
                            <Text strong>{spot.name}</Text>
                            <Rate disabled value={Math.max(1, Math.round((spot.popularity || 0) / 20))} />
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size={6}>
                            <Text type="secondary">{spot.description || '暂无拍照点介绍'}</Text>
                            <Space wrap>
                              <Text><ClockCircleOutlined /> 推荐时段：{spot.bestTime || '待补充'}</Text>
                              <Text style={{ color: crowdColorMap[spot.crowdLevel] || '#64748b' }}>
                                人流：{crowdLabelMap[spot.crowdLevel] || '适中'}
                              </Text>
                              <Text style={{ color: lightingColorMap[spot.lightingCondition] || '#64748b' }}>
                                光线：{lightingLabelMap[spot.lightingCondition] || '良好'}
                              </Text>
                            </Space>
                          </Space>
                        }
                      />
                      <Button type="primary" size="small">
                        查看详情
                      </Button>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="当前景区暂无拍照位置数据" />
              )}
            </Card>
          </Col>

          <Col xs={24} xl={14}>
            {selectedSpot ? (
              <Card variant="borderless" style={{ borderRadius: 18, boxShadow: '0 12px 28px rgba(15,23,42,0.06)' }}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <div>
                    <Title level={4} style={{ marginBottom: 4 }}>
                      {selectedSpot.name}
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                      {selectedSpot.description || '这里是当前景区较受欢迎的拍照点位，适合停留拍摄和打卡留念。'}
                    </Paragraph>
                  </div>

                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={11}>
                      <Space direction="vertical" size={10} style={{ width: '100%' }}>
                        <Text><ClockCircleOutlined /> 最佳拍照时间：{selectedSpot.bestTime || '待补充'}</Text>
                        <Text style={{ color: crowdColorMap[selectedSpot.crowdLevel] || '#64748b' }}>
                          人流情况：{crowdLabelMap[selectedSpot.crowdLevel] || '适中'}
                        </Text>
                        <Text style={{ color: lightingColorMap[selectedSpot.lightingCondition] || '#64748b' }}>
                          光线条件：{lightingLabelMap[selectedSpot.lightingCondition] || '良好'}
                        </Text>
                        <Text>打卡人数：{checkinStats?.totalCheckins || 0} 人</Text>
                        <Button type="primary" icon={<CameraOutlined />} onClick={() => setUploadModalVisible(true)}>
                          上传打卡照片
                        </Button>
                      </Space>
                    </Col>
                    <Col xs={24} lg={13}>
                      <MapComponent
                        center={[selectedSpot.location.latitude, selectedSpot.location.longitude]}
                        zoom={18}
                        markers={[
                          {
                            id: selectedSpot.id,
                            position: [selectedSpot.location.latitude, selectedSpot.location.longitude],
                            title: selectedSpot.name,
                            type: 'attraction',
                          },
                        ]}
                        baseMapMode="scenic"
                      />
                    </Col>
                  </Row>

                  {selectedSpot.examplePhotos?.length ? (
                    <div>
                      <Title level={5}>示例照片</Title>
                      <Row gutter={[10, 10]}>
                        {selectedSpot.examplePhotos.map((photo, index) => (
                          <Col span={8} key={index}>
                            <img
                              src={photo}
                              alt={`示例照片 ${index + 1}`}
                              style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8 }}
                            />
                          </Col>
                        ))}
                      </Row>
                    </div>
                  ) : null}

                  <div>
                    <Title level={5}>最近打卡</Title>
                    {checkinStats?.recentCheckins?.length ? (
                      <List
                        grid={{ gutter: 16, xs: 1, sm: 2, lg: 3 }}
                        dataSource={checkinStats.recentCheckins}
                        renderItem={(checkin) => (
                          <List.Item>
                            <Card
                              hoverable
                              variant="borderless"
                              cover={<img alt={checkin.caption || '打卡照片'} src={checkin.photoUrl} style={{ height: 120, objectFit: 'cover' }} />}
                              style={{ borderRadius: 14, overflow: 'hidden', background: 'rgba(248,250,252,0.96)' }}
                            >
                              <Card.Meta
                                avatar={<Avatar icon={<UserOutlined />} />}
                                title={checkin.caption || '打卡成功'}
                                description={<Text>{checkin.likes} <LikeOutlined /></Text>}
                              />
                            </Card>
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty description="当前暂无打卡记录" />
                    )}
                  </div>
                </Space>
              </Card>
            ) : (
              <Card variant="borderless" style={{ borderRadius: 18, boxShadow: '0 12px 28px rgba(15,23,42,0.06)' }}>
                <Empty description="请先从左侧选择一个拍照点位" />
              </Card>
            )}
          </Col>
        </Row>
      </Space>

      <Modal
        title="上传打卡照片"
        open={uploadModalVisible}
        onOk={() => void handleUpload()}
        onCancel={() => setUploadModalVisible(false)}
        okText="确认上传"
        cancelText="取消"
        confirmLoading={uploading}
      >
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <Text>当前点位：{selectedSpot?.name || '未选择'}</Text>
          <Upload
            listType="picture"
            beforeUpload={(file) => {
              const reader = new FileReader();
              reader.onload = (event) => {
                setCurrentPhoto((event.target?.result as string) || '');
              };
              reader.readAsDataURL(file);
              return false;
            }}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>选择照片</Button>
          </Upload>
          <TextArea
            rows={3}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="给这张照片写一句说明，例如：傍晚逆光很好看，人也不多。"
          />
          {currentPhoto ? (
            <img
              src={currentPhoto}
              alt="预览"
              style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
          ) : null}
        </Space>
      </Modal>
    </div>
  );
};

export default PhotoSpotComponent;
