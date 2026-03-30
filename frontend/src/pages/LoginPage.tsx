import React, { useState } from 'react';
import { App, Button, Card, Col, Form, Input, Row, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import PremiumPageHero from '../components/PremiumPageHero';
import { useAppDispatch } from '../store';
import { login } from '../store/slices/userSlice';

const { Title, Text } = Typography;

interface LoginFormValues {
  username: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      await dispatch(login(values)).unwrap();
      message.success('登录成功，正在进入智能行程助手。');
      navigate('/journey', { replace: true });
    } catch {
      message.error('登录失败，请检查用户名和密码。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: 8 }}>
      <PremiumPageHero
        title="欢迎回来"
        description="登录后即可获得兴趣驱动的景点推荐、路线规划、室内外导航和完整的一日行程服务。"
        tags={['兴趣推荐', '智能行程', '室内外联动']}
        metrics={[
          { label: '服务入口', value: '统一登录' },
          { label: '推荐方式', value: '兴趣驱动' },
          { label: '行程能力', value: '自动排程' },
          { label: '导航场景', value: '室内 + 室外' },
        ]}
      />

      <Row align="middle" justify="center">
        <Col xs={24} sm={20} md={14} lg={10}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 20,
              boxShadow: '0 16px 36px rgba(15,23,42,0.08)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))',
            }}
          >
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Title level={3} style={{ margin: 0 }}>
                账号登录
              </Title>
              <Text type="secondary">输入账号后即可继续你的推荐、规划和导航流程。</Text>
            </Space>

            <Form<LoginFormValues> onFinish={handleSubmit} layout="vertical" style={{ marginTop: 18 }}>
              <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名。' }]}>
                <Input placeholder="请输入用户名" />
              </Form.Item>
              <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码。' }]}>
                <Input.Password placeholder="请输入密码" />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={loading} block size="large">
                  登录
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LoginPage;
