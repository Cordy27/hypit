import {
  createRuntimeEndpointAdapterFacet,
  runtimeConfigCredentialRef,
  runtimeConfigExact,
  runtimeConfigObject,
  runtimeConfigPositiveInteger,
  runtimeConfigString,
} from "@hypit/hypit/runtime-kit";
import { createVectrustSeedanceProvider, providerModule } from "./provider.js";

export default {
  format: "hypit.node-package@1" as const,
  hostFacets: [createRuntimeEndpointAdapterFacet({
    use: providerModule.name,
    activate(context) {
      const config = runtimeConfigObject(context.config, "Vectrust Seedance");
      runtimeConfigExact(config, ["baseUrl", "apiKey", "concurrency", "pollIntervalMs", "requestTimeoutMs"], "Vectrust Seedance");
      const baseUrl = runtimeConfigString(config.baseUrl, "Vectrust Seedance baseUrl");
      const apiKey = runtimeConfigCredentialRef(config.apiKey, "Vectrust Seedance apiKey");
      if (!baseUrl || !apiKey || !context.pool) {
        throw new Error("Vectrust Seedance requires baseUrl, apiKey and pool");
      }
      return {
        endpoint: createVectrustSeedanceProvider({
          instance: context.instance,
          pool: context.pool,
          baseUrl,
          apiKey,
          concurrency: runtimeConfigPositiveInteger(config.concurrency, "concurrency") ?? 1,
          pollIntervalMs: runtimeConfigPositiveInteger(config.pollIntervalMs, "pollIntervalMs") ?? 10_000,
          requestTimeoutMs: runtimeConfigPositiveInteger(config.requestTimeoutMs, "requestTimeoutMs") ?? 600_000,
        }),
      };
    },
  })],
};
