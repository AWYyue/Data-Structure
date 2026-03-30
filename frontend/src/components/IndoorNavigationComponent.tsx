import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Steps,
  Tag,
  Typography,
} from 'antd';
import indoorNavigationService, {
  IndoorBuildingSummary,
  IndoorLocation,
  IndoorPathResult,
  IndoorRoom,
  IndoorStructure,
} from '../services/indoorNavigationService';
import { resolveErrorMessage } from '../utils/errorMessage';
import IndoorMapComponent from './IndoorMapComponent';

const { Title, Text, Paragraph } = Typography;

type NavigationScene = 'entrance_to_room' | 'room_to_room' | 'elevator_transfer';

type IndoorFormValues = {
  scene: NavigationScene;
  entranceId?: string;
  targetFloor?: number;
  targetRoomId?: string;
  startRoomId?: string;
  endRoomId?: string;
  elevatorId?: string;
  fromFloor?: number;
  toFloor?: number;
};

const sceneLabelMap: Record<NavigationScene, string> = {
  entrance_to_room: '入口到房间',
  room_to_room: '房间到房间',
  elevator_transfer: '跨楼层电梯导航',
};

const sceneDescriptionMap: Record<NavigationScene, string> = {
  entrance_to_room: '适合从建筑入口快速前往服务台、展厅、会议室等目标房间。',
  room_to_room: '适合已经在楼内时，从当前房间切换到另一个房间。',
  elevator_transfer: '适合需要跨楼层移动时，优先规划到合适的电梯并完成换层。',
};

const roomLabel = (room: IndoorRoom) => `${room.number} · ${room.name}（${room.location.floor} 层）`;
const floorLabel = (floor: number) => `${floor} 层`;

const panelStyle: React.CSSProperties = {
  borderRadius: 18,
  background: '#ffffff',
};

const statCardStyle: React.CSSProperties = {
  borderRadius: 14,
  background: 'linear-gradient(180deg, #f8fbff 0%, #f3f7fb 100%)',
};

