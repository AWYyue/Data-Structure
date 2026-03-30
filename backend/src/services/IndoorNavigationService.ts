interface IndoorLocation {
  floor: number;
  x: number;
  y: number;
}

interface IndoorPathPoint extends IndoorLocation {
  type: 'start' | 'end' | 'entrance' | 'elevator' | 'corner';
  label?: string;
}

interface IndoorPathResult {
  instructions: string[];
  distance: number;
  estimatedTime: number;
  path: IndoorPathPoint[];
  usedElevatorId?: string | null;
}

interface IndoorBuildingSummary {
  id: string;
  name: string;
}

interface IndoorEntrance {
  id: string;
  name: string;
  location: IndoorLocation;
  connectedElevators: string[];
}

interface IndoorElevator {
  id: string;
  name: string;
  location: IndoorLocation;
  floors: number[];
  averageWaitTime: number;
}

interface IndoorRoom {
  id: string;
  number: string;
  name: string;
  type: string;
  location: IndoorLocation;
}

interface IndoorFloor {
  number: number;
  width: number;
  height: number;
  rooms: IndoorRoom[];
}

interface IndoorStructure {
  buildingId: string;
  name: string;
  entrances: IndoorEntrance[];
  elevators: IndoorElevator[];
  floors: IndoorFloor[];
}

type CrossFloorInstructionInput = {
  elevatorName: string;
  startFloor: number;
  endFloor: number;
  startPath: IndoorPathPoint[];
  endPath: IndoorPathPoint[];
  waitSeconds: number;
  elevatorTravelSeconds: number;
};

export class IndoorNavigationService {
  private readonly indoorStructures = new Map<string, IndoorStructure>();
  private readonly walkingSpeedMetersPerMinute = 78;
  private readonly elevatorSecondsPerFloor = 12;

