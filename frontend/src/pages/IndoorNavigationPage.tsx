import React from 'react';
import { Button, Card, Space, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import IndoorNavigationComponent from '../components/IndoorNavigationComponent';
import PremiumPageHero from '../components/PremiumPageHero';

const { Paragraph } = Typography;

const IndoorNavigationPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 8, maxWidth: 1280, margin: '0 auto' }}>
      <PremiumPageHero
        title="室内导航中心"
        description="这里对应课设原文档中的地图 C。系统支持入口到房间、房间到房间、跨楼层电梯三种室内导航模式，并把楼层地图、路径高亮和文字指引整合在同一页。"
        accent="teal"
        tags={['地图 C', '入口到房间', '房间到房间', '电梯换层']}
        metrics={[
          { label: '导航场景', value: 3, suffix: '类' },
          { label: '楼层视图', value: '可切换' },
          { label: '结果展示', value: '地图 + 步骤' },
          { label: '语音播报', value: '支持' },
        ]}
        actions={
          <Space wrap>
            <Button type="primary" onClick={() => navigate('/query')}>
              返回景区查询
            </Button>
            <Button onClick={() => navigate('/path-planning')}>返回户外导航</Button>
          </Space>
        }
      />

      <Card
        variant="borderless"
        style={{
          borderRadius: 20,
          marginBottom: 16,
          boxShadow: '0 14px 30px rgba(15,23,42,0.06)',
        }}
      >
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            室内导航不再是独立工具页，而是旅游中阶段的地图 C。当用户从景区详情、设施查询或行程执行进入建筑内部场景时，可以在这里继续完成细粒度路径规划。
          </Paragraph>
          <Space wrap>
            <Tag color="cyan">全中文交互</Tag>
            <Tag color="blue">多建筑切换</Tag>
            <Tag color="geekblue">楼层可视化</Tag>
            <Tag color="green">地图选点</Tag>
            <Tag color="purple">失败可恢复</Tag>
          </Space>
        </Space>
      </Card>

      <IndoorNavigationComponent />
    </div>
  );
};

export default IndoorNavigationPage;
