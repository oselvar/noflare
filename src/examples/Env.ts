import { CalculateCubeParams } from "./CalculateCubeWorkflow";

export type Env = {
  CALCULATE_CUBE_WORKFLOW: Workflow<CalculateCubeParams>;
  NUMBER_STORE: KVNamespace;
};
