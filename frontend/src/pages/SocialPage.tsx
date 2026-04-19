import React from 'react';
import { Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import PremiumPageHero from '../components/PremiumPageHero';
import SocialComponent from '../components/SocialComponent';

const SocialPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 8, maxWidth: 1280, margin: '0 auto' }}>
      <PremiumPageHero
        title="社交互动中心"
        description="把实时热点、附近游客、组队游览和签到打卡整合进旅游主流程里，让推荐、游览、分享和互动形成闭环，而不是分散的孤立功能。"
        accent="teal"
        tags={['实时热点', '附近游客', '组队游览', '签到打卡']}
        metrics={[
          { label: '互动形态', value: 4, suffix: '类' },
          { label: '主流程位置', value: '旅游中 / 后' },
          { label: '联动对象', value: '景区 / 日记' },
          { label: '体验目标', value: '边游边分享' },
        ]}
        actions={
          <Space wrap>
            <Button type="primary" onClick={() => navigate('/query')}>
              回到景区查询
            </Button>
            <Button onClick={() => navigate('/diary')}>去看旅行日记</Button>
          </Space>
        }
      />

      <SocialComponent />
    </div>
  );
};

export default SocialPage;
