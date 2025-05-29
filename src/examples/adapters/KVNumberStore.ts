import type { NumberStore } from "./NumberStore";

export class KVNumberStore implements NumberStore {
  constructor(private readonly kv: KVNamespace) {}

  async putNumber(key: string, value: number): Promise<void> {
    await this.kv.put(key, value.toString());
  }

  async getNumber(key: string): Promise<number | undefined> {
    const value = await this.kv.get(key);
    return value ? parseInt(value) : undefined;
  }
}
