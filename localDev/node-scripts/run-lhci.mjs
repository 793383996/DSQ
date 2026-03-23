import { spawn } from "node:child_process";
import { chromium } from "playwright";

const IS_WINDOWS = process.platform === "win32";
const NPM_BIN = IS_WINDOWS ? "npm.cmd" : "npm";
const NPX_BIN = IS_WINDOWS ? "npx.cmd" : "npx";

function runCommand(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: IS_WINDOWS,
      env,
    });

    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed: ${command} ${args.join(" ")} (exit ${code})`));
    });
  });
}

async function main() {
  const isQuickMode = process.argv.includes("--quick");
  await runCommand(NPM_BIN, ["run", "build"]);

  const chromePath = process.env.CHROME_PATH || chromium.executablePath();
  if (!chromePath) {
    throw new Error("perf:lhci failed: unable to resolve Chrome executable path.");
  }

  const lhciArgs = ["lhci", "autorun", "--config=./.lighthouserc.json"];
  if (isQuickMode) {
    lhciArgs.push("--collect.numberOfRuns=1");
  }

  await runCommand(NPX_BIN, lhciArgs, {
    ...process.env,
    CHROME_PATH: chromePath,
  });
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
