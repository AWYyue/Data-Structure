// 道路图核心数据结构
export interface GraphNode {
  id: string;
  type: 'attraction' | 'facility' | 'junction'; // 景点、设施或路口
  name: string;
  location: GeoLocation;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export interface GraphEdge {
  id: string;
  from: string; // 起点节点ID
  to: string; // 终点节点ID
  distance: number; // 距离（米）
  roadType: RoadType;
  congestionFactor: number; // 拥挤度（0-1），真实速度=拥挤度×理想速度
  allowedTransportation: Transportation[]; // 允许的交通工具
  isElectricCartRoute: boolean; // 是否为电瓶车路线
  isBicyclePath: boolean; // 是否为自行车道
}

export enum RoadType {
  MAIN_ROAD = 'main_road',
  SIDE_ROAD = 'side_road',
  FOOTPATH = 'footpath',
  BICYCLE_PATH = 'bicycle_path',
  ELECTRIC_CART_ROUTE = 'electric_cart_route'
}

export enum Transportation {
  WALK = 'walk',
  BICYCLE = 'bicycle',
  ELECTRIC_CART = 'electric_cart'
}

export class RoadGraph {
  private nodes: Map<string, GraphNode>; // 节点映射
  private edges: Map<string, GraphEdge[]>; // 邻接表
  private edgeCount: number; // 边的数量（至少200条）
  
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.edgeCount = 0;
  }
  
  // 添加节点
  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.edges.has(node.id)) {
      this.edges.set(node.id, []);
    }
  }
  
  // 添加边
  addEdge(edge: GraphEdge): void {
    const fromEdges = this.edges.get(edge.from);
    if (fromEdges) {
      fromEdges.push(edge);
      this.edgeCount++;
    }
  }
  
  // 获取节点的所有邻接边
  getAdjacentEdges(nodeId: string): GraphEdge[] {
    return this.edges.get(nodeId) || [];
  }
  
  // 获取节点
  getNode(nodeId: string): GraphNode | undefined {
    return this.nodes.get(nodeId);
  }
  
  // 获取所有节点
  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }
  
  // 获取边的数量
  getEdgeCount(): number {
    return this.edgeCount;
  }
  
  // 检查节点是否存在
  hasNode(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }
  
  // 移除节点
  removeNode(nodeId: string): boolean {
    if (!this.nodes.has(nodeId)) {
      return false;
    }
    
    // 移除节点
    this.nodes.delete(nodeId);
    
    // 移除与该节点相关的所有边
    this.edges.delete(nodeId);
    
    // 移除其他节点中指向该节点的边
    for (const [fromNodeId, edgeList] of this.edges.entries()) {
      const filteredEdges = edgeList.filter(edge => edge.to !== nodeId);
      this.edges.set(fromNodeId, filteredEdges);
      this.edgeCount -= edgeList.length - filteredEdges.length;
    }
    
    return true;
  }
  
  // 移除边
  removeEdge(edgeId: string): boolean {
    let removed = false;
    
    for (const [fromNodeId, edgeList] of this.edges.entries()) {
      const filteredEdges = edgeList.filter(edge => edge.id !== edgeId);
      if (filteredEdges.length !== edgeList.length) {
        this.edges.set(fromNodeId, filteredEdges);
        this.edgeCount--;
        removed = true;
      }
    }
    
    return removed;
  }
  
  // 清空图
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.edgeCount = 0;
  }
}