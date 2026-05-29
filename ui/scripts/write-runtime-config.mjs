import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const apiBaseUrl = (process.env.VITE_API_URL ?? "").trim();
const outPath = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "runtime-config.json");

writeFileSync(outPath, `${JSON.stringify({ apiBaseUrl }, null, 2)}\n`, "utf8");

if (!apiBaseUrl) {
  console.warn(
    "warn: VITE_API_URL is empty — runtime-config.json will not override a bad build-time URL."
  );
} else {
  console.log(`wrote runtime-config.json with apiBaseUrl=${apiBaseUrl}`);
}
