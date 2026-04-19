import React, { useState } from 'react';
import { App, Button, Card, Col, Form, Input, Row, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import PremiumPageHero from '../components/PremiumPageHero';
import { useAppDispatch } from '../store';
import { register } from '../store/slices/userSlice';

const { Title, Paragraph, Text } = Typography;

interface RegisterFormValues {
  username: string;
  password: string;
  confirmPassword: string;
}

const usernamePattern = /^[A-Za-z][A-Za-z0-9]*$/;

const AccountRegisterPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async ({ username, password }: RegisterFormValues) => {
    setLoading(true);
    try {
      await dispatch(register({ username, password })).unwrap();
      message.success('注册成功，请使用新账号登录。');
      navigate('/login', { replace: true });
    } catch (error) {
      message.error(typeof error === 'string' ? error : '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: 8 }}>
      <PremiumPageHero
        title="创建你的系统账号"
        description="注册成功后即可使用用户名登录，并在账号设置中维护基础信息。"
        accent="teal"
        tags={['自定义用户名', '10 个自注册账号', '基础信息维护']}
        metrics={[
          { label: '用户名组成', value: '英文 + 数字' },
          { label: '起始字符', value: '必须为英文' },
          { label: '密码长度', value: '至少 8 位' },
          { label: '大小写', value: '严格区分' },
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
              <Text type="secondary">用户名只能由英文和数字组成，且必须以英文开头。</Text>
            </Space>

            <Paragraph
              type="secondary"
              style={{
                marginTop: 14,
                marginBottom: 0,
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(15,23,42,0.04)',
              }}
            >
              示例用户名：`Travel01`、`Alice2026`
            </Paragraph>

            <Form<RegisterFormValues> onFinish={handleSubmit} layout="vertical" style={{ marginTop: 18 }}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  {
                    validator: async (_, value?: string) => {
                      if (!value) {
                        return;
                      }
                      if (!usernamePattern.test(value)) {
                        throw new Error('用户名必须以英文开头，且只能包含英文和数字');
                      }
                    },
                  },
                ]}
              >
                <Input placeholder="请输入英文开头的用户名" autoComplete="username" maxLength={20} />
              </Form.Item>
              <Form.Item
                name="password"
                label="密码"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 8, message: '密码至少需要 8 位' },
                ]}
              >
                <Input.Password placeholder="请输入至少 8 位密码" autoComplete="new-password" />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label="确认密码"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请再次输入密码' },
                  ({ getFieldValue }) => ({
                    validator: async (_, value?: string) => {
                      if (!value || getFieldValue('password') === value) {
                        return;
                      }
                      throw new Error('两次输入的密码不一致');
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="请再次输入密码" autoComplete="new-password" />
              </Form.Item>
              <Form.Item style={{ marginBottom: 12 }}>
                <Button type="primary" htmlType="submit" loading={loading} block size="large">
                  注册
                </Button>
              </Form.Item>
              <Button block onClick={() => navigate('/login')}>
                已有账号？去登录
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AccountRegisterPage;
