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

test("build inputs rebuild when edits preserve the concatenated file bytes", async () => {
  const root = await projectWithBuildInput(
    "node -e \"const fs=require('node:fs');fs.writeFileSync('generated.txt', fs.readFileSync('a','utf8')+':'+fs.readFileSync('b','utf8'))\"",
    ["a", "b"],
  );
  try {
    await writeFile(join(root, "a"), "x");
    await writeFile(join(root, "b"), "by");
    await prepareBuildInputs(root, () => {});
    assert.equal(await readFile(join(root, "generated.txt"), "utf8"), "x:by");
    await writeFile(join(root, "a"), "xb");
    await writeFile(join(root, "b"), "y");
    await prepareBuildInputs(root, () => {});
    assert.equal(await readFile(join(root, "generated.txt"), "utf8"), "xb:y");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("build inputs persist IDs that match object prototype properties", async () => {
  const root = await projectWithBuildInput("node -e \"require('node:fs').writeFileSync('generated.txt', 'ready')\"");
  try {
    const manifestPath = join(root, "package.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.hypit.buildInputs[0].id = "__proto__";
    await writeFile(manifestPath, JSON.stringify(manifest));
    const reports: string[] = [];
    await prepareBuildInputs(root, (line) => reports.push(line));
    await prepareBuildInputs(root, (line) => reports.push(line));
    assert.deepEqual(reports, ["Build input __proto__: running", "Build input __proto__: ready", "Build input __proto__: up to date"]);
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
