import type { NumberStore } from "./adapters/NumberStore";

export type TestEnv = {
  type: "test";
  TEST_NUMBER_STORE: NumberStore;
};
