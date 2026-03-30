import React, { useEffect, useMemo, useState } from 'react';
import {
  App,
  Badge,
  Button,
  Card,
  Empty,
  Form,
  List,
  Modal,
  Segmented,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
} from 'antd';
import {
  BellOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { reminderService } from '../services/reminderService';

const { Title, Text, Paragraph } = Typography;

const FONT_FAMILY = '"Source Han Sans SC","PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif';

interface Reminder {
  id: string;
  type: 'food' | 'photo' | 'weather' | 'crowd' | 'general';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  time: Date | string;
  isRead: boolean;
  data?: unknown;
}

interface UserPreferences {
  foodReminders: boolean;
  photoReminders: boolean;
  weatherReminders: boolean;
  crowdReminders: boolean;
  reminderFrequency: 'low' | 'medium' | 'high';
}

type ReminderFilter = 'all' | 'unread' | 'high';

const typeLabelMap: Record<Reminder['type'], string> = {
  food: '美食提醒',
  photo: '拍照提醒',
  weather: '天气提醒',
  crowd: '拥挤提醒',
  general: '通用提醒',
};

const typeAvatarMap: Record<Reminder['type'], string> = {
  food: '食',
  photo: '拍',
  weather: '天',
  crowd: '拥',
  general: '提',
};

const priorityLabelMap: Record<Reminder['priority'], string> = {
  low: '低优先级',
  medium: '中优先级',
  high: '高优先级',
};

const priorityColorMap: Record<Reminder['priority'], string> = {
  low: 'default',
  medium: 'blue',
  high: 'red',
};

const frequencyLabelMap: Record<UserPreferences['reminderFrequency'], string> = {
  high: '高频，每小时一次',
  medium: '标准，每 4 小时一次',
  low: '低频，每天一次',
};

const ReminderComponent: React.FC = () => {
  const { message } = App.useApp();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [filter, setFilter] = useState<ReminderFilter>('all');
  const [settingModalVisible, setSettingModalVisible] = useState(false);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    foodReminders: true,
    photoReminders: true,
    weatherReminders: true,
    crowdReminders: true,
    reminderFrequency: 'medium',
  });

  const unreadCount = useMemo(() => reminders.filter((item) => !item.isRead).length, [reminders]);
  const highPriorityCount = useMemo(() => reminders.filter((item) => item.priority === 'high').length, [reminders]);
  const activeTypes = useMemo(
    () =>
      [
        userPreferences.foodReminders ? '美食' : null,
        userPreferences.photoReminders ? '拍照' : null,
        userPreferences.weatherReminders ? '天气' : null,
        userPreferences.crowdReminders ? '拥挤' : null,
      ].filter((item): item is string => Boolean(item)),
    [userPreferences],
  );

  const filteredReminders = useMemo(() => {
    if (filter === 'unread') {
      return reminders.filter((item) => !item.isRead);
    }
    if (filter === 'high') {
      return reminders.filter((item) => item.priority === 'high');
    }
    return reminders;
  }, [filter, reminders]);

  const loadReminders = async () => {
    try {
      setLoading(true);
      const remindersData = await reminderService.getReminders();
      setReminders(remindersData);
    } catch (error) {
      console.error('加载提醒失败:', error);
      message.error('加载提醒失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const preferences = await reminderService.getUserPreferences();
      setUserPreferences({
        ...preferences,
        reminderFrequency:
          preferences.reminderFrequency === 'high'
            ? 'high'
            : preferences.reminderFrequency === 'low'
              ? 'low'
              : 'medium',
      });
    } catch (error) {
      console.error('加载用户提醒偏好失败:', error);
    }
  };

  useEffect(() => {
    void loadReminders();
    void loadUserPreferences();
  }, []);

  const handleMarkAsRead = async (reminderId: string) => {
    try {
      const success = await reminderService.markAsRead(reminderId);
      if (success) {
        setReminders((current) =>
          current.map((reminder) => (reminder.id === reminderId ? { ...reminder, isRead: true } : reminder)),
        );
        message.success('已标记为已读。');
      }
    } catch (error) {
      console.error('标记已读失败:', error);
      message.error('操作失败，请稍后重试。');
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    try {
      const success = await reminderService.deleteReminder(reminderId);
      if (success) {
        setReminders((current) => current.filter((reminder) => reminder.id !== reminderId));
        message.success('提醒已删除。');
      }
    } catch (error) {
      console.error('删除提醒失败:', error);
      message.error('删除失败，请稍后重试。');
    }
  };

  const handleUpdatePreferences = async (values: UserPreferences) => {
    try {
      setSavingPreferences(true);
      const success = await reminderService.updateUserPreferences(values);
      if (success) {
        setUserPreferences(values);
        setSettingModalVisible(false);
        message.success('提醒偏好已更新。');
      }
    } catch (error) {
      console.error('更新提醒偏好失败:', error);
      message.error('更新提醒偏好失败，请稍后重试。');
    } finally {
      setSavingPreferences(false);
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
            'linear-gradient(135deg, rgba(248,250,252,0.96) 0%, rgba(239,246,255,0.96) 48%, rgba(255,247,237,0.96) 100%)',
          boxShadow: '0 14px 30px rgba(15,23,42,0.08)',
        }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space direction="vertical" size={2}>
              <Title level={3} style={{ margin: 0 }}>
                <BellOutlined style={{ marginRight: 8 }} />
                个性化提醒中心
              </Title>
              <Text type="secondary">根据你当前的位置、天气和兴趣偏好，持续推送旅途中真正有用的信息。</Text>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => void loadReminders()} loading={loading}>
                刷新
              </Button>
              <Button icon={<SettingOutlined />} type="primary" onClick={() => setSettingModalVisible(true)}>
                偏好设置
              </Button>
            </Space>
          </Space>

          <Space wrap>
            <Tag color="blue">提醒总数 {reminders.length}</Tag>
            <Tag color="gold">未读 {unreadCount}</Tag>
            <Tag color="red">高优先级 {highPriorityCount}</Tag>
            <Tag color="cyan">频率：{frequencyLabelMap[userPreferences.reminderFrequency]}</Tag>
          </Space>

          <Text type="secondary">
            当前开启类型：{activeTypes.length > 0 ? activeTypes.join('、') : '暂无'}
          </Text>
        </Space>
      </Card>

      <Card variant="borderless" style={{ borderRadius: 18, boxShadow: '0 10px 24px rgba(15,23,42,0.06)' }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Segmented
            value={filter}
            onChange={(value) => setFilter(value as ReminderFilter)}
            options={[
              { label: '全部提醒', value: 'all' },
              { label: '仅看未读', value: 'unread' },
              { label: '高优先级', value: 'high' },
            ]}
          />

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <Spin />
            </div>
          ) : filteredReminders.length === 0 ? (
            <Empty description="当前筛选条件下暂无提醒" />
          ) : (
            <List
              dataSource={filteredReminders}
              renderItem={(reminder) => (
                <List.Item
                  key={reminder.id}
                  style={{
                    borderRadius: 14,
                    padding: '14px 16px',
                    marginBottom: 12,
                    background: reminder.isRead ? 'rgba(248,250,252,0.82)' : 'rgba(239,246,255,0.86)',
                    border: `1px solid ${reminder.isRead ? 'rgba(148,163,184,0.2)' : 'rgba(37,99,235,0.26)'}`,
                  }}
                  actions={[
                    <Button
                      key="read"
                      type="link"
                      icon={<CheckCircleOutlined />}
                      disabled={reminder.isRead}
                      onClick={() => void handleMarkAsRead(reminder.id)}
                    >
                      标记已读
                    </Button>,
                    <Button
                      key="delete"
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => void handleDeleteReminder(reminder.id)}
                    >
                      删除
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge dot={!reminder.isRead} offset={[10, 0]}>
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 21,
                            background: reminder.isRead
                              ? 'linear-gradient(140deg, rgba(226,232,240,0.6), rgba(241,245,249,0.7))'
                              : 'linear-gradient(140deg, rgba(59,130,246,0.22), rgba(14,165,233,0.18))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                            color: '#0f172a',
                            fontWeight: 700,
                          }}
                        >
                          {typeAvatarMap[reminder.type]}
                        </div>
                      </Badge>
                    }
                    title={
                      <Space wrap size={8}>
                        <Text strong>{reminder.title}</Text>
                        <Tag color="geekblue">{typeLabelMap[reminder.type]}</Tag>
                        <Tag color={priorityColorMap[reminder.priority]}>{priorityLabelMap[reminder.priority]}</Tag>
                        <Text type="secondary">{new Date(reminder.time).toLocaleString()}</Text>
                      </Space>
                    }
                    description={
                      <Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 2 }}>
                        {reminder.message}
                      </Paragraph>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Space>
      </Card>

      <Modal
        title="提醒偏好设置"
        open={settingModalVisible}
        onCancel={() => setSettingModalVisible(false)}
        footer={null}
        destroyOnHidden
      >
        <Form<UserPreferences>
          layout="vertical"
          initialValues={userPreferences}
          onFinish={(values) => void handleUpdatePreferences(values)}
          key={`${userPreferences.foodReminders}-${userPreferences.photoReminders}-${userPreferences.weatherReminders}-${userPreferences.crowdReminders}-${userPreferences.reminderFrequency}`}
        >
          <Form.Item label="美食提醒" name="foodReminders" valuePropName="checked">
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
          <Form.Item label="拍照提醒" name="photoReminders" valuePropName="checked">
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
          <Form.Item label="天气提醒" name="weatherReminders" valuePropName="checked">
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
          <Form.Item label="拥挤提醒" name="crowdReminders" valuePropName="checked">
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
          <Form.Item
            name="reminderFrequency"
            label="提醒频率"
            rules={[{ required: true, message: '请选择提醒频率。' }]}
          >
            <Select
              options={[
                { value: 'high', label: '高频，每小时一次' },
                { value: 'medium', label: '标准，每 4 小时一次' },
                { value: 'low', label: '低频，每天一次' },
              ]}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={savingPreferences}>
            保存偏好设置
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default ReminderComponent;
