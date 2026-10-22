#!/usr/bin/env node
// Propose .hstack/config.yaml from what is already in a repo.
// Candidate paths live here. Ship, plan, and the step skills read the config
// and do not carry their own paths.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const GITHUB_PATTERNS = ["#(\\d+)", "\\bGH-(\\d+)\\b", "\\bissue-(\\d+)\\b"];
const LINEAR_PATTERNS = ["\\b[A-Z][A-Z0-9]+-\\d+\\b"];
const SPEC_CANDIDATES = ["docs/specs", "specs", "spec", "docs/rfcs", "docs/design"];
const DOCS_CANDIDATES = ["docs"];
const ADR_CANDIDATES = ["docs/adr", "docs/adrs", "adr", "docs/decisions"];
const TICKET_DIRS = ["tickets", "docs/tickets", ".github/tickets", ".workspace/tickets"];
const LINEAR_FILES = [".linear.yml", ".linear.yaml", "linear.json"];
const PR_TEMPLATES = [
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/pull_request_template.md",
  "PULL_REQUEST_TEMPLATE.md",
  "docs/pull_request_template.md",
];
const PR_SCRIPTS = [
  "scripts/create-pr.sh",
  "scripts/create_pr.sh",
  "scripts/create-pr.mjs",
  "scripts/create_pr.mjs",
  "script/create-pr.sh",
];
const PR_PROMPTS = [
  "prompts/create-pr.md",
  "prompts/create_pr.md",
  ".github/prompts/create-pr.md",
  ".github/create-pr.md",
  ".conductor/prompts/create_pr.md",
  "docs/create-pr.md",
];
const CONFLICT_PROMPTS = [
  "prompts/resolve-conflicts.md",
  "prompts/resolve_merge_conflicts.md",
  ".github/prompts/resolve-conflicts.md",
  ".conductor/prompts/resolve_merge_conflicts.md",
];
const RULE_DIRS = [".claude/rules", "docs/rules"];
const SCRIPT_NAMES = ["test", "lint", "typecheck", "check"];

export function skeleton() {
  return {
    version: 1,
    default_branch: null,
    paths: { specs: null, docs: null, adrs: null },
    verify: { commands: [] },
    tickets: {
      system: null,
      id_patterns: [],
      files_dir: null,
      files_are_threads: false,
      create: { command: null },
      comment: { command: null, tool: null, instructions: null },
    },
    pr: { script: null, prompt: null, template: null },
    rebase: { conflict_prompt: null },
    rules: [],
    ship: { forbidden_env: [] },
  };
}

export function detect(root) {
  const config = skeleton();
  const questions = [];

  const branch = detectBranch(root);
  config.default_branch = branch.value;
  if (branch.question) questions.push(branch.question);

  assignDir(config, questions, root, "paths.specs", SPEC_CANDIDATES, {
    id: "paths.specs",
    prompt: "No specs directory found. Where should specs be written?",
    proposed: "docs/specs",
    options: ["docs/specs", "specs", "null"],
  });
  assignDir(config, questions, root, "paths.docs", DOCS_CANDIDATES, null);
  assignDir(config, questions, root, "paths.adrs", ADR_CANDIDATES, null);

  const verify = detectVerify(root);
  config.verify.commands = verify.commands;
  if (verify.question) questions.push(verify.question);

  const tickets = detectTickets(root);
  Object.assign(config.tickets, tickets.tickets);
  questions.push(...tickets.questions);

  const prScript = oneOf(root, PR_SCRIPTS);
  const npmScript = packageScript(root, ["create-pr", "create_pr", "pr:create"]);
  const fileCommand = prScript.one ? shellFile(root, prScript.one) : null;
  if (prScript.many || (fileCommand && npmScript)) {
    const options = prScript.hits.map((hit) => shellFile(root, hit));
    if (npmScript) options.push(npmScript);
    options.push("null");
    questions.push({
      id: "pr.script",
      path: "pr.script",
      prompt: "More than one create-PR command exists.",
      options,
      proposed: null,
    });
  } else if (fileCommand) {
    config.pr.script = fileCommand;
  } else if (npmScript) {
    config.pr.script = npmScript;
  }

  const prompt = oneOf(root, PR_PROMPTS);
  if (prompt.many) {
    questions.push({
      id: "pr.prompt",
      path: "pr.prompt",
      prompt: "More than one create-PR prompt file exists.",
      options: [...prompt.hits, "null"],
      proposed: null,
    });
  } else if (prompt.one) {
    config.pr.prompt = prompt.one;
  }

  const template = oneOf(root, templateCandidates(root));
  if (template.many) {
    questions.push({
      id: "pr.template",
      path: "pr.template",
      prompt: "More than one pull request template exists.",
      options: [...template.hits, "null"],
      proposed: null,
    });
  } else if (template.one) {
    config.pr.template = template.one;
  }

  const conflict = oneOf(root, CONFLICT_PROMPTS);
  if (conflict.many) {
    questions.push({
      id: "rebase.conflict_prompt",
      path: "rebase.conflict_prompt",
      prompt: "More than one conflict-resolution prompt exists.",
      options: [...conflict.hits, "null"],
      proposed: null,
    });
  } else if (conflict.one) {
    config.rebase.conflict_prompt = conflict.one;
  }

  const rules = collectRules(root);
  if (rules.capped) {
    questions.push({
      id: "rules",
      path: "rules",
      prompt: `Found ${rules.total} rule files. The proposal keeps the first 20.`,
      options: ["first 20", "none"],
      proposed: rules.files,
    });
  }
  config.rules = rules.files;

  return { config, questions };
}

