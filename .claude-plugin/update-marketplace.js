#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const root = new URL("..", import.meta.url).pathname;
const pluginsDir = join(root, "agentic", "plugins");
const skillsDir = join(root, "agentic", "skills");
const marketplacePath = join(root, ".claude-plugin", "marketplace.json");

const marketplace = JSON.parse(readFileSync(marketplacePath, "utf8"));

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim().replace(/^["']|["']$/g, "");
    result[key] = value;
  }
  return result;
}

function listDirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

const pluginEntries = listDirs(pluginsDir).map((dirName) => {
  const manifestPath = join(pluginsDir, dirName, ".claude-plugin", "plugin.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const existing = marketplace.plugins.find((p) => p.name === manifest.name) ?? {};
  return {
    ...existing,
    name: manifest.name,
    description: manifest.description,
    version: manifest.version,
    author: manifest.author,
    source: `./agentic/plugins/${dirName}`,
  };
});

const skillEntries = listDirs(skillsDir).map((dirName) => {
  const skillPath = join(skillsDir, dirName, "SKILL.md");
  const frontmatter = parseFrontmatter(readFileSync(skillPath, "utf8"));
  const existing = marketplace.plugins.find((p) => p.name === frontmatter.name) ?? {};
  return {
    ...existing,
    name: frontmatter.name,
    description: frontmatter.description,
    source: "./agentic/skills",
    strict: false,
    skills: [`./${dirName}`],
  };
});

const plugins = [...pluginEntries, ...skillEntries];
const generated = JSON.stringify({ ...marketplace, plugins }, null, 2) + "\n";

if (process.argv.includes("--check")) {
  const current = readFileSync(marketplacePath, "utf8");
  if (current !== generated) {
    console.error(".claude-plugin/marketplace.json is out of date — run: make update-marketplace");
    process.exit(1);
  }
  console.log(`.claude-plugin/marketplace.json is up to date: ${plugins.length} plugin(s).`);
} else {
  writeFileSync(marketplacePath, generated);
  console.log(`Updated .claude-plugin/marketplace.json with ${plugins.length} plugin(s).`);
}
