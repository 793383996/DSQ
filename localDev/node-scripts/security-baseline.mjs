import { readFile } from "node:fs/promises";

const REQUIRED_GLOBAL_HEADERS = [
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "Content-Security-Policy-Report-Only",
];

function normalizeHeaderKeys(headers) {
  return new Set(headers.map(entry => (entry && entry.key ? String(entry.key).toLowerCase() : "")));
}

async function main() {
  const vercelConfig = JSON.parse(await readFile("vercel.json", "utf8"));
  const globalRule = (vercelConfig.headers || []).find(rule => rule.source === "/(.*)");
  if (!globalRule || !Array.isArray(globalRule.headers)) {
    throw new Error("security:check failed: missing global security header rule in vercel.json.");
  }

  const headerKeys = normalizeHeaderKeys(globalRule.headers);
  const missingHeaders = REQUIRED_GLOBAL_HEADERS.filter(required => !headerKeys.has(required.toLowerCase()));
  if (missingHeaders.length > 0) {
    throw new Error(`security:check failed: missing required headers: ${missingHeaders.join(", ")}`);
  }

  console.log("security:check passed.");
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
