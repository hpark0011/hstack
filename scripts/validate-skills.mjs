#!/usr/bin/env node
// Checks the HStack package: frontmatter, folder names, workflow links,
// ship's publish safety, and the config skeleton against the example.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { leafPaths, parseYamlSubset } from "./yaml-subset.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = path.join(root, "skills");

const USER_ONLY = new Set(["hstack", "plan", "ship"]);
const PIPELINE = ["review", "resolve", "scope", "simplify", "verify", "pr", "ticket-comment"];

const DENY_IN_SKILLS = [
  "doma",
  "kanban_",
  "task-worktree",
  ".workspace",
  "packages/core",
  "src/main/",
  ".conductor",
  "allow_bare_commit",
  "user_triggered_e2e",
  "fg_912",
  "harness:check",
  "block-harness",
  "block-claim",
  "block-bare-git",
  "block-git-stash",
  "block-full-e2e",
  "error-handling.md",
  "testing.md",
  "buildtaskcompletion",
  "hpark0011",
];

const PRODUCT_TOKENS = ["doma", "kanban_", "task-worktree", "hpark0011", "fg_912", "allow_bare_commit"];

export function checkSkillText(folder, text) {
  const errors = [];
  if (!text.startsWith("---\n")) errors.push(`${folder}: frontmatter must open the file`);
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) {
    errors.push(`${folder}: frontmatter does not close`);
    return errors;
  }
  const frontmatter = text.slice(4, end);
  const body = text.slice(end + 5);
  const parsed = parseFrontmatter(frontmatter, errors, folder);
  if (!parsed) return errors;

  if (parsed.name !== folder) errors.push(`${folder}: name is ${parsed.name}, folder is ${folder}`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parsed.name)) {
    errors.push(`${folder}: name must be lowercase kebab-case`);
  }
  const description = parsed.description.trim();
  if (description.length < 80) errors.push(`${folder}: description is too short to separate it from its siblings`);
  if (description.length > 700) errors.push(`${folder}: description is longer than 700 characters`);
  if (!description.includes("Differs from")) errors.push(`${folder}: description must say how it differs from its siblings`);
  if (parsed.unknown.length) errors.push(`${folder}: unknown frontmatter keys: ${parsed.unknown.join(", ")}`);

  const modelBlocked = parsed.flags["disable-model-invocation"] === "true";
  if (USER_ONLY.has(folder) && !modelBlocked) {
    errors.push(`${folder}: set disable-model-invocation: true so it runs only when invoked`);
  }
  if (!USER_ONLY.has(folder) && modelBlocked) {
    errors.push(`${folder}: leave it model-invocable so a matching request can select it`);
  }

  if (!body.includes(".hstack/config.yaml")) errors.push(`${folder}: must tell the agent to read .hstack/config.yaml`);
  if (!body.includes("setup-hstack")) errors.push(`${folder}: must send a missing config to setup-hstack`);

  const denied = denyHits(body + "\n" + description, DENY_IN_SKILLS);
  if (denied.length) errors.push(`${folder}: hardcoded repo token: ${denied.join(", ")}`);

  const urls = body.match(/https:\/\/github\.com\/[^\s)]+/g) || [];
  for (const url of urls) {
    if (!url.startsWith("https://github.com/brianlovin/agent-config")) {
      errors.push(`${folder}: unexpected GitHub URL ${url}`);
    }
  }

  const links = skillLinks(body);
  for (const link of links) {
    if (!fs.existsSync(path.join(skillsDir, link, "SKILL.md"))) {
      errors.push(`${folder}: links to missing skill ${link}`);
    }
  }

  if (folder === "ship") errors.push(...checkShip(body));
  if (folder === "plan") errors.push(...checkPlan(body));
  if (folder === "hstack") errors.push(...checkEntry(links));
  if (SPEAKS.has(folder) && !body.includes("do not speak")) {
    errors.push(`${folder}: when a workflow calls it, it must return the record and not speak`);
  }
  if ((folder === "plan" || folder === "ship" || folder === "hstack") && !/not narrate|Do not narrate/.test(body)) {
    errors.push(`${folder}: must tell the agent not to narrate stages`);
  }
  return errors;
}

const SPEAKS = new Set([
  "spec",
  "tickets",
  "implement",
  "review",
  "resolve",
  "scope",
  "simplify",
  "verify",
  "pr",
  "ticket-comment",
]);

function checkShip(body) {
  const errors = [];
  if (!body.includes("git push --force-with-lease")) {
    errors.push("ship: rebase push must use git push --force-with-lease");
  }
  if (!body.includes("Stop if the lease is rejected")) errors.push("ship: must stop when the lease is rejected");
  if (!body.includes("Never push `default_branch`")) errors.push("ship: must refuse to push the default branch");
  if (/git push(?:\s+[^\n]*)?\s--force(?!-with-lease)/.test(body)) {
    errors.push("ship: a push uses --force without the lease");
  }
  if (body.includes("gh pr create") || body.includes("gh issue comment") || body.includes("gh issue create")) {
    errors.push("ship: publish commands belong in pr and ticket-comment, not in the workflow");
  }
  const steps = headingLinks(body);
  if (steps.join(",") !== PIPELINE.join(",")) {
    errors.push(`ship: pipeline links are ${steps.join(" -> ") || "(none)"}, expected ${PIPELINE.join(" -> ")}`);
  }
  return errors;
}

