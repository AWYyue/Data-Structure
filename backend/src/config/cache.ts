class Cache {
  private storage: Map<string, { value: unknown; expiry: number }> = new Map();

  set(key: string, value: unknown, ttl: number = 3600000): void {
    const expiry = Date.now() + ttl;
    this.storage.set(key, { value, expiry });
  }

  get<T = any>(key: string): T | null {
    const item = this.storage.get(key);
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.storage.delete(key);
      return null;
    }

    return item.value as T;
  }

  delete(key: string): void {
    this.storage.delete(key);
  }

  deleteByPrefix(prefix: string): void {
    for (const key of this.storage.keys()) {
      if (key.startsWith(prefix)) {
        this.storage.delete(key);
      }
    }
  }

  clear(): void {
    this.storage.clear();
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  async getOrSet<T>(key: string, factory: () => Promise<T> | T, ttl: number = 3600000): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }
}

const cache = new Cache();

export default cache;
