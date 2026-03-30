// Trie树节点
export class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  data: any[]; // 存储匹配的数据对象
  
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.data = [];
  }
}

// Trie树实现（用于名称查询）
export class Trie {
  private root: TrieNode;
  
  constructor() {
    this.root = new TrieNode();
  }
  
  // 插入词条
  insert(word: string, data: any): void {
    let node = this.root;
    for (const char of word.toLowerCase()) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    node.isEndOfWord = true;
    node.data.push(data);
  }
  
  // 精确查找
  search(word: string): any[] {
    let node = this.root;
    for (const char of word.toLowerCase()) {
      if (!node.children.has(char)) {
        return [];
      }
      node = node.children.get(char)!;
    }
    return node.isEndOfWord ? node.data : [];
  }
  
  // 前缀查找
  searchByPrefix(prefix: string): any[] {
    let node = this.root;
    for (const char of prefix.toLowerCase()) {
      if (!node.children.has(char)) {
        return [];
      }
      node = node.children.get(char)!;
    }
    return this.collectAllData(node);
  }
  
  // 收集所有匹配的数据
  private collectAllData(node: TrieNode): any[] {
    let results: any[] = [];
    if (node.isEndOfWord) {
      results.push(...node.data);
    }
    for (const child of node.children.values()) {
      results.push(...this.collectAllData(child));
    }
    return results;
  }
  
  // 删除词条
  delete(word: string, data: any): boolean {
    const stack: { node: TrieNode; char: string }[] = [];
    let node = this.root;
    
    // 遍历到单词末尾
    for (const char of word.toLowerCase()) {
      if (!node.children.has(char)) {
        return false;
      }
      stack.push({ node, char });
      node = node.children.get(char)!;
    }
    
    // 检查是否是单词结尾
    if (!node.isEndOfWord) {
      return false;
    }
    
    // 移除数据
    const dataIndex = node.data.findIndex(item => item === data);
    if (dataIndex === -1) {
      return false;
    }
    node.data.splice(dataIndex, 1);
    
    // 如果还有其他数据或子节点，不删除节点
    if (node.data.length > 0 || node.children.size > 0) {
      return true;
    }
    
    // 向上删除空节点
    while (stack.length > 0) {
      const { node: parent, char } = stack.pop()!;
      parent.children.delete(char);
      
      if (parent.isEndOfWord || parent.children.size > 0) {
        break;
      }
    }
    
    return true;
  }
  
  // 清空Trie树
  clear(): void {
    this.root = new TrieNode();
  }
  
  // 检查Trie树是否为空
  isEmpty(): boolean {
    return this.root.children.size === 0 && !this.root.isEndOfWord;
  }
  
  // 获取Trie树中的单词数量（近似）
  getWordCount(): number {
    return this.countWords(this.root);
  }
  
  private countWords(node: TrieNode): number {
    let count = node.isEndOfWord ? 1 : 0;
    for (const child of node.children.values()) {
      count += this.countWords(child);
    }
    return count;
  }
}