import type { TestEnv } from "../TestEnv.js";
import { KVNumberStore } from "./KVNumberStore.js";
import type { NumberStore } from "./NumberStore.js";

export type Adapters = {
  numberStore: NumberStore;
};

export function makeAdapters(env: Env | TestEnv): Adapters {
  if ("type" in env && env.type === "test") {
    return {
      numberStore: env.TEST_NUMBER_STORE,
    };
  }
  const e = env as Env;
  return {
    numberStore: new KVNumberStore(e.NUMBER_STORE),
  };
}