  async initializeIndoorStructures(): Promise<void> {
    if (this.indoorStructures.size > 0) {
      return;
    }

    this.indoorStructures.set('building1', {
      buildingId: 'building1',
      name: '行政楼',
      entrances: [
        {
          id: 'entrance-main',
          name: '主入口',
          location: { floor: 1, x: 10, y: 45 },
          connectedElevators: ['elevator-a', 'elevator-b'],
        },
        {
          id: 'entrance-east',
          name: '东侧入口',
          location: { floor: 1, x: 110, y: 45 },
          connectedElevators: ['elevator-b'],
        },
      ],
      elevators: [
        {
          id: 'elevator-a',
          name: 'A 梯',
          location: { floor: 1, x: 45, y: 45 },
          floors: [1, 2, 3, 4, 5],
          averageWaitTime: 25,
        },
        {
          id: 'elevator-b',
          name: 'B 梯',
          location: { floor: 1, x: 75, y: 45 },
          floors: [1, 2, 3, 4, 5],
          averageWaitTime: 20,
        },
      ],
      floors: [
        {
          number: 1,
          width: 120,
          height: 90,
          rooms: [
            { id: 'a-101', number: '101', name: '大厅', type: 'hall', location: { floor: 1, x: 22, y: 18 } },
            { id: 'a-102', number: '102', name: '接待室', type: 'reception', location: { floor: 1, x: 22, y: 72 } },
            { id: 'a-103', number: '103', name: '安保室', type: 'office', location: { floor: 1, x: 98, y: 72 } },
            { id: 'a-104', number: '104', name: '财务室', type: 'office', location: { floor: 1, x: 98, y: 18 } },
          ],
        },
        {
          number: 2,
          width: 120,
          height: 90,
          rooms: [
            { id: 'a-201', number: '201', name: '会议室 A', type: 'meeting', location: { floor: 2, x: 18, y: 18 } },
            { id: 'a-202', number: '202', name: '会议室 B', type: 'meeting', location: { floor: 2, x: 18, y: 72 } },
            { id: 'a-203', number: '203', name: '办公室 1', type: 'office', location: { floor: 2, x: 100, y: 18 } },
            { id: 'a-204', number: '204', name: '办公室 2', type: 'office', location: { floor: 2, x: 100, y: 72 } },
          ],
        },
        {
          number: 3,
          width: 120,
          height: 90,
          rooms: [
            { id: 'a-301', number: '301', name: '档案室', type: 'archive', location: { floor: 3, x: 20, y: 18 } },
            { id: 'a-302', number: '302', name: '人事部', type: 'office', location: { floor: 3, x: 20, y: 72 } },
            { id: 'a-303', number: '303', name: '行政部', type: 'office', location: { floor: 3, x: 98, y: 18 } },
            { id: 'a-304', number: '304', name: '多功能室', type: 'meeting', location: { floor: 3, x: 98, y: 72 } },
          ],
        },
        {
          number: 4,
          width: 120,
          height: 90,
          rooms: [
            { id: 'a-401', number: '401', name: '培训室', type: 'meeting', location: { floor: 4, x: 22, y: 18 } },
            { id: 'a-402', number: '402', name: '党建室', type: 'office', location: { floor: 4, x: 22, y: 72 } },
            { id: 'a-403', number: '403', name: '值班室', type: 'office', location: { floor: 4, x: 98, y: 18 } },
            { id: 'a-404', number: '404', name: '资料室', type: 'archive', location: { floor: 4, x: 98, y: 72 } },
          ],
        },
        {
          number: 5,
          width: 120,
          height: 90,
          rooms: [
            { id: 'a-501', number: '501', name: '屋顶平台入口', type: 'facility', location: { floor: 5, x: 60, y: 16 } },
            { id: 'a-502', number: '502', name: '设备间', type: 'facility', location: { floor: 5, x: 96, y: 68 } },
          ],
        },
      ],
    });

    this.indoorStructures.set('building2', {
      buildingId: 'building2',
      name: '图书馆',
      entrances: [
        {
          id: 'entrance-north',
          name: '北门',
          location: { floor: 1, x: 70, y: 8 },
          connectedElevators: ['elevator-l1'],
        },
        {
          id: 'entrance-south',
          name: '南门',
          location: { floor: 1, x: 70, y: 92 },
          connectedElevators: ['elevator-l1', 'elevator-l2'],
        },
      ],
      elevators: [
        {
          id: 'elevator-l1',
          name: '中庭电梯',
          location: { floor: 1, x: 70, y: 50 },
          floors: [1, 2, 3, 4, 5, 6],
          averageWaitTime: 18,
        },
        {
          id: 'elevator-l2',
          name: '东侧电梯',
          location: { floor: 1, x: 112, y: 50 },
          floors: [1, 2, 3, 4, 5, 6],
          averageWaitTime: 24,
        },
      ],
      floors: [
        {
          number: 1,
          width: 140,
          height: 100,
          rooms: [
            { id: 'l-101', number: '101', name: '借阅大厅', type: 'hall', location: { floor: 1, x: 30, y: 20 } },
            { id: 'l-102', number: '102', name: '读者服务台', type: 'service', location: { floor: 1, x: 30, y: 80 } },
            { id: 'l-103', number: '103', name: '自习区', type: 'study', location: { floor: 1, x: 112, y: 80 } },
            { id: 'l-104', number: '104', name: '咖啡角', type: 'food', location: { floor: 1, x: 112, y: 20 } },
          ],
        },
        {
          number: 2,
          width: 140,
          height: 100,
          rooms: [
            { id: 'l-201', number: '201', name: '社科阅览室', type: 'reading', location: { floor: 2, x: 24, y: 18 } },
            { id: 'l-202', number: '202', name: '文学阅览室', type: 'reading', location: { floor: 2, x: 24, y: 82 } },
            { id: 'l-203', number: '203', name: '讨论室 A', type: 'meeting', location: { floor: 2, x: 116, y: 18 } },
            { id: 'l-204', number: '204', name: '讨论室 B', type: 'meeting', location: { floor: 2, x: 116, y: 82 } },
          ],
        },
        {
          number: 3,
          width: 140,
          height: 100,
          rooms: [
            { id: 'l-301', number: '301', name: '科技阅览室', type: 'reading', location: { floor: 3, x: 24, y: 18 } },
            { id: 'l-302', number: '302', name: '电子阅览区', type: 'digital', location: { floor: 3, x: 24, y: 82 } },
            { id: 'l-303', number: '303', name: '信息检索区', type: 'service', location: { floor: 3, x: 116, y: 18 } },
            { id: 'l-304', number: '304', name: '安静自习区', type: 'study', location: { floor: 3, x: 116, y: 82 } },
          ],
        },
        {
          number: 4,
          width: 140,
          height: 100,
          rooms: [
            { id: 'l-401', number: '401', name: '古籍文献室', type: 'archive', location: { floor: 4, x: 26, y: 20 } },
            { id: 'l-402', number: '402', name: '特藏阅览室', type: 'reading', location: { floor: 4, x: 26, y: 80 } },
            { id: 'l-403', number: '403', name: '研讨室', type: 'meeting', location: { floor: 4, x: 114, y: 20 } },
          ],
        },
        {
          number: 5,
          width: 140,
          height: 100,
          rooms: [
            { id: 'l-501', number: '501', name: '报告厅', type: 'hall', location: { floor: 5, x: 34, y: 50 } },
            { id: 'l-502', number: '502', name: '音像资料室', type: 'media', location: { floor: 5, x: 110, y: 20 } },
            { id: 'l-503', number: '503', name: '文创展区', type: 'exhibition', location: { floor: 5, x: 110, y: 80 } },
          ],
        },
        {
          number: 6,
          width: 140,
          height: 100,
          rooms: [
            { id: 'l-601', number: '601', name: '屋顶阅读花园', type: 'outdoor', location: { floor: 6, x: 70, y: 20 } },
          ],
        },
      ],
    });

    this.indoorStructures.set('building3', {
      buildingId: 'building3',
      name: '教学楼',
      entrances: [
        {
          id: 'entrance-west',
          name: '西门',
          location: { floor: 1, x: 8, y: 55 },
          connectedElevators: ['elevator-t1'],
        },
        {
          id: 'entrance-south',
          name: '南门',
          location: { floor: 1, x: 80, y: 104 },
          connectedElevators: ['elevator-t1', 'elevator-t2'],
        },
      ],
      elevators: [
        {
          id: 'elevator-t1',
          name: '教学梯 1',
          location: { floor: 1, x: 60, y: 55 },
          floors: [1, 2, 3, 4],
          averageWaitTime: 24,
        },
        {
          id: 'elevator-t2',
          name: '教学梯 2',
          location: { floor: 1, x: 102, y: 55 },
          floors: [1, 2, 3, 4],
          averageWaitTime: 18,
        },
      ],
      floors: [
        {
          number: 1,
          width: 160,
          height: 110,
          rooms: [
            { id: 't-101', number: '101', name: '多媒体教室', type: 'classroom', location: { floor: 1, x: 24, y: 20 } },
            { id: 't-102', number: '102', name: '教务办公室', type: 'office', location: { floor: 1, x: 24, y: 90 } },
            { id: 't-103', number: '103', name: '阶梯教室', type: 'classroom', location: { floor: 1, x: 132, y: 20 } },
            { id: 't-104', number: '104', name: '教师休息室', type: 'facility', location: { floor: 1, x: 132, y: 90 } },
          ],
        },
        {
          number: 2,
          width: 160,
          height: 110,
          rooms: [
            { id: 't-201', number: '201', name: '实验室 A', type: 'lab', location: { floor: 2, x: 24, y: 20 } },
            { id: 't-202', number: '202', name: '实验室 B', type: 'lab', location: { floor: 2, x: 24, y: 90 } },
            { id: 't-203', number: '203', name: '计算机房', type: 'lab', location: { floor: 2, x: 132, y: 20 } },
            { id: 't-204', number: '204', name: '教研室', type: 'office', location: { floor: 2, x: 132, y: 90 } },
          ],
        },
        {
          number: 3,
          width: 160,
          height: 110,
          rooms: [
            { id: 't-301', number: '301', name: '研讨教室', type: 'classroom', location: { floor: 3, x: 30, y: 18 } },
            { id: 't-302', number: '302', name: '创新工作室', type: 'lab', location: { floor: 3, x: 30, y: 92 } },
            { id: 't-303', number: '303', name: '会议室', type: 'meeting', location: { floor: 3, x: 130, y: 18 } },
          ],
        },
        {
          number: 4,
          width: 160,
          height: 110,
          rooms: [
            { id: 't-401', number: '401', name: '报告厅', type: 'hall', location: { floor: 4, x: 80, y: 22 } },
            { id: 't-402', number: '402', name: '设备机房', type: 'facility', location: { floor: 4, x: 132, y: 88 } },
          ],
        },
      ],
    });
  }

