import { RoadGraph, GraphNode, GraphEdge, Transportation, RoadType } from './RoadGraph';

// 路径策略
export enum PathStrategy {
  SHORTEST_DISTANCE = 'shortest_distance',
  SHORTEST_TIME = 'shortest_time'
}

// 路径段
export interface PathSegment {
  from: string;
  to: string;
  distance: number;
  time: number;
  transportation: Transportation;
}

// 路径结果
export interface PathResult {
  path: PathSegment[];
  totalDistance: number;
  totalTime: number;
}

// 优先队列节点
interface PriorityQueueNode {
  nodeId: string;
  distance: number;
  time: number;
  previous: string | null;
  transportation: Transportation;
}

// 优先队列实现
class PriorityQueue {
  private heap: PriorityQueueNode[];
  private comparator: (a: PriorityQueueNode, b: PriorityQueueNode) => number;

  constructor(comparator: (a: PriorityQueueNode, b: PriorityQueueNode) => number) {
    this.heap = [];
    this.comparator = comparator;
  }

  enqueue(node: PriorityQueueNode): void {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue(): PriorityQueueNode | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();

    const top = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);
    return top;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.comparator(this.heap[index], this.heap[parentIndex]) >= 0) break;
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    while (true) {
      let minIndex = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < this.heap.length && this.comparator(this.heap[leftChild], this.heap[minIndex]) < 0) {
        minIndex = leftChild;
      }
      if (rightChild < this.heap.length && this.comparator(this.heap[rightChild], this.heap[minIndex]) < 0) {
        minIndex = rightChild;
      }

      if (minIndex === index) break;
      [this.heap[index], this.heap[minIndex]] = [this.heap[minIndex], this.heap[index]];
      index = minIndex;
    }
  }
}

// 路径规划器
export class PathPlanner {
  private graph: RoadGraph;

  constructor(graph: RoadGraph) {
    this.graph = graph;
  }

  // 单点到单点路径规划
  findPath(
    startId: string,
    endId: string,
    strategy: PathStrategy,
    transportation: Transportation[]
  ): PathResult {
    // 检查起点和终点是否存在
    if (!this.graph.hasNode(startId) || !this.graph.hasNode(endId)) {
      return { path: [], totalDistance: 0, totalTime: 0 };
    }

    // 初始化距离和时间
    const distances: Map<string, number> = new Map();
    const times: Map<string, number> = new Map();
    const previous: Map<string, { nodeId: string; transportation: Transportation }> = new Map();
    const visited: Set<string> = new Set();

    // 初始化所有节点的距离为无穷大
    for (const node of this.graph.getAllNodes()) {
      distances.set(node.id, Infinity);
      times.set(node.id, Infinity);
    }

    // 设置起点
    distances.set(startId, 0);
    times.set(startId, 0);

    // 创建优先队列
    const comparator = strategy === PathStrategy.SHORTEST_DISTANCE
      ? (a: PriorityQueueNode, b: PriorityQueueNode) => a.distance - b.distance
      : (a: PriorityQueueNode, b: PriorityQueueNode) => a.time - b.time;

    const priorityQueue = new PriorityQueue(comparator);

    // 添加起点到队列
    for (const transport of transportation) {
      priorityQueue.enqueue({
        nodeId: startId,
        distance: 0,
        time: 0,
        previous: null,
        transportation: transport
      });
    }

    while (!priorityQueue.isEmpty()) {
      const current = priorityQueue.dequeue()!;

      if (visited.has(current.nodeId)) continue;
      visited.add(current.nodeId);

      // 到达终点
      if (current.nodeId === endId) break;

      // 获取相邻边
      const edges = this.graph.getAdjacentEdges(current.nodeId);

      for (const edge of edges) {
        // 检查交通工具是否允许
        if (!edge.allowedTransportation.includes(current.transportation)) continue;

        // 计算新的距离和时间
        const newDistance = distances.get(current.nodeId)! + edge.distance;
        const speed = this.getSpeed(current.transportation, edge.roadType);
        const realSpeed = speed * edge.congestionFactor;
        const time = edge.distance / realSpeed * 3.6; // 转换为分钟
        const newTime = times.get(current.nodeId)! + time;

        // 更新距离和时间
        if (strategy === PathStrategy.SHORTEST_DISTANCE) {
          if (newDistance < distances.get(edge.to)!) {
            distances.set(edge.to, newDistance);
            times.set(edge.to, newTime);
            previous.set(edge.to, { nodeId: current.nodeId, transportation: current.transportation });
            priorityQueue.enqueue({
              nodeId: edge.to,
              distance: newDistance,
              time: newTime,
              previous: current.nodeId,
              transportation: current.transportation
            });
          }
        } else {
          if (newTime < times.get(edge.to)!) {
            distances.set(edge.to, newDistance);
            times.set(edge.to, newTime);
            previous.set(edge.to, { nodeId: current.nodeId, transportation: current.transportation });
            priorityQueue.enqueue({
              nodeId: edge.to,
              distance: newDistance,
              time: newTime,
              previous: current.nodeId,
              transportation: current.transportation
            });
          }
        }
      }
    }

    // 重建路径
    const path = this.reconstructPath(endId, previous, distances, times);
    return {
      path,
      totalDistance: distances.get(endId) || 0,
      totalTime: times.get(endId) || 0
    };
  }

  // 重建路径
  private reconstructPath(
    endId: string,
    previous: Map<string, { nodeId: string; transportation: Transportation }>,
    distances: Map<string, number>,
    times: Map<string, number>
  ): PathSegment[] {
    const path: PathSegment[] = [];
    let currentId = endId;

    while (previous.has(currentId)) {
      const { nodeId, transportation } = previous.get(currentId)!;
      const edge = this.findEdge(nodeId, currentId);
      if (edge) {
        path.unshift({
          from: nodeId,
          to: currentId,
          distance: edge.distance,
          time: times.get(currentId)! - times.get(nodeId)!,
          transportation
        });
      }
      currentId = nodeId;
    }

    return path;
  }

  // 查找边
  private findEdge(fromId: string, toId: string): GraphEdge | undefined {
    const edges = this.graph.getAdjacentEdges(fromId);
    return edges.find(edge => edge.to === toId);
  }

  // 获取交通工具速度（公里/小时）
  private getSpeed(transportation: Transportation, roadType: RoadType): number {
    switch (transportation) {
      case Transportation.WALK:
        return 4;
      case Transportation.BICYCLE:
        return 15;
      case Transportation.ELECTRIC_CART:
        return 20;
      default:
        return 4;
    }
  }
}