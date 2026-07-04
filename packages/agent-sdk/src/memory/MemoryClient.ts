
import { MemoryStore } from "./MemoryStore";

export class MemoryClient {
  constructor(private readonly store: MemoryStore) {}

  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }

  get<T>(key: string): T | undefined {
    return this.store.get<T>(key);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  keys(): string[] {
    return this.store.keys();
  }
}