function checkPlan(body) {
  const errors = [];
  const steps = headingLinks(body);
  if (steps.join(",") !== "spec,tickets") {
    errors.push(`plan: step links are ${steps.join(" -> ") || "(none)"}, expected spec -> tickets`);
  }
  if (body.includes("gh issue create")) errors.push("plan: ticket creation belongs in the tickets skill");
  const links = skillLinks(body);
  for (const link of links) {
    if (!["spec", "tickets", "setup-hstack"].includes(link)) {
      errors.push(`plan: must not call ${link}`);
    }
  }
  return errors;
}

function checkEntry(links) {
  const errors = [];
  const allowed = new Set(["plan", "implement", "ship", "hstack-help", "setup-hstack"]);
  for (const link of links) {
    if (!allowed.has(link)) errors.push(`hstack: calls ${link}; the entry skill calls workflows, plus implement for the gap between tickets and code`);
  }
  for (const required of ["plan", "implement", "ship"]) {
    if (!links.includes(required)) errors.push(`hstack: missing a handoff to ${required}`);
  }
  return errors;
}

function headingLinks(body) {
  const found = [];
  for (const section of body.split(/\n## /).slice(1)) {
    if (!/^\d+\./.test(section)) continue;
    for (const link of skillLinks(section)) {
      if (!found.includes(link)) found.push(link);
    }
  }
  return found;
}

function skillLinks(text) {
  return [...text.matchAll(/\(\.\.\/([a-z0-9-]+)\/SKILL\.md\)/g)].map((match) => match[1]);
}

function parseFrontmatter(block, errors, folder) {
  const lines = block.split("\n");
  let name = "";
  const description = [];
  const flags = {};
  const unknown = [];
  let mode = null;
  for (const line of lines) {
    if (mode === "description" && /^\s+\S/.test(line)) {
      description.push(line.trim());
      continue;
    }
    mode = null;
    if (!line.trim()) continue;
    const match = line.match(/^([A-Za-z0-9-]+):\s*(.*)$/);
    if (!match) {
      errors.push(`${folder}: cannot read frontmatter line: ${line}`);
      continue;
    }
    const key = match[1];
    const value = match[2].trim();
    if (key === "name") name = value;
    else if (key === "description") {
      if (value === ">" || value === "|") mode = "description";
      else description.push(value);
    } else if (key === "disable-model-invocation") flags[key] = value;
    else unknown.push(key);
  }
  if (!name) errors.push(`${folder}: frontmatter needs a name`);
  if (!description.length) errors.push(`${folder}: frontmatter needs a description`);
  return { name, description: description.join(" "), flags, unknown };
}

function denyHits(text, tokens) {
  const lower = text.toLowerCase();
  return tokens.filter((token) => lower.includes(token));
}

function checkDetector() {
  const errors = [];
  const file = path.join(skillsDir, "setup-hstack", "scripts", "detect.mjs");
  const text = fs.readFileSync(file, "utf8");
  const hits = denyHits(text, PRODUCT_TOKENS);
  if (hits.length) errors.push(`detect.mjs: product token ${hits.join(", ")}`);
  return errors;
}

function checkConfigShape() {
  const errors = [];
  const example = fs.readFileSync(path.join(root, "schema", "config.example.yaml"), "utf8");
  let examplePaths;
  try {
    examplePaths = leafPaths(parseYamlSubset(example)).sort();
  } catch (error) {
    return [`config example: ${error.message}`];
  }
  const skeletonYaml = execFileSync("node", [path.join(skillsDir, "setup-hstack", "scripts", "detect.mjs"), "--skeleton"], {
    encoding: "utf8",
  });
  let skeletonPaths;
  try {
    skeletonPaths = leafPaths(parseYamlSubset(skeletonYaml)).sort();
  } catch (error) {
    return [`config skeleton: ${error.message}`];
  }
  if (examplePaths.join("\n") !== skeletonPaths.join("\n")) {
    errors.push(
      `config example keys differ from the detector skeleton\nexample: ${examplePaths.join(", ")}\nskeleton: ${skeletonPaths.join(", ")}`,
    );
  }
  return errors;
}

function validateTree() {
  const errors = [];
  const folders = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (!folders.length) errors.push("skills/: no skill folders");
  for (const folder of folders) {
    const skillFile = path.join(skillsDir, folder, "SKILL.md");
    if (!fs.existsSync(skillFile)) {
      errors.push(`${folder}: missing SKILL.md`);
      continue;
    }
    errors.push(...checkSkillText(folder, fs.readFileSync(skillFile, "utf8")));
  }
  errors.push(...checkDetector());
  errors.push(...checkConfigShape());
  return errors;
}

function selfTest() {
  const bad = checkSkillText(
    "ship",
    "---\nname: ship\ndescription: >\n  Short.\n---\n\nUses doma and git push --force origin main.\n",
  );
  if (!bad.some((error) => error.toLowerCase().includes("differs from"))) {
    throw new Error("self-test missed a thin description");
  }
  if (!bad.some((error) => error.includes("doma"))) throw new Error("self-test missed the denylist");
  if (!bad.some((error) => error.includes("--force"))) throw new Error("self-test missed a bare force push");
  const goodShip = fs.readFileSync(path.join(skillsDir, "ship", "SKILL.md"), "utf8");
  const shipErrors = checkSkillText("ship", goodShip).filter((error) => error.startsWith("ship:"));
  if (shipErrors.length) throw new Error(shipErrors.join("\n"));
  console.log("validator self-test passed");
}

function main() {
  if (process.argv.includes("--self-test")) selfTest();
  const errors = validateTree();
  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  const count = fs.readdirSync(skillsDir).length;
  console.log(`validated ${count} skills`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
