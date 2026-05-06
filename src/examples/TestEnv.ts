import type { NumberStore } from "./adapters/NumberStore.js";

export type TestEnv = {
  type: "test";
  TEST_NUMBER_STORE: NumberStore;
};