  async getBuildings(): Promise<IndoorBuildingSummary[]> {
    await this.initializeIndoorStructures();
    return Array.from(this.indoorStructures.values()).map((item) => ({
      id: item.buildingId,
      name: item.name,
    }));
  }

  async getBuildingDetails(buildingId: string): Promise<IndoorStructure | null> {
    await this.initializeIndoorStructures();
    const building = this.indoorStructures.get(buildingId);
    if (!building) {
      return null;
    }
    return JSON.parse(JSON.stringify(building)) as IndoorStructure;
  }

  async navigateIndoor(buildingId: string, start: IndoorLocation, end: IndoorLocation): Promise<IndoorPathResult> {
    await this.initializeIndoorStructures();
    const building = this.indoorStructures.get(buildingId);
    if (!building) {
      throw new Error(`建筑 ${buildingId} 不存在`);
    }

    const startFloor = building.floors.find((floor) => floor.number === start.floor);
    const endFloor = building.floors.find((floor) => floor.number === end.floor);
    if (!startFloor || !endFloor) {
      throw new Error('起点或终点楼层不存在');
    }
    if (!this.isLocationInsideFloor(start, startFloor) || !this.isLocationInsideFloor(end, endFloor)) {
      throw new Error('起点或终点坐标超出楼层平面范围');
    }

    if (start.floor === end.floor) {
      const floorPath = this.buildFloorPath(startFloor, start, end, 'start', 'end');
      const distance = this.calculatePathDistance(floorPath);
      const estimatedMinutes = distance / this.walkingSpeedMetersPerMinute;
      return {
        instructions: this.buildSameFloorInstructions(start.floor, floorPath, distance, estimatedMinutes),
        distance: Number(distance.toFixed(2)),
        estimatedTime: Number(estimatedMinutes.toFixed(1)),
        path: floorPath,
        usedElevatorId: null,
      };
    }

    const candidateElevators = building.elevators.filter(
      (item) => item.floors.includes(start.floor) && item.floors.includes(end.floor),
    );
    if (!candidateElevators.length) {
      throw new Error('当前楼层组合没有可用电梯');
    }

    const selected = this.pickBestElevator(candidateElevators, building, start, end);
    const startElevatorLocation: IndoorLocation = {
      floor: start.floor,
      x: selected.elevator.location.x,
      y: selected.elevator.location.y,
    };
    const endElevatorLocation: IndoorLocation = {
      floor: end.floor,
      x: selected.elevator.location.x,
      y: selected.elevator.location.y,
    };

    const startFloorPath = this.buildFloorPath(startFloor, start, startElevatorLocation, 'start', 'elevator');
    const endFloorPath = this.buildFloorPath(endFloor, endElevatorLocation, end, 'elevator', 'end');
    const path = [
      ...startFloorPath,
      {
        floor: end.floor,
        x: selected.elevator.location.x,
        y: selected.elevator.location.y,
        type: 'elevator',
        label: selected.elevator.name,
      } as IndoorPathPoint,
      ...endFloorPath.slice(1),
    ];

    const walkDistance = this.calculatePathDistance(startFloorPath) + this.calculatePathDistance(endFloorPath);
    const elevatorTravelSeconds = Math.abs(end.floor - start.floor) * this.elevatorSecondsPerFloor;
    const estimatedTimeMinutes =
      walkDistance / this.walkingSpeedMetersPerMinute +
      selected.elevator.averageWaitTime / 60 +
      elevatorTravelSeconds / 60;

    return {
      instructions: this.buildCrossFloorInstructions({
        elevatorName: selected.elevator.name,
        startFloor: start.floor,
        endFloor: end.floor,
        startPath: startFloorPath,
        endPath: endFloorPath,
        waitSeconds: selected.elevator.averageWaitTime,
        elevatorTravelSeconds,
      }),
      distance: Number(walkDistance.toFixed(2)),
      estimatedTime: Number(estimatedTimeMinutes.toFixed(1)),
      path,
      usedElevatorId: selected.elevator.id,
    };
  }

