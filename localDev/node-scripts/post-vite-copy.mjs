import { access, constants, cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, "dist-vite");

const STATIC_FILES = [
  "robots.txt",
  "sitemap.xml",
  "sitemap-images.xml",
  "favicon.ico",
  "favicon.svg",
  "og-image.png",
  "SECURITY.md",
];
const STATIC_DIRS = ["Scripts", "img", "quote", "legal", "locales", ".well-known"];

async function exists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function copyFileIfExists(relativePath) {
  const source = path.join(ROOT, relativePath);
  if (!(await exists(source))) {
    return;
  }
  const target = path.join(DIST_DIR, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target);
}

async function copyDirIfExists(relativePath) {
  const source = path.join(ROOT, relativePath);
  if (!(await exists(source))) {
    return;
  }
  const target = path.join(DIST_DIR, relativePath);
  await cp(source, target, { recursive: true });
}

async function copyPublicDirContents() {
  const publicDir = path.join(ROOT, "public");
  if (!(await exists(publicDir))) {
    return;
  }
  const entries = await readdir(publicDir, { withFileTypes: true });
  for (const entry of entries) {
    const source = path.join(publicDir, entry.name);
    const target = path.join(DIST_DIR, entry.name);
    await cp(source, target, { recursive: true });
  }
}

async function main() {
  for (const file of STATIC_FILES) {
    await copyFileIfExists(file);
  }

  for (const dir of STATIC_DIRS) {
    await copyDirIfExists(dir);
  }

  await copyPublicDirContents();
  console.log("post-vite-copy: static assets synced to dist-vite/.");
}

main().catch(error => {
  console.error("post-vite-copy: failed.");
  console.error(error.message || error);
  process.exit(1);
});
