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

const AccountLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      await dispatch(login(values)).unwrap();
      message.success('登录成功，正在进入系统。');
      navigate('/journey', { replace: true });
    } catch (error) {
      message.error(typeof error === 'string' ? error : '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: 8 }}>
      <PremiumPageHero
        title="欢迎回来"
        description="使用你创建的用户名和密码登录，继续使用个性化旅游系统。"
        tags={['用户名登录', '大小写敏感', '账号设置']}
        metrics={[
          { label: '登录方式', value: '用户名 + 密码' },
          { label: '用户名规则', value: '英文开头' },
          { label: '密码规则', value: '至少 8 位' },
          { label: '账号维护', value: '已支持' },
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
              <Text type="secondary">请输入你注册时创建的用户名和密码。</Text>
            </Space>

            <Form<LoginFormValues> onFinish={handleSubmit} layout="vertical" style={{ marginTop: 18 }}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input placeholder="例如 TravelUser01" autoComplete="username" />
              </Form.Item>
              <Form.Item
                name="password"
                label="密码"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password placeholder="请输入密码" autoComplete="current-password" />
              </Form.Item>
              <Form.Item style={{ marginBottom: 12 }}>
                <Button type="primary" htmlType="submit" loading={loading} block size="large">
                  登录
                </Button>
              </Form.Item>
              <Button block onClick={() => navigate('/register')}>
                还没有账号？去注册
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AccountLoginPage;
