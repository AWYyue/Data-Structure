import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import { CheckCircleOutlined, LoadingOutlined, TrophyOutlined } from '@ant-design/icons';
import { achievementService, type Achievement } from '../services/achievementService';
import { resolveErrorMessage } from '../utils/errorMessage';

const { Title, Text, Paragraph } = Typography;

const FONT_FAMILY = '"Source Han Sans SC","PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif';

const colorByType: Record<string, string> = {
  foodie_master: '#f97316',
  photography_master: '#2563eb',
  exploration_pioneer: '#16a34a',
  social_master: '#7c3aed',
};

const typeLabelMap: Record<string, string> = {
  foodie_master: '美食成就',
  photography_master: '摄影成就',
  exploration_pioneer: '探索成就',
  social_master: '社交成就',
};

const parseErrorMessage = (error: unknown): string => {
  const status =
    typeof error === 'object' && error !== null && 'response' in error
      ? (error as { response?: { status?: number } }).response?.status
      : undefined;
  if (status === 404) {
    return '成就接口暂未就绪，请确认后端已经启动并加载最新路由。';
  }
  return resolveErrorMessage(error, '成就数据加载失败，请稍后重试。');
};

const AchievementComponent: React.FC = () => {
  const { message } = App.useApp();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const earnedCount = useMemo(() => achievements.filter((item) => item.isEarned).length, [achievements]);
  const totalCount = achievements.length;
  const completion = totalCount ? Math.round((earnedCount / totalCount) * 100) : 0;
  const inProgressCount = useMemo(
    () => achievements.filter((item) => !item.isEarned && item.progress > 0).length,
    [achievements],
  );

  const loadAchievements = async () => {
    setLoading(true);
    try {
      const response = await achievementService.getUserAchievements();
      if (response.success) {
        setAchievements(response.data || []);
        setError(null);
      }
    } catch (error: unknown) {
      console.error('加载成就失败:', error);
      setError(parseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAchievements();
  }, []);

  const handleCheckAchievements = async () => {
    setChecking(true);
    try {
      const response = await achievementService.checkAndUpdateAchievements();
      if (response.success && response.data.newAchievements.length > 0) {
        message.success(`本次解锁 ${response.data.newAchievements.length} 个新成就。`);
      } else {
        message.info('当前暂无可解锁的新成就。');
      }
      await loadAchievements();
    } catch (error: unknown) {
      console.error('检查成就失败:', error);
      setError(parseErrorMessage(error));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={{ fontFamily: FONT_FAMILY }}>
      <Card
        variant="borderless"
        style={{
          borderRadius: 20,
          marginBottom: 16,
          background:
            'linear-gradient(135deg, rgba(248,250,252,0.96) 0%, rgba(239,246,255,0.96) 50%, rgba(255,247,237,0.95) 100%)',
          boxShadow: '0 14px 30px rgba(15,23,42,0.08)',
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Space direction="vertical" size={6}>
              <Title level={3} style={{ margin: 0 }}>
                <TrophyOutlined style={{ marginRight: 8 }} />
                成就中心
              </Title>
              <Text type="secondary">系统会根据你的真实行为自动累计进度，并在关键节点解锁成就徽章。</Text>
            </Space>
          </Col>
          <Col xs={12} md={4}>
            <Statistic title="已解锁" value={earnedCount} suffix={`/ ${totalCount || 0}`} />
          </Col>
          <Col xs={12} md={4}>
            <Statistic title="完成度" value={completion} suffix="%" />
          </Col>
          <Col xs={12} md={3}>
            <Statistic title="进行中" value={inProgressCount} />
          </Col>
          <Col xs={12} md={3}>
            <Button type="primary" loading={checking} onClick={() => void handleCheckAchievements()} style={{ width: '100%' }}>
              检查成就
            </Button>
          </Col>
        </Row>
      </Card>

      {error ? <Alert type="error" showIcon style={{ marginBottom: 16, borderRadius: 12 }} message={error} /> : null}

      <Card
        variant="borderless"
        style={{
          borderRadius: 18,
          boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
          background: 'rgba(255,255,255,0.96)',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <LoadingOutlined style={{ fontSize: 42 }} />
            <Text style={{ display: 'block', marginTop: 12 }}>正在加载成就数据...</Text>
          </div>
        ) : achievements.length === 0 ? (
          <Empty description="当前暂无成就数据" />
        ) : (
          <Row gutter={[16, 16]}>
            {achievements.map((achievement) => {
              const color = colorByType[achievement.type] || '#64748b';
              const percent = achievement.target > 0 ? Math.round((achievement.progress / achievement.target) * 100) : 0;

              return (
                <Col key={achievement.id} xs={24} sm={12} lg={8} xl={6}>
                  <Card
                    variant="borderless"
                    hoverable
                    style={{
                      borderRadius: 14,
                      height: '100%',
                      border: `1px solid ${achievement.isEarned ? color : 'rgba(148,163,184,0.25)'}`,
                      boxShadow: achievement.isEarned
                        ? '0 10px 20px rgba(15,23,42,0.08)'
                        : '0 8px 16px rgba(15,23,42,0.04)',
                      background: achievement.isEarned
                        ? 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(248,250,252,0.92))'
                        : 'rgba(248,250,252,0.85)',
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      {achievement.isEarned ? (
                        <Badge count={<CheckCircleOutlined style={{ color: '#22c55e' }} />} offset={[-4, 6]} />
                      ) : null}

                      <div
                        style={{
                          fontSize: 44,
                          lineHeight: 1,
                          marginBottom: 12,
                          opacity: achievement.isEarned ? 1 : 0.55,
                        }}
                      >
                        {achievement.icon}
                      </div>

                      <Tag color={achievement.isEarned ? 'success' : 'default'} style={{ marginBottom: 10 }}>
                        {typeLabelMap[achievement.type] || '综合成就'}
                      </Tag>

                      <Title level={5} style={{ marginBottom: 8 }}>
                        {achievement.name}
                      </Title>

                      <Paragraph style={{ marginBottom: 14 }} type="secondary" ellipsis={{ rows: 2 }}>
                        {achievement.description}
                      </Paragraph>

                      <Progress
                        percent={Math.min(100, percent)}
                        strokeColor={color}
                        trailColor="rgba(148,163,184,0.18)"
                        style={{ marginBottom: 8 }}
                      />

                      <Text type="secondary">
                        {achievement.progress} / {achievement.target}
                      </Text>

                      {achievement.isEarned && achievement.earnedAt ? (
                        <Text style={{ display: 'block', marginTop: 8, color }}>
                          已于 {new Date(achievement.earnedAt).toLocaleDateString()} 解锁
                        </Text>
                      ) : (
                        <Text style={{ display: 'block', marginTop: 8 }} type="secondary">
                          继续完成旅途中的相关行为即可推进进度
                        </Text>
                      )}
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>
    </div>
  );
};

export default AchievementComponent;