export function applyYes(config, questions) {
  const left = [];
  for (const question of questions) {
    if (question.proposed === undefined || question.proposed === null) {
      left.push(question);
      continue;
    }
    setPath(config, question.path, question.proposed);
  }
  return left;
}

export function toYaml(value, indent = 0) {
  const pad = " ".repeat(indent);
  if (value === null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "string") return yamlQuote(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value
      .map((item) => `\n${pad}- ${toYaml(item, indent + 2)}`)
      .join("");
  }
  const lines = [];
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === "object" && !Array.isArray(child)) {
      lines.push(`${pad}${key}:\n${toYaml(child, indent + 2)}`);
    } else if (Array.isArray(child) && child.length > 0) {
      lines.push(`${pad}${key}:${toYaml(child, indent + 2)}`);
    } else {
      lines.push(`${pad}${key}: ${toYaml(child)}`);
    }
  }
  return lines.join("\n");
}

function yamlQuote(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function detectBranch(root) {
  const originHead =
    git(root, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]) ||
    git(root, ["rev-parse", "--abbrev-ref", "origin/HEAD"]);
  if (originHead && !originHead.startsWith("origin/")) {
    return { value: originHead.replace(/^origin\//, ""), question: null };
  }
  if (originHead && originHead.startsWith("origin/")) {
    return { value: originHead.slice("origin/".length), question: null };
  }
  const heads = (git(root, ["for-each-ref", "--format=%(refname:short)", "refs/heads"]) || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const current = git(root, ["symbolic-ref", "--short", "HEAD"]);
  if (heads.includes("main") || (!heads.length && current === "main")) {
    return { value: "main", question: null };
  }
  if (heads.includes("master") || (!heads.length && current === "master")) {
    return { value: "master", question: null };
  }
  return {
    value: null,
    question: {
      id: "default_branch",
      path: "default_branch",
      prompt: current
        ? `No main or master branch, and no origin/HEAD. Current branch is ${current}.`
        : "Not a git checkout, or HEAD has no branch name.",
      options: current ? [current, "main"] : ["main"],
      proposed: current || "main",
    },
  };
}

function assignDir(config, questions, root, keyPath, candidates, ifMissing) {
  const found = candidates.filter((candidate) => isDir(root, candidate));
  if (found.length === 1) {
    setPath(config, keyPath, found[0]);
    return;
  }
  if (found.length > 1) {
    questions.push({
      id: keyPath,
      path: keyPath,
      prompt: `Several directories match ${keyPath}.`,
      options: [...found, "null"],
      proposed: null,
    });
    return;
  }
  if (ifMissing) questions.push({ ...ifMissing, path: keyPath });
}

function detectVerify(root) {
  const packageJson = readJson(root, "package.json");
  if (packageJson && packageJson.scripts && typeof packageJson.scripts === "object") {
    const manager = packageManager(root);
    const commands = SCRIPT_NAMES.filter((name) => packageJson.scripts[name]).map((name) =>
      scriptCommand(manager, name),
    );
    if (commands.length) return { commands, question: null };
    return {
      commands: [],
      question: {
        id: "verify.commands",
        path: "verify.commands",
        prompt: "package.json has no test, lint, typecheck, or check script.",
        options: ["[]"],
        proposed: [],
      },
    };
  }
  if (isFile(root, "Cargo.toml")) return { commands: ["cargo test"], question: null };
  if (isFile(root, "go.mod")) return { commands: ["go test ./..."], question: null };
  if (isFile(root, "pyproject.toml") || isFile(root, "pytest.ini") || isFile(root, "setup.py")) {
    return { commands: ["python -m pytest"], question: null };
  }
  if (makefileHasTest(root)) return { commands: ["make test"], question: null };
  return {
    commands: [],
    question: {
      id: "verify.commands",
      path: "verify.commands",
      prompt: "No test command found.",
      options: ["[]"],
      proposed: [],
    },
  };
}

function detectTickets(root) {
  const questions = [];
  const tickets = skeleton().tickets;
  const github = githubSignal(root);
  const linear = LINEAR_FILES.some((file) => isFile(root, file));
  const dirs = TICKET_DIRS.filter((dir) => isDir(root, dir));
  const signals = [
    github ? "github" : null,
    linear ? "linear" : null,
    dirs.length ? "files" : null,
  ].filter(Boolean);

  if (signals.length > 1 || dirs.length > 1) {
    questions.push({
      id: "tickets.system",
      path: "tickets.system",
      prompt: `More than one ticket home: ${signals.join(", ")}${
        dirs.length > 1 ? ` (${dirs.join(", ")})` : ""
      }.`,
      options: [...new Set(signals), "command"],
      proposed: null,
    });
    return { tickets, questions };
  }

  if (signals[0] === "github") {
    applyAdapter(tickets, "github", null);
    return { tickets, questions };
  }
  if (signals[0] === "linear") {
    applyAdapter(tickets, "linear", null);
    return { tickets, questions };
  }
  if (signals[0] === "files") {
    applyAdapter(tickets, "files", dirs[0]);
    return { tickets, questions };
  }

  questions.push({
    id: "tickets.system",
    path: "tickets.system",
    prompt: "No GitHub, Linear, or ticket-directory signal.",
    options: ["github", "linear", "files", "command"],
    proposed: null,
  });
  return { tickets, questions };
}

function applyAdapter(tickets, system, filesDir) {
  tickets.system = system;
  tickets.files_are_threads = false;
  tickets.create.command = null;
  tickets.comment.tool = null;
  tickets.comment.instructions = null;
  if (system === "github") {
    tickets.id_patterns = [...GITHUB_PATTERNS];
    tickets.files_dir = null;
    tickets.comment.command = "gh issue comment {id} --body-file -";
    return;
  }
  if (system === "linear") {
    tickets.id_patterns = [...LINEAR_PATTERNS];
    tickets.files_dir = null;
    tickets.comment.command = null;
    tickets.comment.tool = "linear";
    return;
  }
  if (system === "files") {
    tickets.id_patterns = [];
    tickets.files_dir = filesDir;
    tickets.comment.command = null;
    return;
  }
  tickets.id_patterns = [];
  tickets.files_dir = null;
  tickets.comment.command = null;
}

function githubSignal(root) {
  const url = git(root, ["remote", "get-url", "origin"]) || "";
  return url.includes("github.com") || isDir(root, ".github");
}

function packageManager(root) {
  if (isFile(root, "bun.lock") || isFile(root, "bun.lockb")) return "bun";
  if (isFile(root, "pnpm-lock.yaml")) return "pnpm";
  if (isFile(root, "yarn.lock")) return "yarn";
  return "npm";
}

function scriptCommand(manager, name) {
  if (name === "test") {
    if (manager === "bun") return "bun run test";
    if (manager === "pnpm") return "pnpm test";
    if (manager === "yarn") return "yarn test";
    return "npm test";
  }
  if (manager === "bun") return `bun run ${name}`;
  if (manager === "pnpm") return `pnpm ${name}`;
  if (manager === "yarn") return `yarn ${name}`;
  return `npm run ${name}`;
}

function packageScript(root, names) {
  const packageJson = readJson(root, "package.json");
  if (!packageJson?.scripts) return null;
  const found = names.find((name) => packageJson.scripts[name]);
  if (!found) return null;
  return scriptCommand(packageManager(root), found);
}

function templateCandidates(root) {
  const extra = [];
  const dir = path.join(root, ".github", "PULL_REQUEST_TEMPLATE");
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    for (const name of fs.readdirSync(dir)) {
      if (name.endsWith(".md")) extra.push(path.posix.join(".github/PULL_REQUEST_TEMPLATE", name));
    }
  }
  return [...PR_TEMPLATES, ...extra];
}

function oneOf(root, candidates) {
  const hits = candidates.filter((candidate) => isFile(root, candidate));
  if (hits.length === 1) return { one: hits[0], many: false, hits };
  if (hits.length > 1) return { one: null, many: true, hits };
  return { one: null, many: false, hits };
}

function shellFile(root, relativePath) {
  const absolute = path.join(root, relativePath);
  const text = fs.readFileSync(absolute, "utf8");
  if (text.startsWith("#!") && isExecutable(absolute)) return relativePath;
  return `sh ${relativePath}`;
}

function collectRules(root) {
  const files = [];
  let total = 0;
  for (const dir of RULE_DIRS) {
    const absolute = path.join(root, dir);
    if (!isDir(root, dir)) continue;
    walk(absolute, (file) => {
      total += 1;
      if (files.length < 20) files.push(path.relative(root, file).split(path.sep).join("/"));
    });
  }
  files.sort();
  return { files, total, capped: total > 20 };
}

function walk(dir, onFile) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, onFile);
    else if (entry.isFile() && entry.name.endsWith(".md")) onFile(full);
  }
}

