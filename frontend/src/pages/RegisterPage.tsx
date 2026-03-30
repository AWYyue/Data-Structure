import React, { useState } from 'react';
import { App, Button, Card, Col, Form, Input, Row, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import PremiumPageHero from '../components/PremiumPageHero';
import { useAppDispatch } from '../store';
import { register } from '../store/slices/userSlice';
import type { RegisterRequest } from '../types';

const { Title, Text } = Typography;

const RegisterPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: RegisterRequest) => {
    setLoading(true);
    try {
      await dispatch(register(values)).unwrap();
      message.success('注册成功，请登录并完善兴趣偏好。');
      navigate('/login', { replace: true });
    } catch {
      message.error('注册失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: 8 }}>
      <PremiumPageHero
        title="创建你的旅游账号"
        description="完成注册后，你可以保存兴趣偏好、生成专属推荐，并把游玩记录沉淀到日记、成就和社交模块。"
        accent="teal"
        tags={['个性化推荐', '游玩记录沉淀', '一站式旅游服务']}
        metrics={[
          { label: '注册后可用', value: '兴趣画像' },
          { label: '推荐能力', value: '专属推荐' },
          { label: '记录方式', value: '日记 + 成就' },
          { label: '服务链路', value: '完整打通' },
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
                新用户注册
              </Title>
              <Text type="secondary">注册完成后，系统会引导你选择兴趣偏好并进入智能行程流程。</Text>
            </Space>

            <Form<RegisterRequest> onFinish={handleSubmit} layout="vertical" style={{ marginTop: 18 }}>
              <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名。' }]}>
                <Input placeholder="请输入用户名" />
              </Form.Item>
              <Form.Item
                name="email"
                label="邮箱"
                rules={[
                  { required: true, message: '请输入邮箱。' },
                  { type: 'email', message: '邮箱格式不正确。' },
                ]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>
              <Form.Item
                name="password"
                label="密码"
                rules={[
                  { required: true, message: '请输入密码。' },
                  { min: 6, message: '密码至少 6 位。' },
                ]}
              >
                <Input.Password placeholder="请输入密码" />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={loading} block size="large">
                  注册
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RegisterPage;
