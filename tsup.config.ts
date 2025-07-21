import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cloudflare/index.ts", "src/test/index.ts"],
  splitting: true,
  sourcemap: true,
  clean: true,
  format: "esm",
  external: ["cloudflare:workers", "cloudflare:workflows"],
  dts: true,
});