function setPath(object, keyPath, value) {
  const parts = keyPath.split(".");
  let cursor = object;
  for (const part of parts.slice(0, -1)) cursor = cursor[part];
  cursor[parts[parts.length - 1]] = value;
}

function isDir(root, relativePath) {
  const absolute = path.join(root, relativePath);
  return fs.existsSync(absolute) && fs.statSync(absolute).isDirectory();
}

function isFile(root, relativePath) {
  const absolute = path.join(root, relativePath);
  return fs.existsSync(absolute) && fs.statSync(absolute).isFile();
}

function isExecutable(absolute) {
  try {
    fs.accessSync(absolute, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function readJson(root, relativePath) {
  if (!isFile(root, relativePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
  } catch {
    return null;
  }
}

function makefileHasTest(root) {
  if (!isFile(root, "Makefile")) return false;
  return /^test:/m.test(fs.readFileSync(path.join(root, "Makefile"), "utf8"));
}

function git(root, args) {
  try {
    return execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function printQuestions(questions) {
  if (!questions.length) return;
  console.error("questions:");
  for (const question of questions) {
    console.error(`- id: ${question.id}`);
    console.error(`  prompt: ${question.prompt}`);
    console.error(`  proposed: ${question.proposed === null || question.proposed === undefined ? "null" : JSON.stringify(question.proposed)}`);
    console.error(`  options: ${question.options.join(", ")}`);
  }
}

function header() {
  return [
    "# HStack repo config. Written by /setup-hstack. Commit this file.",
    "# Key reference: schema/config.example.yaml in the HStack package.",
    "",
  ].join("\n");
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) {
    selfTest();
    return;
  }
  if (args.includes("--skeleton")) {
    console.log(header() + toYaml(skeleton()) + "\n");
    return;
  }
  const rootFlag = args.indexOf("--root");
  const root = path.resolve(rootFlag === -1 ? process.cwd() : args[rootFlag + 1]);
  const yes = args.includes("--yes");
  const write = args.includes("--write");
  const force = args.includes("--force");
  const detected = detect(root);
  const questions = yes ? applyYes(detected.config, detected.questions) : detected.questions;
  console.log(header() + toYaml(detected.config) + "\n");
  printQuestions(questions);
  if (!write) return;
  if (questions.length) {
    console.error("refusing to write: unanswered questions remain");
    process.exitCode = 2;
    return;
  }
  const destination = path.join(root, ".hstack", "config.yaml");
  if (fs.existsSync(destination) && !force) {
    console.error(`refusing to overwrite ${destination} without --force`);
    process.exitCode = 3;
    return;
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, header() + toYaml(detected.config) + "\n");
  console.error(`wrote ${destination}`);
}

function selfTest() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hstack-detect-"));
  try {
    assertFullRepo(makeFullRepo(root));
    assertEmptyRepo(makeEmptyRepo(path.join(root, "empty")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log("detect self-test passed");
}

function makeFullRepo(root) {
  const repo = path.join(root, "full");
  fs.mkdirSync(repo, { recursive: true });
  execFileSync("git", ["init", "-b", "main"], { cwd: repo, stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", "https://github.com/example/proof.git"], {
    cwd: repo,
    stdio: "ignore",
  });
  fs.mkdirSync(path.join(repo, "docs/specs"), { recursive: true });
  fs.mkdirSync(path.join(repo, "docs/adr"), { recursive: true });
  fs.mkdirSync(path.join(repo, ".github"), { recursive: true });
  fs.mkdirSync(path.join(repo, ".claude/rules"), { recursive: true });
  fs.mkdirSync(path.join(repo, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(repo, "docs/specs/example.md"), "# Example\n");
  fs.writeFileSync(path.join(repo, "docs/adr/0001.md"), "# ADR\n");
  fs.writeFileSync(path.join(repo, ".github/PULL_REQUEST_TEMPLATE.md"), "## What\n");
  fs.writeFileSync(path.join(repo, ".claude/rules/testing.md"), "# Tests\n");
  fs.writeFileSync(path.join(repo, "scripts/create-pr.sh"), "#!/bin/sh\necho pr\n");
  fs.chmodSync(path.join(repo, "scripts/create-pr.sh"), 0o755);
  fs.writeFileSync(
    path.join(repo, "package.json"),
    JSON.stringify({ name: "proof", scripts: { test: "node --test", lint: "node --check package.json" } }, null, 2),
  );
  fs.writeFileSync(path.join(repo, "package-lock.json"), '{"name":"proof","lockfileVersion":3}\n');
  return repo;
}

function makeEmptyRepo(repo) {
  fs.mkdirSync(repo, { recursive: true });
  execFileSync("git", ["init", "-b", "main"], { cwd: repo, stdio: "ignore" });
  return repo;
}

function assertFullRepo(repo) {
  const { config, questions } = detect(repo);
  const problems = [];
  if (questions.length) problems.push(`unexpected questions: ${questions.map((q) => q.id).join(", ")}`);
  expect(problems, config.default_branch, "main", "default_branch");
  expect(problems, config.paths.specs, "docs/specs", "specs");
  expect(problems, config.paths.docs, "docs", "docs");
  expect(problems, config.paths.adrs, "docs/adr", "adrs");
  expect(problems, config.verify.commands.join("|"), "npm test|npm run lint", "verify");
  expect(problems, config.tickets.system, "github", "tickets");
  expect(problems, config.tickets.comment.command, "gh issue comment {id} --body-file -", "comment");
  expect(problems, config.pr.script, "scripts/create-pr.sh", "pr.script");
  expect(problems, config.pr.template, ".github/PULL_REQUEST_TEMPLATE.md", "template");
  expect(problems, config.rules.join("|"), ".claude/rules/testing.md", "rules");
  if (problems.length) throw new Error(problems.join("\n"));
}

function assertEmptyRepo(repo) {
  const { config, questions } = detect(repo);
  const ids = questions.map((question) => question.id);
  if (!ids.includes("paths.specs")) throw new Error("empty repo should ask about specs");
  if (!ids.includes("tickets.system")) throw new Error("empty repo should ask about tickets");
  if (!ids.includes("verify.commands")) throw new Error("empty repo should ask about verify");
  if (config.default_branch !== "main") throw new Error("empty main repo should find main");
  const left = applyYes(structuredClone(config), questions);
  if (left.some((question) => question.id === "paths.specs")) {
    throw new Error("--yes should accept the proposed specs path");
  }
  if (!left.some((question) => question.id === "tickets.system")) {
    throw new Error("ticket system has no default and must stay a question");
  }
}

function expect(problems, actual, wanted, label) {
  if (actual !== wanted) problems.push(`${label}: expected ${wanted}, got ${actual}`);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isDirectRun) main();
