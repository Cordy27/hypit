import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { prepareBuildInputs } from "../src/build-inputs.js";

async function projectWithBuildInput(command: string, inputs = ["source.txt"]) {
  const root = await mkdtemp(join(tmpdir(), "hypit-build-inputs-"));
  await writeFile(join(root, "source.txt"), "source\n");
  await writeFile(join(root, "package.json"), JSON.stringify({
    hypit: { buildInputs: [{ id: "fixture", command, inputs, outputs: ["generated.txt"] }] },
  }));
  return root;
}

test("build inputs run once and reuse a matching fingerprint", async () => {
  const root = await projectWithBuildInput("node -e \"require('node:fs').writeFileSync('generated.txt', 'ready')\"");
  try {
    const reports: string[] = [];
    await prepareBuildInputs(root, (line) => reports.push(line));
    await prepareBuildInputs(root, (line) => reports.push(line));
    assert.deepEqual(reports, ["Build input fixture: running", "Build input fixture: ready", "Build input fixture: up to date"]);
    assert.equal(await readFile(join(root, "generated.txt"), "utf8"), "ready");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("build inputs follow directory symlinks when fingerprinting glob inputs", async () => {
  const root = await mkdtemp(join(tmpdir(), "hypit-build-inputs-link-"));
  const target = await mkdtemp(join(tmpdir(), "hypit-build-inputs-target-"));
  const reports: string[] = [];
  try {
    await writeFile(join(target, "scene.py"), "one", "utf8");
    await symlink(target, join(root, "shared"), "dir");
    await writeFile(join(root, "package.json"), JSON.stringify({
      hypit: { buildInputs: [{
        id: "linked",
        command: `node -e "require('node:fs').writeFileSync('generated.txt', 'ready')"`,
        inputs: ["shared/**/*.py"],
        outputs: ["generated.txt"],
      }] },
    }));
    await prepareBuildInputs(root, (line) => reports.push(line));
    await writeFile(join(target, "scene.py"), "two", "utf8");
    await prepareBuildInputs(root, (line) => reports.push(line));
    assert.equal(reports.filter((line) => line === "Build input linked: running").length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(target, { recursive: true, force: true });
  }
});
