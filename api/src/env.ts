import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
config({ path: resolve(root, ".env") });

function firstDefined(...values: Array<string | undefined>): string | undefined {
  return values.find((v) => v !== undefined && String(v).trim() !== "");
}

export const env = {
  port: Number(process.env.PORT ?? 8080),
  dokployBaseUrl: (
    firstDefined(process.env.DOKPLOY_BASE_URL, "https://deploy.mags.dk/api") ??
    "https://deploy.mags.dk/api"
  ).replace(/\/$/, ""),
  dokployApiKey:
    firstDefined(
      process.env.DOKPLOY_API_KEY,
      process.env.DokployKey,
      process.env.DOKPLOYKEY,
    ) ?? "",
};

export function assertApiKeyConfigured(): void {
  if (!env.dokployApiKey) {
    throw new Error(
      "Missing DOKPLOY_API_KEY (or DokployKey) in environment / .env",
    );
  }
}
