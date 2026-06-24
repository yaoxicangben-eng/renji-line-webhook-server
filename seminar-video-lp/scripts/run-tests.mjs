import { spawnSync } from "node:child_process";

const steps = [
  ["node", ["scripts/validate-lp-config.mjs"]],
  ["node", ["scripts/test-deadline-flow.mjs"]],
];

for (const [command, args] of steps) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("LPの自動テストに合格しました。");
