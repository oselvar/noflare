import { createCloudflareWorkflow } from "../cloudflare/createCloudflareWorkflow";
import { KVNumberStore } from "./adapters/KVNumberStore";
import { CalculateCubeEntrypoint, type CalculateCubeParams } from "./CalculateCubeWorkflow";
import type { TestEnv } from "./TestEnv";

const CalculateCubeWorkflow = createCloudflareWorkflow<Env | TestEnv, CalculateCubeParams>(
  CalculateCubeEntrypoint,
);

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

      if (status.status === "paused") {
        await instance.resume();
      }

      return Response.json({
        status,
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
