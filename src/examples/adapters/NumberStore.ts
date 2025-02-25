export interface NumberStore {
  putNumber(key: string, value: number): Promise<void>;
  getNumber(key: string): Promise<number | undefined>;
}
