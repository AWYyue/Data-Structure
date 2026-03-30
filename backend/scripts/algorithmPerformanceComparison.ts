// 核心算法性能比较工具

// 排序算法实现
class SortingAlgorithms {
  // 冒泡排序
  static bubbleSort(arr: number[]): number[] {
    const copy = [...arr];
    const n = copy.length;
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        if (copy[j] > copy[j + 1]) {
          [copy[j], copy[j + 1]] = [copy[j + 1], copy[j]];
        }
      }
    }
    return copy;
  }

  // 快速排序
  static quickSort(arr: number[]): number[] {
    if (arr.length <= 1) return arr;
    const pivot = arr[Math.floor(arr.length / 2)];
    const left = arr.filter(x => x < pivot);
    const middle = arr.filter(x => x === pivot);
    const right = arr.filter(x => x > pivot);
    return [...this.quickSort(left), ...middle, ...this.quickSort(right)];
  }

  // 堆排序（用于Top-K推荐）
  static heapSort(arr: number[]): number[] {
    const copy = [...arr];
    const n = copy.length;

    // 构建最大堆
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      this.heapify(copy, n, i);
    }

    // 逐个提取元素
    for (let i = n - 1; i > 0; i--) {
      [copy[0], copy[i]] = [copy[i], copy[0]];
      this.heapify(copy, i, 0);
    }

    return copy;
  }

  private static heapify(arr: number[], n: number, i: number): void {
    let largest = i;
    const left = 2 * i + 1;
    const right = 2 * i + 2;

    if (left < n && arr[left] > arr[largest]) {
      largest = left;
    }

    if (right < n && arr[right] > arr[largest]) {
      largest = right;
    }

    if (largest !== i) {
      [arr[i], arr[largest]] = [arr[largest], arr[i]];
      this.heapify(arr, n, largest);
    }
  }
}

// 查找算法实现
class SearchingAlgorithms {
  // 线性查找
  static linearSearch(arr: number[], target: number): number {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === target) {
        return i;
      }
    }
    return -1;
  }

  // 二分查找
  static binarySearch(arr: number[], target: number): number {
    let left = 0;
    let right = arr.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (arr[mid] === target) {
        return mid;
      } else if (arr[mid] < target) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    return -1;
  }
}

// 路径规划算法实现
class PathPlanningAlgorithms {
  // 简单的Dijkstra算法
  static dijkstra(graph: number[][], start: number, end: number): { distance: number; path: number[] } {
    const n = graph.length;
    const distances = Array(n).fill(Infinity);
    const visited = Array(n).fill(false);
    const previous = Array(n).fill(-1);

    distances[start] = 0;

    for (let i = 0; i < n - 1; i++) {
      const u = this.minDistance(distances, visited);
      visited[u] = true;

      for (let v = 0; v < n; v++) {
        if (!visited[v] && graph[u][v] !== 0 && distances[u] !== Infinity && distances[u] + graph[u][v] < distances[v]) {
          distances[v] = distances[u] + graph[u][v];
          previous[v] = u;
        }
      }
    }

    // 重建路径
    const path: number[] = [];
    let current = end;
    while (current !== -1) {
      path.unshift(current);
      current = previous[current];
    }

    return { distance: distances[end], path };
  }

  // 简单的BFS算法
  static bfs(graph: number[][], start: number, end: number): { distance: number; path: number[] } {
    const n = graph.length;
    const visited = Array(n).fill(false);
    const queue: number[] = [];
    const previous = Array(n).fill(-1);
    const distances = Array(n).fill(Infinity);

    visited[start] = true;
    queue.push(start);
    distances[start] = 0;

    while (queue.length > 0) {
      const u = queue.shift()!;

      for (let v = 0; v < n; v++) {
        if (!visited[v] && graph[u][v] !== 0) {
          visited[v] = true;
          queue.push(v);
          distances[v] = distances[u] + 1;
          previous[v] = u;

          if (v === end) {
            // 重建路径
            const path: number[] = [];
            let current = end;
            while (current !== -1) {
              path.unshift(current);
              current = previous[current];
            }
            return { distance: distances[end], path };
          }
        }
      }
    }

    return { distance: Infinity, path: [] };
  }