  private isLocationInsideFloor(location: IndoorLocation, floor: IndoorFloor): boolean {
    return location.x >= 0 && location.x <= floor.width && location.y >= 0 && location.y <= floor.height;
  }

  private buildFloorPath(
    floor: IndoorFloor,
    start: IndoorLocation,
    end: IndoorLocation,
    startType: IndoorPathPoint['type'],
    endType: IndoorPathPoint['type'],
  ): IndoorPathPoint[] {
    const midX = Number((floor.width / 2).toFixed(2));
    const midY = Number((floor.height / 2).toFixed(2));
    const horizontalCandidate: IndoorPathPoint[] = [
      { ...start, type: startType },
      { floor: start.floor, x: midX, y: start.y, type: 'corner' },
      { floor: start.floor, x: midX, y: end.y, type: 'corner' },
      { ...end, type: endType },
    ];
    const verticalCandidate: IndoorPathPoint[] = [
      { ...start, type: startType },
      { floor: start.floor, x: start.x, y: midY, type: 'corner' },
      { floor: start.floor, x: end.x, y: midY, type: 'corner' },
      { ...end, type: endType },
    ];

    const compactHorizontal = this.compactPath(horizontalCandidate);
    const compactVertical = this.compactPath(verticalCandidate);
    return this.calculatePathDistance(compactHorizontal) <= this.calculatePathDistance(compactVertical)
      ? compactHorizontal
      : compactVertical;
  }

