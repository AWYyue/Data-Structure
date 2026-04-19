import React, { useMemo, useState } from 'react';
import { App, Button, Card, Col, Descriptions, Form, Input, Row, Space, Statistic, Typography } from 'antd';
import { LogoutOutlined, SwapOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PremiumPageHero from '../components/PremiumPageHero';
import { useAppDispatch, useAppSelector } from '../store';
import { getCurrentUser, logout, updatePassword } from '../store/slices/userSlice';

const { Title, Text } = Typography;

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const formatDate = (value?: string) => {
  if (!value) {
    return '未记录';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('zh-CN', { hour12: false });
};

const ProfilePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const user = useAppSelector((state) => state.user.user);
  const isLoading = useAppSelector((state) => state.user.isLoading);
  const [form] = Form.useForm<PasswordFormValues>();
  const [saving, setSaving] = useState(false);

  const interestCount = useMemo(() => user?.interests?.length || 0, [user?.interests]);

  const handlePasswordSubmit = async (values: PasswordFormValues) => {
    setSaving(true);
    try {
      await dispatch(
        updatePassword({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      ).unwrap();
      await dispatch(getCurrentUser()).unwrap();
      message.success('密码修改成功');
      form.resetFields();
    } catch (error) {
      message.error(typeof error === 'string' ? error : '密码修改失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchAccount = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const handleLogoutOnly = () => {
    dispatch(logout());
    navigate('/', { replace: true });
  };

  return (
    <div style={{ padding: 8, maxWidth: 1320, margin: '0 auto' }}>
      <PremiumPageHero
        title="账号设置"
        description="查看当前账号信息，维护密码，并支持退出当前账号或切换到其他账号。"
        accent="teal"
        tags={['基础信息维护', '密码修改', '账号切换']}
        metrics={[
          { label: '当前账号', value: user?.username || '未登录' },
          { label: '兴趣数量', value: String(interestCount) },
          { label: '账号状态', value: user ? '已登录' : '未登录' },
          { label: '资料维护', value: '已支持' },
        ]}
        actions={
          <Space wrap>
            <Button icon={<SwapOutlined />} type="primary" onClick={handleSwitchAccount}>
              切换账号
            </Button>
            <Button icon={<LogoutOutlined />} onClick={handleLogoutOnly}>
              退出当前账号
            </Button>
          </Space>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 24,
              height: '100%',
              boxShadow: '0 16px 34px rgba(15,23,42,0.08)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))',
            }}
          >
            <Space direction="vertical" size={18} style={{ width: '100%' }}>
              <div>
                <Title level={3} style={{ marginBottom: 6 }}>
                  账号概览
                </Title>
                <Text type="secondary">当前阶段先维护用户名、密码和基础账号信息。</Text>
              </div>

              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Card size="small" style={{ borderRadius: 16, background: 'rgba(15,23,42,0.03)' }}>
                    <Statistic title="兴趣标签" value={interestCount} />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" style={{ borderRadius: 16, background: 'rgba(15,23,42,0.03)' }}>
                    <Statistic title="收藏数量" value={user?.favorites?.length || 0} />
                  </Card>
                </Col>
              </Row>

              <Descriptions
                column={1}
                size="small"
                labelStyle={{ width: 110, color: '#64748b' }}
                contentStyle={{ color: '#0f172a', fontWeight: 500 }}
              >
                <Descriptions.Item label="用户名">{user?.username || '未登录'}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{formatDate(user?.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="最近更新">{formatDate(user?.updatedAt)}</Descriptions.Item>
                <Descriptions.Item label="账号类型">自定义用户名账号</Descriptions.Item>
              </Descriptions>
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={14}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 24,
              boxShadow: '0 16px 34px rgba(15,23,42,0.08)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))',
            }}
          >
            <Space direction="vertical" size={14} style={{ width: '100%' }}>
              <div>
                <Title level={3} style={{ marginBottom: 6 }}>
                  修改密码
                </Title>
                <Text type="secondary">密码至少 8 位，可以包含数字、英文和符号。</Text>
              </div>

              <Form<PasswordFormValues> form={form} layout="vertical" onFinish={handlePasswordSubmit}>
                <Form.Item
                  name="currentPassword"
                  label="当前密码"
                  rules={[{ required: true, message: '请输入当前密码' }]}
                >
                  <Input.Password placeholder="请输入当前密码" autoComplete="current-password" />
                </Form.Item>
                <Form.Item
                  name="newPassword"
                  label="新密码"
                  rules={[
                    { required: true, message: '请输入新密码' },
                    { min: 8, message: '密码至少需要 8 位' },
                  ]}
                >
                  <Input.Password placeholder="请输入至少 8 位新密码" autoComplete="new-password" />
                </Form.Item>
                <Form.Item
                  name="confirmPassword"
                  label="确认新密码"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: '请再次输入新密码' },
                    ({ getFieldValue }) => ({
                      validator: async (_, value?: string) => {
                        if (!value || getFieldValue('newPassword') === value) {
                          return;
                        }
                        throw new Error('两次输入的新密码不一致');
                      },
                    }),
                  ]}
                >
                  <Input.Password placeholder="请再次输入新密码" autoComplete="new-password" />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button type="primary" htmlType="submit" loading={saving || isLoading} size="large">
                    保存新密码
                  </Button>
                </Form.Item>
              </Form>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProfilePage;
