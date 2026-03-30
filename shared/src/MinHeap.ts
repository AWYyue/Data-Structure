// 推荐项接口
export interface RecommendationItem {
  id: string;
  score: number; // 推荐分数
  type: 'scenic_area' | 'food' | 'diary';
  data: any; // 实际数据对象
}

// 最小堆实现（用于Top-K推荐）
export class MinHeap<T extends { score: number }> {
  private heap: T[];
  private capacity: number; // K值，如10
  
  constructor(capacity: number) {
    this.heap = [];
    this.capacity = capacity;
  }
  
  // 插入元素（如果分数大于堆顶，则替换）
  insert(item: T): void {
    if (this.heap.length < this.capacity) {
      this.heap.push(item);
      this.bubbleUp(this.heap.length - 1);
    } else if (item.score > this.heap[0].score) {
      this.heap[0] = item;
      this.bubbleDown(0);
    }
  }
  
  // 获取Top-K结果（降序）
  getTopK(): T[] {
    return this.heap.sort((a, b) => b.score - a.score);
  }
  
  // 向上调整堆
  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].score >= this.heap[parentIndex].score) break;
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }
  
  // 向下调整堆
  private bubbleDown(index: number): void {
    while (true) {
      let minIndex = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      
      if (leftChild < this.heap.length && this.heap[leftChild].score < this.heap[minIndex].score) {
        minIndex = leftChild;
      }
      if (rightChild < this.heap.length && this.heap[rightChild].score < this.heap[minIndex].score) {
        minIndex = rightChild;
      }
      
      if (minIndex === index) break;
      [this.heap[index], this.heap[minIndex]] = [this.heap[minIndex], this.heap[index]];
      index = minIndex;
    }
  }
  
  // 获取堆大小
  size(): number {
    return this.heap.length;
  }
  
  // 检查堆是否为空
  isEmpty(): boolean {
    return this.heap.length === 0;
  }
  
  // 清空堆
  clear(): void {
    this.heap = [];
  }
  
  // 获取堆顶元素（不删除）
  peek(): T | undefined {
    return this.heap.length > 0 ? this.heap[0] : undefined;
  }
}