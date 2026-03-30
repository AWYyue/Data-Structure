// 倒排索引实现（用于全文检索）
export class InvertedIndex {
  private index: Map<string, Set<string>>; // 词 -> 文档ID集合
  private documents: Map<string, string>; // 文档ID -> 文档内容
  
  constructor() {
    this.index = new Map();
    this.documents = new Map();
  }
  
  // 添加文档
  addDocument(docId: string, content: string): void {
    this.documents.set(docId, content);
    const words = this.tokenize(content);
    
    for (const word of words) {
      if (!this.index.has(word)) {
        this.index.set(word, new Set());
      }
      this.index.get(word)!.add(docId);
    }
  }
  
  // 搜索关键词
  search(keywords: string[]): string[] {
    if (keywords.length === 0) return [];
    
    const normalizedKeywords = keywords.map(k => k.toLowerCase());
    let resultSet = this.index.get(normalizedKeywords[0]) || new Set<string>();
    
    // 多关键词取交集
    for (let i = 1; i < normalizedKeywords.length; i++) {
      const keywordSet = this.index.get(normalizedKeywords[i]) || new Set<string>();
      resultSet = new Set([...resultSet].filter(id => keywordSet.has(id)));
    }
    
    return Array.from(resultSet);
  }
  
  // 简单分词：按空格和标点分割
  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .split(/[\s,，.。!！?？;；:：、]+/)
      .filter(word => word.length > 0);
  }
  
  // 删除文档
  removeDocument(docId: string): boolean {
    if (!this.documents.has(docId)) {
      return false;
    }
    
    const content = this.documents.get(docId)!;
    const words = this.tokenize(content);
    
    // 从索引中移除文档ID
    for (const word of words) {
      const docSet = this.index.get(word);
      if (docSet) {
        docSet.delete(docId);
        if (docSet.size === 0) {
          this.index.delete(word);
        }
      }
    }
    
    // 从文档映射中移除
    this.documents.delete(docId);
    return true;
  }
  
  // 更新文档
  updateDocument(docId: string, newContent: string): boolean {
    if (!this.documents.has(docId)) {
      return false;
    }
    
    // 先删除旧文档
    this.removeDocument(docId);
    // 再添加新文档
    this.addDocument(docId, newContent);
    return true;
  }
  
  // 获取文档内容
  getDocument(docId: string): string | undefined {
    return this.documents.get(docId);
  }
  
  // 清空索引
  clear(): void {
    this.index.clear();
    this.documents.clear();
  }
  
  // 检查索引是否为空
  isEmpty(): boolean {
    return this.documents.size === 0;
  }
  
  // 获取文档数量
  getDocumentCount(): number {
    return this.documents.size;
  }
  
  // 获取词汇量
  getVocabularySize(): number {
    return this.index.size;
  }
}