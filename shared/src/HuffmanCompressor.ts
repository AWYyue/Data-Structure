// 哈夫曼树节点
class HuffmanNode {
  char: string | null;
  frequency: number;
  left: HuffmanNode | null;
  right: HuffmanNode | null;

  constructor(char: string | null, frequency: number) {
    this.char = char;
    this.frequency = frequency;
    this.left = null;
    this.right = null;
  }
}

// 哈夫曼编码压缩器
export class HuffmanCompressor {
  // 压缩字符串
  compress(input: string): { compressed: Buffer; tree: HuffmanNode } {
    // 统计字符频率
    const frequencyMap = this.calculateFrequency(input);

    // 构建哈夫曼树
    const huffmanTree = this.buildHuffmanTree(frequencyMap);

    // 生成编码表
    const codeTable = this.generateCodeTable(huffmanTree);

    // 编码字符串
    let encoded = '';
    for (const char of input) {
      encoded += codeTable.get(char);
    }

    // 转换为Buffer
    const compressed = this.bitsToBuffer(encoded);

    return { compressed, tree: huffmanTree };
  }

  // 解压缩
  decompress(compressed: Buffer, tree: HuffmanNode): string {
    // 转换Buffer为位字符串
    const bits = this.bufferToBits(compressed);

    // 解码
    let decoded = '';
    let currentNode = tree;

    for (const bit of bits) {
      if (bit === '0') {
        currentNode = currentNode.left!;
      } else {
        currentNode = currentNode.right!;
      }

      if (currentNode.char !== null) {
        decoded += currentNode.char;
        currentNode = tree;
      }
    }

    return decoded;
  }

  // 计算字符频率
  private calculateFrequency(input: string): Map<string, number> {
    const frequencyMap = new Map<string, number>();

    for (const char of input) {
      frequencyMap.set(char, (frequencyMap.get(char) || 0) + 1);
    }

    return frequencyMap;
  }

  // 构建哈夫曼树
  private buildHuffmanTree(frequencyMap: Map<string, number>): HuffmanNode {
    // 创建优先队列
    const priorityQueue: HuffmanNode[] = [];

    // 初始化队列
    for (const [char, frequency] of frequencyMap.entries()) {
      priorityQueue.push(new HuffmanNode(char, frequency));
    }

    // 构建树
    while (priorityQueue.length > 1) {
      // 按频率排序
      priorityQueue.sort((a, b) => a.frequency - b.frequency);

      // 取出频率最小的两个节点
      const left = priorityQueue.shift()!;
      const right = priorityQueue.shift()!;

      // 创建新节点
      const parent = new HuffmanNode(null, left.frequency + right.frequency);
      parent.left = left;
      parent.right = right;

      // 将新节点加入队列
      priorityQueue.push(parent);
    }

    return priorityQueue[0];
  }

  // 生成编码表
  private generateCodeTable(root: HuffmanNode): Map<string, string> {
    const codeTable = new Map<string, string>();
    this.generateCodes(root, '', codeTable);
    return codeTable;
  }

  // 递归生成编码
  private generateCodes(node: HuffmanNode, code: string, codeTable: Map<string, string>): void {
    if (node.char !== null) {
      codeTable.set(node.char, code);
      return;
    }

    if (node.left) {
      this.generateCodes(node.left, code + '0', codeTable);
    }

    if (node.right) {
      this.generateCodes(node.right, code + '1', codeTable);
    }
  }

  // 位字符串转换为Buffer
  private bitsToBuffer(bits: string): Buffer {
    const bytes: number[] = [];

    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.slice(i, i + 8).padEnd(8, '0');
      bytes.push(parseInt(byte, 2));
    }

    return Buffer.from(bytes);
  }

  // Buffer转换为位字符串
  private bufferToBits(buffer: Buffer): string {
    let bits = '';

    for (const byte of buffer) {
      bits += byte.toString(2).padStart(8, '0');
    }

    return bits;
  }
}