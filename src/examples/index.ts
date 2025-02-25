import { createCloudflareWorkflow } from "../cloudflare/createCloudflareWorkflow";
import { KVNumberStore } from "./adapters/KVNumberStore";
import {
  CalculateCubeAdapters,
  CalculateCubeParams,
  CalculateCubeWorkflow as CalculateCube,
} from "./CalculateCubeWorkflow";
import { Env } from "./Env";

const CalculateCubeWorkflow = createCloudflareWorkflow<
  Env,
  CalculateCubeParams,
  CalculateCubeAdapters
>(CalculateCube, (env) => ({
  numberStore: new KVNumberStore(env.NUMBER_STORE),
}));

export { CalculateCubeWorkflow };

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // Get the status and result of an existing instance, if provided
    const id = url.searchParams.get("instanceId");
    if (id) {
      const instance = await env.CALCULATE_CUBE_WORKFLOW.get(id);
      const status = await instance.status();

      const numberStore = new KVNumberStore(env.NUMBER_STORE);
      const result = await numberStore.getNumber(id);

      return Response.json({
        status: status,
        result,
      });
    }

    // Spawn a new instance and return the ID and status
    const value = url.searchParams.get("value");
    const instance = await env.CALCULATE_CUBE_WORKFLOW.create({
      params: { value: value === null ? 2 : Number(value) },
    });
    return Response.json({
      id: instance.id,
      details: await instance.status(),
    });
  },
};
