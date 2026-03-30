import React from 'react';
import { Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import PremiumPageHero from '../components/PremiumPageHero';
import ReminderComponent from '../components/ReminderComponent';

const ReminderPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 8, maxWidth: 1280, margin: '0 auto' }}>
      <PremiumPageHero
        title="个性提醒中心"
        description="提醒不再是单独的信息角落，而是围绕游中体验服务你：美食、摄影、天气和拥挤度提醒会和景区浏览、路线规划、打卡分享一起工作。"
        tags={['美食提醒', '摄影提醒', '天气提醒', '拥挤提醒']}
        metrics={[
          { label: '提醒维度', value: 4, suffix: '类' },
          { label: '服务阶段', value: '旅游中' },
          { label: '偏好支持', value: '可配置' },
          { label: '设计目标', value: '少打扰更有效' },
        ]}
        actions={
          <Space wrap>
            <Button type="primary" onClick={() => navigate('/journey')}>
              回到智能行程
            </Button>
            <Button onClick={() => navigate('/path-planning')}>去做路径规划</Button>
          </Space>
        }
      />

      <ReminderComponent />
    </div>
  );
};

export default ReminderPage;
