import { readFile } from "node:fs/promises";

const REQUIRED_GLOBAL_HEADERS = [
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "Content-Security-Policy",
];
const REQUIRED_CSP_DIRECTIVES = [
  "default-src",
  "script-src",
  "script-src-attr",
  "style-src",
  "img-src",
  "font-src",
  "connect-src",
  "worker-src",
  "object-src",
  "base-uri",
  "frame-ancestors",
  "form-action",
];

function normalizeHeaderKeys(headers) {
  return new Set(headers.map(entry => (entry && entry.key ? String(entry.key).toLowerCase() : "")));
}

function parseCspDirectives(cspValue) {
  const directives = new Map();
  String(cspValue || "")
    .split(";")
    .map(part => part.trim())
    .filter(Boolean)
    .forEach(part => {
      const [name, ...values] = part.split(/\s+/);
      directives.set(name, values.join(" "));
    });
  return directives;
}

async function assertNoInlineScriptPatterns() {
  const html = await readFile("index.html", "utf8");
  if (/javascript:/i.test(html)) {
    throw new Error("security:check failed: found javascript: URL in index.html.");
  }
  if (/\son[a-z]+\s*=/i.test(html)) {
    throw new Error("security:check failed: found inline event handler attribute in index.html.");
  }

  const inlineScriptTag = html.match(/<script\b(?![^>]*\bsrc=)(?![^>]*type=["']application\/ld\+json["'])[^>]*>/i);
  if (inlineScriptTag) {
    throw new Error("security:check failed: found inline <script> block in index.html.");
  }

  const uiBindings = await readFile("Scripts/data.ui-bindings.js", "utf8");
  if (/javascript:/i.test(uiBindings)) {
    throw new Error("security:check failed: found javascript: URL generation in Scripts/data.ui-bindings.js.");
  }
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

  const cspEntry = globalRule.headers.find(
    entry => String(entry && entry.key).toLowerCase() === "content-security-policy"
  );
  const cspDirectives = parseCspDirectives(cspEntry ? cspEntry.value : "");
  const missingCspDirectives = REQUIRED_CSP_DIRECTIVES.filter(name => !cspDirectives.has(name));
  if (missingCspDirectives.length > 0) {
    throw new Error(`security:check failed: missing CSP directives: ${missingCspDirectives.join(", ")}`);
  }

  const scriptSrc = cspDirectives.get("script-src") || "";
  if (scriptSrc.includes("'unsafe-inline'")) {
    throw new Error("security:check failed: script-src must not include 'unsafe-inline'.");
  }
  const scriptSrcAttr = cspDirectives.get("script-src-attr") || "";
  if (!scriptSrcAttr.includes("'none'")) {
    throw new Error("security:check failed: script-src-attr should be set to 'none'.");
  }

  await assertNoInlineScriptPatterns();

  console.log("security:check passed.");
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