  private compactPath(points: IndoorPathPoint[]): IndoorPathPoint[] {
    const deduplicated: IndoorPathPoint[] = [];
    for (const point of points) {
      const last = deduplicated[deduplicated.length - 1];
      if (last && last.floor === point.floor && last.x === point.x && last.y === point.y) {
        if (point.type !== 'corner') {
          deduplicated[deduplicated.length - 1] = { ...point };
        }
        continue;
      }
      deduplicated.push({ ...point });
    }

    const compacted: IndoorPathPoint[] = [];
    for (let i = 0; i < deduplicated.length; i += 1) {
      const current = deduplicated[i];
      const prev = compacted[compacted.length - 1];
      const next = deduplicated[i + 1];
      if (!prev || !next) {
        compacted.push(current);
        continue;
      }
      const sameFloor = prev.floor === current.floor && current.floor === next.floor;
      const collinearX = prev.x === current.x && current.x === next.x;
      const collinearY = prev.y === current.y && current.y === next.y;
      if (sameFloor && (collinearX || collinearY) && current.type === 'corner') {
        continue;
      }
      compacted.push(current);
    }

    return compacted;
  }

  private calculatePathDistance(path: IndoorPathPoint[]): number {
    let distance = 0;
    for (let i = 1; i < path.length; i += 1) {
      const prev = path[i - 1];
      const curr = path[i];
      if (prev.floor !== curr.floor) {
        continue;
      }
      distance += Math.abs(prev.x - curr.x) + Math.abs(prev.y - curr.y);
    }
    return distance;
  }

