import type { TestEnv } from "../TestEnv";
import { KVNumberStore } from "./KVNumberStore";
import type { NumberStore } from "./NumberStore";

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
