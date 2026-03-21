import { cp, mkdir, readdir, rm, access, constants } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, "dist");

const STATIC_FILES = ["index.html", "robots.txt", "sitemap.xml", "favicon.ico", "favicon.svg", "og-image.png"];
const STATIC_DIRS = ["Scripts", "img", "quote", ".well-known"];

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
  await rm(DIST_DIR, { recursive: true, force: true });
  await mkdir(DIST_DIR, { recursive: true });

  for (const file of STATIC_FILES) {
    await copyFileIfExists(file);
  }

  for (const dir of STATIC_DIRS) {
    await copyDirIfExists(dir);
  }

  await copyPublicDirContents();
  console.log("build: static site packaged to dist/");
}

main().catch(error => {
  console.error("build: failed.");
  console.error(error.message || error);
  process.exit(1);
});