  private pickBestElevator(
    elevators: IndoorElevator[],
    building: IndoorStructure,
    start: IndoorLocation,
    end: IndoorLocation,
  ): { elevator: IndoorElevator; cost: number } {
    const startFloor = building.floors.find((floor) => floor.number === start.floor)!;
    const endFloor = building.floors.find((floor) => floor.number === end.floor)!;

    let best: { elevator: IndoorElevator; cost: number } | null = null;
    for (const elevator of elevators) {
      const startToElevatorPath = this.buildFloorPath(
        startFloor,
        start,
        { floor: start.floor, x: elevator.location.x, y: elevator.location.y },
        'start',
        'elevator',
      );
      const endToElevatorPath = this.buildFloorPath(
        endFloor,
        { floor: end.floor, x: elevator.location.x, y: elevator.location.y },
        end,
        'elevator',
        'end',
      );
      const walkDistance =
        this.calculatePathDistance(startToElevatorPath) + this.calculatePathDistance(endToElevatorPath);
      const moveSeconds = Math.abs(end.floor - start.floor) * this.elevatorSecondsPerFloor;
      const cost = walkDistance / this.walkingSpeedMetersPerMinute + elevator.averageWaitTime / 60 + moveSeconds / 60;

      if (!best || cost < best.cost) {
        best = { elevator, cost };
      }
    }

    return best ?? { elevator: elevators[0], cost: Number.POSITIVE_INFINITY };
  }

  private buildSegmentInstructions(path: IndoorPathPoint[]): string[] {
    const instructions: string[] = [];
    for (let i = 1; i < path.length; i += 1) {
      const prev = path[i - 1];
      const current = path[i];
      if (prev.floor !== current.floor) {
        continue;
      }
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;
      const segmentDistance = Math.abs(dx) + Math.abs(dy);
      if (segmentDistance <= 0) {
        continue;
      }
      const direction = Math.abs(dx) >= Math.abs(dy)
        ? dx >= 0
          ? '向东'
          : '向西'
        : dy >= 0
          ? '向南'
          : '向北';
      instructions.push(`${direction}步行约 ${segmentDistance.toFixed(0)} 米`);
    }
    return instructions;
  }

  private buildSameFloorInstructions(
    floor: number,
    path: IndoorPathPoint[],
    distance: number,
    estimatedMinutes: number,
  ): string[] {
    const steps = this.buildSegmentInstructions(path);
    return [
      `已为您规划 ${floor} 层室内路线，全程约 ${distance.toFixed(0)} 米，预计 ${estimatedMinutes.toFixed(1)} 分钟。`,
      ...steps,
      '已到达目的地。',
    ];
  }

  private buildCrossFloorInstructions(params: CrossFloorInstructionInput): string[] {
    const { elevatorName, startFloor, endFloor, startPath, endPath, waitSeconds, elevatorTravelSeconds } = params;
    const floorDiff = Math.abs(endFloor - startFloor);
    const direction = endFloor > startFloor ? '上行' : '下行';
    return [
      `先在 ${startFloor} 层前往 ${elevatorName}。`,
      ...this.buildSegmentInstructions(startPath),
      `到达 ${elevatorName}，预计等待约 ${waitSeconds} 秒。`,
      `乘坐电梯${direction} ${floorDiff} 层到达 ${endFloor} 层（约 ${elevatorTravelSeconds} 秒）。`,
      ...this.buildSegmentInstructions(endPath),
      '已到达目的地。',
    ];
  }
}

export type {
  IndoorLocation,
  IndoorPathResult,
  IndoorStructure,
  IndoorBuildingSummary,
};