  private static minDistance(distances: number[], visited: boolean[]): number {
    let min = Infinity;
    let minIndex = -1;

    for (let i = 0; i < distances.length; i++) {
      if (!visited[i] && distances[i] <= min) {
        min = distances[i];
        minIndex = i;
      }
    }

    return minIndex;
  }
}

// 性能测试工具
class PerformanceTester {
  // 生成随机数组
  static generateRandomArray(size: number, max: number = 10000): number[] {
    return Array(size).fill(0).map(() => Math.floor(Math.random() * max));
  }

  // 生成随机图
  static generateRandomGraph(n: number, density: number = 0.3): number[][] {
    const graph = Array(n).fill(0).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j && Math.random() < density) {
          graph[i][j] = Math.floor(Math.random() * 100) + 1;
        }
      }
    }
    return graph;
  }

  // 测量函数执行时间
  static measureExecutionTime(fn: () => any): number {
    const start = performance.now();
    fn();
    const end = performance.now();
    return end - start;
  }

  // 测试排序算法
  static testSortingAlgorithms() {
    console.log('=== 排序算法性能测试 ===');
    
    const sizes = [1000, 5000, 10000];
    sizes.forEach(size => {
      console.log(`\n数组大小: ${size}`);
      const arr = this.generateRandomArray(size);

      const bubbleSortTime = this.measureExecutionTime(() => SortingAlgorithms.bubbleSort(arr));
      console.log(`冒泡排序: ${bubbleSortTime.toFixed(2)}ms`);

      const quickSortTime = this.measureExecutionTime(() => SortingAlgorithms.quickSort(arr));
      console.log(`快速排序: ${quickSortTime.toFixed(2)}ms`);

      const heapSortTime = this.measureExecutionTime(() => SortingAlgorithms.heapSort(arr));
      console.log(`堆排序: ${heapSortTime.toFixed(2)}ms`);
    });
  }

  // 测试查找算法
  static testSearchingAlgorithms() {
    console.log('\n=== 查找算法性能测试 ===');
    
    const sizes = [1000, 5000, 10000];
    sizes.forEach(size => {
      console.log(`\n数组大小: ${size}`);
      const arr = this.generateRandomArray(size).sort((a, b) => a - b);
      const target = arr[Math.floor(Math.random() * size)];

      const linearSearchTime = this.measureExecutionTime(() => SearchingAlgorithms.linearSearch(arr, target));
      console.log(`线性查找: ${linearSearchTime.toFixed(2)}ms`);

      const binarySearchTime = this.measureExecutionTime(() => SearchingAlgorithms.binarySearch(arr, target));
      console.log(`二分查找: ${binarySearchTime.toFixed(2)}ms`);
    });
  }

  // 测试路径规划算法
  static testPathPlanningAlgorithms() {
    console.log('\n=== 路径规划算法性能测试 ===');
    
    const sizes = [50, 100, 200];
    sizes.forEach(size => {
      console.log(`\n图大小: ${size}x${size}`);
      const graph = this.generateRandomGraph(size);
      const start = 0;
      const end = size - 1;

      const dijkstraTime = this.measureExecutionTime(() => PathPlanningAlgorithms.dijkstra(graph, start, end));
      console.log(`Dijkstra算法: ${dijkstraTime.toFixed(2)}ms`);

      const bfsTime = this.measureExecutionTime(() => PathPlanningAlgorithms.bfs(graph, start, end));
      console.log(`BFS算法: ${bfsTime.toFixed(2)}ms`);
    });
  }

  // 运行所有测试
  static runAllTests() {
    console.log('开始核心算法性能比较测试...\n');
    
    this.testSortingAlgorithms();
    this.testSearchingAlgorithms();
    this.testPathPlanningAlgorithms();
    
    console.log('\n性能测试完成！');
  }
}

// 运行测试
PerformanceTester.runAllTests();
