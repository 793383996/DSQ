import { access, constants, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const DIST_ROOT = path.join(process.cwd(), "dist-vite");
const REQUIRED_FILES = [
  "index.html",
  "sitemap.xml",
  "sitemap-images.xml",
  "robots.txt",
  "Scripts/app.services.js",
  "Scripts/data.js",
  "Scripts/blueprint.js",
  "Scripts/blueprint.layout.js",
  "img/to.png",
  "quote/explanation.html",
  "legal/privacy.html",
  "legal/terms.html",
  "legal/cookies.html",
  "legal/security.html",
  "locales/zh-CN.json",
  "locales/en-US.json",
  "SECURITY.md",
];

async function assertExists(targetPath) {
  await access(targetPath, constants.F_OK);
}

async function main() {
  for (const relativePath of REQUIRED_FILES) {
    await assertExists(path.join(DIST_ROOT, relativePath));
  }

  await assertExists(path.join(DIST_ROOT, ".vite", "manifest.json"));

  const assetsDir = path.join(DIST_ROOT, "assets");
  await assertExists(assetsDir);
  const assetEntries = await readdir(assetsDir);
  const hashedAssetCount = assetEntries.filter(name => /-[a-z0-9]{8,}\./i.test(name)).length;
  if (hashedAssetCount === 0) {
    throw new Error("verify:vite-dist failed: no hashed assets found in dist-vite/assets.");
  }

  const html = await readFile(path.join(DIST_ROOT, "index.html"), "utf8");
  if (!/assets\/[^"' ]+-[a-z0-9]{8,}\.css/i.test(html)) {
    throw new Error("verify:vite-dist failed: index.html does not reference hashed CSS asset.");
  }
  if (!/assets\/[^"' ]+-[a-z0-9]{8,}\.js/i.test(html)) {
    throw new Error("verify:vite-dist failed: index.html does not reference hashed JS asset.");
  }
  if (/src="\.?\/?Scripts\/[^"]+\.js"/i.test(html) || /href="\.?\/?Scripts\/style\.css"/i.test(html)) {
    throw new Error("verify:vite-dist failed: dist index.html still references legacy Scripts assets directly.");
  }

  console.log(`verify:vite-dist passed. hashed assets: ${hashedAssetCount}`);
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
