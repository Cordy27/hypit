import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

type BuildInputDeclaration = {
  readonly id: string;
  readonly command: string;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
};

type PackageManifest = {
  readonly hypit?: { readonly buildInputs?: readonly BuildInputDeclaration[] };
};

type BuildInputState = { readonly [id: string]: string };

function shellCommand(command: string): { file: string; args: string[] } {
  return process.platform === "win32"
    ? { file: process.env.ComSpec ?? "cmd.exe", args: ["/d", "/s", "/c", command] }
    : { file: "/bin/sh", args: ["-c", command] };
}

function runCommand(command: string, cwd: string): Promise<void> {
  const invocation = shellCommand(command);
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(invocation.file, invocation.args, { cwd, env: process.env, stdio: "inherit" });
    child.once("error", rejectPromise);
    child.once("close", (code, signal) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(signal === null ? `exit code ${String(code)}` : `signal ${signal}`));
    });
  });
}

function globToRegExp(pattern: string): RegExp {
  let expression = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*" && pattern[index + 1] === "*") {
      index += 1;
      if (pattern[index + 1] === "/") {
        index += 1;
        expression += "(?:[^/]+/)*";
      } else expression += ".*";
    } else if (character === "*") expression += "[^/]*";
    else expression += (character ?? "").replace(/[.+^${}()|[\]\\]/gu, "\\$&");
  }
  return new RegExp(`${expression}$`, "u");
}

function projectPath(projectRoot: string, value: string, label: string): string {
  if (isAbsolute(value)) throw new Error(`${label} must be project-relative: ${value}`);
  const absolute = resolve(projectRoot, value);
  const pathFromRoot = relative(projectRoot, absolute);
  if (pathFromRoot === ".." || pathFromRoot.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)
    || isAbsolute(pathFromRoot)) {
    throw new Error(`${label} must stay inside the project root: ${value}`);
  }
  return absolute;
}

async function filesUnder(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === ".hypit" || entry.name === "node_modules" || entry.name === ".venv") continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

async function matchingFiles(projectRoot: string, pattern: string): Promise<string[]> {
  if (pattern.includes("?")) throw new Error(`Build input patterns support '*' and '**', not '?': ${pattern}`);
  const absolute = projectPath(projectRoot, pattern, "Build input path");
  if (!/[?*]/u.test(pattern)) {
    try { return (await stat(absolute)).isFile() ? [absolute] : []; } catch { return []; }
  }
  const candidates = await filesUnder(projectRoot);
  const expression = globToRegExp(relative(projectRoot, absolute).replaceAll("\\", "/"));
  return candidates.filter((file) => expression.test(relative(projectRoot, file).replaceAll("\\", "/")));
}

async function fingerprint(projectRoot: string, patterns: readonly string[]): Promise<string> {
  const hash = createHash("sha256");
  const paths = new Set<string>();
  for (const pattern of patterns) for (const path of await matchingFiles(projectRoot, pattern)) paths.add(path);
  for (const path of [...paths].sort()) {
    hash.update(relative(projectRoot, path));
    hash.update(await readFile(path));
  }
  return hash.digest("hex");
}

async function readDeclarations(projectRoot: string): Promise<readonly BuildInputDeclaration[]> {
  let manifest: PackageManifest;
  try { manifest = JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8")) as PackageManifest; }
  catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
  const declarations = manifest.hypit?.buildInputs ?? [];
  if (!Array.isArray(declarations)) throw new Error("package.json hypit.buildInputs must be an array");
  return declarations;
}

export async function prepareBuildInputs(projectRoot: string, report: (line: string) => void): Promise<void> {
  const declarations = await readDeclarations(projectRoot);
  if (declarations.length === 0) return;
  const statePath = join(projectRoot, ".hypit", "build-inputs.json");
  let previous: BuildInputState = {};
  try {
    previous = JSON.parse(await readFile(statePath, "utf8")) as BuildInputState;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  const next: Record<string, string> = {};
  const ids = new Set<string>();
  for (const declaration of declarations) {
    if (!declaration || typeof declaration !== "object"
      || typeof declaration.id !== "string" || declaration.id.length === 0
      || typeof declaration.command !== "string" || declaration.command.length === 0
      || !Array.isArray(declaration.inputs) || declaration.inputs.length === 0
      || !declaration.inputs.every((item) => typeof item === "string")
      || !Array.isArray(declaration.outputs) || declaration.outputs.length === 0
      || !declaration.outputs.every((item) => typeof item === "string" && item.length > 0)) {
      throw new Error(`Invalid hypit.buildInputs declaration: ${declaration.id || "missing id"}`);
    }
    if (ids.has(declaration.id)) throw new Error(`Duplicate hypit.buildInputs id: ${declaration.id}`);
    ids.add(declaration.id);
    for (const input of declaration.inputs) projectPath(projectRoot, input, "Build input path");
    for (const output of declaration.outputs) projectPath(projectRoot, output, "Build output path");
    for (const input of declaration.inputs) {
      if (!/[?*]/u.test(input)) continue;
      const matches = await matchingFiles(projectRoot, input);
      if (matches.length === 0) throw new Error(`Build input pattern matched no files: ${input}`);
    }
    const inputHash = createHash("sha256")
      .update(await fingerprint(projectRoot, declaration.inputs))
      .update(declaration.command)
      .update(JSON.stringify(declaration.outputs))
      .digest("hex");
    const outputsExist = await Promise.all(declaration.outputs.map(async (item) => {
      try { return (await stat(projectPath(projectRoot, item, "Build output path"))).isFile(); } catch { return false; }
    })).then((values) => values.every(Boolean));
    if (outputsExist && previous[declaration.id] === inputHash) {
      next[declaration.id] = inputHash;
      report(`Build input ${declaration.id}: up to date`);
      continue;
    }
    report(`Build input ${declaration.id}: running`);
    try {
      await runCommand(declaration.command, projectRoot);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Build input ${declaration.id} failed (${detail}); no Hypit Build was submitted`);
    }
    const missing = [] as string[];
    for (const item of declaration.outputs) {
      try { if (!(await stat(projectPath(projectRoot, item, "Build output path"))).isFile()) missing.push(item); }
      catch { missing.push(item); }
    }
    if (missing.length > 0) throw new Error(`Build input ${declaration.id} did not produce: ${missing.join(", ")}`);
    next[declaration.id] = inputHash;
    report(`Build input ${declaration.id}: ready`);
  }
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(next, undefined, 2)}\n`, "utf8");
}
