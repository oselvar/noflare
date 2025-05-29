import type { NumberStore } from "./NumberStore";

export class MemoryNumberStore implements NumberStore {
  private numbers: Map<string, number> = new Map();

  async putNumber(key: string, value: number): Promise<void> {
    this.numbers.set(key, value);
  }

  async getNumber(key: string): Promise<number | undefined> {
    return this.numbers.get(key);
  }
}