const IndoorNavigationComponent: React.FC = () => {
  const [form] = Form.useForm<IndoorFormValues>();

  const [buildings, setBuildings] = useState<IndoorBuildingSummary[]>([]);
  const [activeBuildingId, setActiveBuildingId] = useState('');
  const [building, setBuilding] = useState<IndoorStructure | null>(null);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingBuildingDetails, setLoadingBuildingDetails] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IndoorPathResult | null>(null);
  const [startLocation, setStartLocation] = useState<IndoorLocation | null>(null);
  const [endLocation, setEndLocation] = useState<IndoorLocation | null>(null);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [mapSelectionHint, setMapSelectionHint] = useState(
    '你可以直接在右侧楼层图上点击入口、房间或电梯，快速完成选点。',
  );
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [activeInstructionIndex, setActiveInstructionIndex] = useState(0);

  const scene = Form.useWatch('scene', form) ?? 'entrance_to_room';
  const targetFloor = Form.useWatch('targetFloor', form);
  const selectedEntranceId = Form.useWatch('entranceId', form);
  const selectedTargetRoomId = Form.useWatch('targetRoomId', form);
  const selectedStartRoomId = Form.useWatch('startRoomId', form);
  const selectedEndRoomId = Form.useWatch('endRoomId', form);
  const selectedElevatorId = Form.useWatch('elevatorId', form);

  const allRooms = useMemo(() => {
    if (!building) {
      return [];
    }
    return building.floors.flatMap((floor) => floor.rooms);
  }, [building]);

  const floorOptions = useMemo(
    () =>
      (building?.floors || []).map((item) => ({
        value: item.number,
        label: floorLabel(item.number),
      })),
    [building],
  );

  const targetFloorRooms = useMemo(() => {
    if (!targetFloor) {
      return allRooms;
    }
    return allRooms.filter((room) => room.location.floor === targetFloor);
  }, [allRooms, targetFloor]);

  const selectedPointIds = useMemo(
    () =>
      [
        selectedEntranceId,
        selectedTargetRoomId,
        selectedStartRoomId,
        selectedEndRoomId,
        selectedElevatorId,
      ].filter((id): id is string => Boolean(id)),
    [selectedElevatorId, selectedEndRoomId, selectedEntranceId, selectedStartRoomId, selectedTargetRoomId],
  );

  const currentInstruction = result?.instructions?.[activeInstructionIndex] || '';
  const buildingMetrics = useMemo(
    () => ({
      floorCount: building?.floors.length || 0,
      roomCount: allRooms.length,
      entranceCount: building?.entrances.length || 0,
      elevatorCount: building?.elevators.length || 0,
    }),
    [allRooms.length, building],
  );

  const loadBuildings = async () => {
    try {
      setLoadingBuildings(true);
      setError(null);
      const list = await indoorNavigationService.getBuildings();
      setBuildings(list);
      if (list.length > 0) {
        setActiveBuildingId((current) => current || list[0].id);
      } else {
        setActiveBuildingId('');
      }
    } catch (error: unknown) {
      setError(resolveErrorMessage(error, '加载建筑列表失败，请稍后重试。'));
    } finally {
      setLoadingBuildings(false);
    }
  };

  const loadBuildingDetails = async (buildingId: string) => {
    try {
      setLoadingBuildingDetails(true);
      setError(null);
      const details = await indoorNavigationService.getBuildingDetails(buildingId);
      setBuilding(details);
      setCurrentFloor(details.floors[0]?.number ?? 1);
      setResult(null);
      setStartLocation(null);
      setEndLocation(null);
      setActiveInstructionIndex(0);
      form.resetFields();
      form.setFieldsValue({ scene: 'entrance_to_room' });
    } catch (error: unknown) {
      setBuilding(null);
      setError(resolveErrorMessage(error, '加载建筑详情失败，请稍后重试。'));
    } finally {
      setLoadingBuildingDetails(false);
    }
  };

  useEffect(() => {
    void loadBuildings();
  }, []);

  useEffect(() => {
    if (!activeBuildingId) {
      return;
    }
    void loadBuildingDetails(activeBuildingId);
  }, [activeBuildingId]);

  useEffect(() => {
    if (scene === 'entrance_to_room') {
      setMapSelectionHint('入口到房间模式：先点入口，再点目标房间，适合游客寻找服务点或具体房间。');
      return;
    }
    if (scene === 'room_to_room') {
      setMapSelectionHint('房间到房间模式：先点起点房间，再点终点房间，适合同楼层或楼内切换。');
      return;
    }
    setMapSelectionHint('跨楼层电梯模式：先点电梯，再确认起始楼层和目标楼层。');
  }, [scene]);

  useEffect(() => {
    setActiveInstructionIndex(0);
  }, [result?.instructions]);

  useEffect(() => {
    if (!voiceEnabled || !currentInstruction || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(`当前室内导航第 ${activeInstructionIndex + 1} 步，${currentInstruction}`);
    utterance.lang = 'zh-CN';
    utterance.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [activeInstructionIndex, currentInstruction, voiceEnabled]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const resetCurrentSelection = () => {
    const currentScene = (form.getFieldValue('scene') as NavigationScene) || 'entrance_to_room';
    form.resetFields();
    form.setFieldsValue({ scene: currentScene });
    setResult(null);
    setStartLocation(null);
    setEndLocation(null);
    setActiveInstructionIndex(0);
    setError(null);
  };

  const handleMapPointSelect = (point: { id: string; name: string; type: 'room' | 'entrance' | 'elevator'; floor: number }) => {
    if (!building) {
      return;
    }

    const currentScene = ((form.getFieldValue('scene') as NavigationScene) || 'entrance_to_room') as NavigationScene;
    setCurrentFloor(point.floor);

    if (currentScene === 'entrance_to_room') {
      if (point.type === 'entrance') {
        form.setFieldsValue({ entranceId: point.id });
        setMapSelectionHint(`已选择起点入口：${point.name}。请继续选择目标房间。`);
        return;
      }
      if (point.type === 'room') {
        form.setFieldsValue({ targetRoomId: point.id, targetFloor: point.floor });
        setMapSelectionHint(`已选择目标房间：${point.name}。现在可以直接生成室内路线。`);
        return;
      }
      setMapSelectionHint('入口到房间模式下，请选择入口或目标房间。');
      return;
    }

    if (currentScene === 'room_to_room') {
      if (point.type !== 'room') {
        setMapSelectionHint('房间到房间模式下，请直接点击房间。');
        return;
      }

      const startRoomId = form.getFieldValue('startRoomId') as string | undefined;
      const endRoomId = form.getFieldValue('endRoomId') as string | undefined;

      if (!startRoomId || (startRoomId && endRoomId)) {
        form.setFieldsValue({ startRoomId: point.id, endRoomId: undefined });
        setMapSelectionHint(`已设置起点房间：${point.name}。请继续选择终点房间。`);
      } else if (startRoomId === point.id) {
        setMapSelectionHint('起点和终点不能是同一个房间，请重新选择终点。');
      } else {
        form.setFieldsValue({ endRoomId: point.id });
        setMapSelectionHint(`已设置终点房间：${point.name}。现在可以生成导航路线。`);
      }
      return;
    }

    if (point.type !== 'elevator') {
      setMapSelectionHint('跨楼层电梯模式下，请先点击电梯。');
      return;
    }

    const elevator = building.elevators.find((item) => item.id === point.id);
    const fromFloor = (form.getFieldValue('fromFloor') as number | undefined) ?? point.floor;
    let toFloor = form.getFieldValue('toFloor') as number | undefined;

    if (!toFloor || toFloor === fromFloor) {
      toFloor = elevator?.floors.find((floor) => floor !== fromFloor);
    }

    form.setFieldsValue({
      elevatorId: point.id,
      fromFloor,
      toFloor,
    });
    setMapSelectionHint(`已选择电梯：${point.name}。请确认起始楼层和目标楼层。`);
  };

  const handlePlan = async (values: IndoorFormValues) => {
    if (!building) {
      return;
    }

    setPlanning(true);
    setError(null);

    try {
      let start: IndoorLocation | null = null;
      let end: IndoorLocation | null = null;

      if (values.scene === 'entrance_to_room') {
        const entrance = building.entrances.find((item) => item.id === values.entranceId);
        const targetRoom = allRooms.find((item) => item.id === values.targetRoomId);
        if (!entrance || !targetRoom) {
          throw new Error('请选择有效的入口和目标房间。');
        }
        start = entrance.location;
        end = targetRoom.location;
      }

      if (values.scene === 'room_to_room') {
        const startRoom = allRooms.find((item) => item.id === values.startRoomId);
        const endRoom = allRooms.find((item) => item.id === values.endRoomId);
        if (!startRoom || !endRoom) {
          throw new Error('请选择有效的起点房间和终点房间。');
        }
        if (startRoom.id === endRoom.id) {
          throw new Error('起点和终点不能是同一个房间。');
        }
        start = startRoom.location;
        end = endRoom.location;
      }

      if (values.scene === 'elevator_transfer') {
        const elevator = building.elevators.find((item) => item.id === values.elevatorId);
        if (!elevator || values.fromFloor === undefined || values.toFloor === undefined) {
          throw new Error('请选择电梯以及起始楼层、目标楼层。');
        }
        if (values.fromFloor === values.toFloor) {
          throw new Error('起始楼层和目标楼层不能相同。');
        }
        start = { floor: values.fromFloor, x: elevator.location.x, y: elevator.location.y };
        end = { floor: values.toFloor, x: elevator.location.x, y: elevator.location.y };
      }

      if (!start || !end) {
        throw new Error('导航参数不完整，请检查后重试。');
      }

      const planned = await indoorNavigationService.navigateIndoor(building.buildingId, start, end);
      setResult(planned);
      setStartLocation(start);
      setEndLocation(end);
      setCurrentFloor(start.floor);
      setMapSelectionHint('已生成室内导航路线。你可以切换楼层查看路径，并逐步查看每一步指引。');
    } catch (error: unknown) {
      setError(resolveErrorMessage(error, '室内导航计算失败，请稍后重试。'));
    } finally {
      setPlanning(false);
    }
  };

  const retryCurrentLoad = () => {
    if (activeBuildingId) {
      void loadBuildingDetails(activeBuildingId);
      return;
    }
    void loadBuildings();
  };

  return (
    <Card
      variant="borderless"
      style={{
        borderRadius: 20,
        background:
          'linear-gradient(150deg, rgba(248,250,252,0.96), rgba(241,245,249,0.88)), radial-gradient(900px 320px at 100% 0%, rgba(14,116,144,0.12), transparent 58%)',
      }}
    >
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>
            室内导航
          </Title>
          <Text type="secondary">支持入口到房间、房间到房间和跨楼层电梯三种模式，并可直接在楼层图上点击选点。</Text>
        </div>

        <Alert
          type="info"
          showIcon
          message={`当前模式：${sceneLabelMap[scene]}`}
          description={sceneDescriptionMap[scene]}
        />

        {error ? (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={retryCurrentLoad}>
                重新加载
              </Button>
            }
          />
        ) : null}

        {loadingBuildings && !buildings.length ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : null}

        {!loadingBuildings && !buildings.length ? (
          <Empty
            description="当前没有可用的室内建筑数据。"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => void loadBuildings()}>
              重新获取建筑列表
            </Button>
          </Empty>
        ) : null}

        {building ? (
          <Row gutter={[18, 18]}>
            <Col xs={24} lg={10}>
              <Card variant="borderless" style={panelStyle}>
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                  <Row gutter={[10, 10]}>
                    <Col span={12}>
                      <Card variant="borderless" style={statCardStyle}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          建筑楼层
                        </Text>
                        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{buildingMetrics.floorCount}</div>
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card variant="borderless" style={statCardStyle}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          房间数量
                        </Text>
                        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{buildingMetrics.roomCount}</div>
                      </Card>
                    </Col>
                  </Row>

                  <Alert
                    type="success"
                    showIcon
                    message={`当前建筑：${building.name}`}
                    description="建议优先在地图上点击选点，再用表单微调起终点和楼层。"
                  />

                  <Form<IndoorFormValues>
                    form={form}
                    layout="vertical"
                    initialValues={{ scene: 'entrance_to_room' }}
                    onFinish={(values) => void handlePlan(values)}
                  >
                    <Form.Item label="选择建筑">
                      <Select
                        value={activeBuildingId}
                        onChange={setActiveBuildingId}
                        loading={loadingBuildings}
                        options={buildings.map((item) => ({ value: item.id, label: item.name }))}
                      />
                    </Form.Item>

                    <Form.Item
                      name="scene"
                      label="导航模式"
                      rules={[{ required: true, message: '请选择导航模式。' }]}
                    >
                      <Select
                        options={Object.entries(sceneLabelMap).map(([value, label]) => ({
                          value,
                          label,
                        }))}
                      />
                    </Form.Item>

                    <Form.Item noStyle dependencies={['scene', 'targetFloor']}>
                      {({ getFieldValue }) => {
                        const currentScene = getFieldValue('scene') as NavigationScene;

                        if (currentScene === 'entrance_to_room') {
                          return (
                            <>
                              <Form.Item
                                name="entranceId"
                                label="起点入口"
                                rules={[{ required: true, message: '请选择起点入口。' }]}
                              >
                                <Select options={building.entrances.map((item) => ({ value: item.id, label: item.name }))} />
                              </Form.Item>

                              <Form.Item name="targetFloor" label="目标楼层（快速筛选）">
                                <Select
                                  allowClear
                                  placeholder="不选择则展示全部楼层房间"
                                  options={floorOptions}
                                  onChange={(value) => {
                                    const roomId = form.getFieldValue('targetRoomId') as string | undefined;
                                    if (!roomId) {
                                      return;
                                    }
                                    const selectedRoom = allRooms.find((item) => item.id === roomId);
                                    if (selectedRoom && value && selectedRoom.location.floor !== value) {
                                      form.setFieldsValue({ targetRoomId: undefined });
                                    }
                                  }}
                                />
                              </Form.Item>

                              <Form.Item
                                name="targetRoomId"
                                label="目标房间"
                                rules={[{ required: true, message: '请选择目标房间。' }]}
                              >
                                <Select
                                  options={targetFloorRooms.map((item) => ({
                                    value: item.id,
                                    label: roomLabel(item),
                                  }))}
                                  showSearch
                                  optionFilterProp="label"
                                />
                              </Form.Item>
                            </>
                          );
                        }

                        if (currentScene === 'room_to_room') {
                          return (
                            <>
                              <Form.Item
                                name="startRoomId"
                                label="起点房间"
                                rules={[{ required: true, message: '请选择起点房间。' }]}
                              >
                                <Select
                                  options={allRooms.map((item) => ({ value: item.id, label: roomLabel(item) }))}
                                  showSearch
                                  optionFilterProp="label"
                                />
                              </Form.Item>

                              <Form.Item
                                name="endRoomId"
                                label="终点房间"
                                rules={[{ required: true, message: '请选择终点房间。' }]}
                              >
                                <Select
                                  options={allRooms.map((item) => ({ value: item.id, label: roomLabel(item) }))}
                                  showSearch
                                  optionFilterProp="label"
                                />
                              </Form.Item>
                            </>
                          );
                        }

                        return (
                          <>
                            <Form.Item
                              name="elevatorId"
                              label="电梯"
                              rules={[{ required: true, message: '请选择电梯。' }]}
                            >
                              <Select options={building.elevators.map((item) => ({ value: item.id, label: item.name }))} />
                            </Form.Item>

                            <Form.Item
                              name="fromFloor"
                              label="起始楼层"
                              rules={[{ required: true, message: '请选择起始楼层。' }]}
                            >
                              <Select options={floorOptions} />
                            </Form.Item>

                            <Form.Item
                              name="toFloor"
                              label="目标楼层"
                              rules={[{ required: true, message: '请选择目标楼层。' }]}
                            >
                              <Select options={floorOptions} />
                            </Form.Item>
                          </>
                        );
                      }}
                    </Form.Item>

                    <Space wrap>
                      <Button block={false} type="primary" htmlType="submit" loading={planning}>
                        生成导航路线
                      </Button>
                      <Button onClick={resetCurrentSelection}>重置选点</Button>
                    </Space>
                  </Form>
                </Space>
              </Card>

              {result ? (
                <Card
                  variant="borderless"
                  style={{ marginTop: 14, borderRadius: 16, background: 'linear-gradient(180deg,#f8fbff,#eef2ff)' }}
                >
                  <Row gutter={12}>
                    <Col span={12}>
                      <Statistic title="总距离" value={result.distance.toFixed(1)} suffix="米" />
                    </Col>
                    <Col span={12}>
                      <Statistic title="预计耗时" value={result.estimatedTime.toFixed(1)} suffix="分钟" />
                    </Col>
                  </Row>

                  <div style={{ marginTop: 10 }}>
                    <Tag color="blue">{sceneLabelMap[scene]}</Tag>
                    {result.usedElevatorId ? <Tag color="volcano">已使用电梯：{result.usedElevatorId}</Tag> : <Tag color="green">同层路线</Tag>}
                  </div>

                  {result.instructions.length > 0 ? (
                    <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 12 }}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Text>导航进度</Text>
                        <Text type="secondary">
                          第 {activeInstructionIndex + 1} / {result.instructions.length} 步
                        </Text>
                      </Space>

                      <Progress
                        percent={Number((((activeInstructionIndex + 1) / result.instructions.length) * 100).toFixed(0))}
                        showInfo={false}
                      />

                      <Space wrap>
                        <Button onClick={() => setActiveInstructionIndex((current) => Math.max(0, current - 1))} disabled={activeInstructionIndex <= 0}>
                          上一步
                        </Button>
                        <Button
                          onClick={() =>
                            setActiveInstructionIndex((current) => Math.min(result.instructions.length - 1, current + 1))
                          }
                          disabled={activeInstructionIndex >= result.instructions.length - 1}
                        >
                          下一步
                        </Button>
                        <Select
                          value={voiceEnabled ? 'on' : 'off'}
                          onChange={(value) => setVoiceEnabled(value === 'on')}
                          style={{ width: 148 }}
                          options={[
                            { value: 'off', label: '语音播报关闭' },
                            { value: 'on', label: '语音播报开启' },
                          ]}
                        />
                      </Space>

                      <Alert type="info" showIcon message={currentInstruction} />
                    </Space>
                  ) : null}

                  <div style={{ marginTop: 12 }}>
                    <Steps
                      size="small"
                      direction="vertical"
                      current={result.instructions.length > 0 ? activeInstructionIndex : undefined}
                      items={result.instructions.map((item) => ({ title: item }))}
                    />
                  </div>
                </Card>
              ) : (
                <Card variant="borderless" style={{ marginTop: 14, borderRadius: 16, background: '#f8fafc' }}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="还没有生成室内路线。先在地图或表单中选好起点和终点，再生成导航。"
                  />
                </Card>
              )}
            </Col>

            <Col xs={24} lg={14}>
              <Card variant="borderless" style={panelStyle}>
                <Row align="middle" justify="space-between" style={{ marginBottom: 10 }}>
                  <Title level={5} style={{ margin: 0 }}>
                    楼层地图
                  </Title>
                  <Select style={{ width: 140 }} value={currentFloor} onChange={setCurrentFloor} options={floorOptions} />
                </Row>

                <Alert
                  type={result ? 'success' : 'info'}
                  showIcon
                  style={{ marginBottom: 10 }}
                  message={mapSelectionHint}
                />

                {loadingBuildingDetails && !building ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <Spin size="large" />
                  </div>
                ) : (
                  <IndoorMapComponent
                    building={building}
                    currentFloor={currentFloor}
                    path={result?.path || []}
                    startLocation={startLocation}
                    endLocation={endLocation}
                    selectedPointIds={selectedPointIds}
                    onPointSelect={handleMapPointSelect}
                  />
                )}

                <Space wrap size={8} style={{ marginTop: 12 }}>
                  <Tag color="green">绿色：入口</Tag>
                  <Tag color="red">红色：电梯</Tag>
                  <Tag color="blue">蓝色：房间</Tag>
                  <Tag color="geekblue">蓝线：规划路线</Tag>
                  <Tag color="gold">高亮点：起点 / 终点</Tag>
                </Space>

                <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
                  小提示：如果你是第一次使用，建议优先选择“入口到房间”模式，再直接在楼层图上点击入口和目标房间，体验会更直观。
                </Paragraph>
              </Card>
            </Col>
          </Row>
        ) : null}
      </Space>
    </Card>
  );
};

export default IndoorNavigationComponent;
