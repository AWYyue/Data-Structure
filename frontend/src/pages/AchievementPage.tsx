import React from 'react';
import { Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import PremiumPageHero from '../components/PremiumPageHero';
import AchievementComponent from '../components/AchievementComponent';

const AchievementPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 8, maxWidth: 1280, margin: '0 auto' }}>
      <PremiumPageHero
        title="成就系统"
        description="把美食、摄影、探索和社交行为沉淀成可视化成长轨迹，让用户在推荐、游览、打卡和分享之后，持续看到自己在整套旅游系统里的积累。"
        accent="amber"
        tags={['美食达人', '摄影达人', '探索先锋', '社交达人']}
        metrics={[
          { label: '成就主线', value: 4, suffix: '类' },
          { label: '联动阶段', value: '旅游前 / 中 / 后' },
          { label: '成长方式', value: '自动累计' },
          { label: '设计目标', value: '长期激励' },
        ]}
        actions={
          <Space wrap>
            <Button type="primary" onClick={() => navigate('/social')}>
              去社交互动
            </Button>
            <Button onClick={() => navigate('/diary')}>去写旅行日记</Button>
            <Button onClick={() => navigate('/query')}>回到景区查询</Button>
          </Space>
        }
      />

      <AchievementComponent />
    </div>
  );
};

export default AchievementPage;
