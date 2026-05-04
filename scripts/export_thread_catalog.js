#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");
const appDir = path.join(repoRoot, "app");
const outputPath = path.join(appDir, "thread-catalog.seed.json");

function runScript(filePath, context) {
  const code = fs.readFileSync(filePath, "utf8");
  vm.runInContext(code, context, { filename: filePath });
}

const context = vm.createContext({
  console,
  window: {},
  globalThis: {}
});
context.window = context.window || {};
context.globalThis = context.window;

runScript(path.join(appDir, "data.js"), context);
runScript(path.join(appDir, "threads.js"), context);

const debatebook = context.window.debatebook;
if (!debatebook || !Array.isArray(debatebook.threadCatalog)) {
  throw new Error("Could not load thread catalog from app bundle.");
}

const allRounds = Array.isArray(debatebook.allDebateRounds) ? debatebook.allDebateRounds : debatebook.debateRounds || [];
const allClaims = Array.isArray(debatebook.claims) ? debatebook.claims : [];
const allSources = Array.isArray(debatebook.sources) ? debatebook.sources : [];
const allAgents = Array.isArray(debatebook.agents) ? debatebook.agents : [];

const payload = debatebook.threadCatalog.map((thread, index) => {
  const rounds = allRounds.filter((round) => round.threadId === thread.id);
  const claims = allClaims.filter((claim) => claim.threadId === thread.id);
  const sourceIds = new Set();
  claims.forEach((claim) => {
    (claim.evidence_source_ids || []).forEach((id) => sourceIds.add(id));
    (claim.counter_source_ids || []).forEach((id) => sourceIds.add(id));
  });
  const sources = allSources.filter((source) => source.threadId === thread.id || sourceIds.has(source.id));
  const agents = allAgents.filter((agent) => (thread.agentIds || []).includes(agent.id));

  return {
    ...thread,
    sortOrder: index,
    agents,
    rounds,
    claims,
    sources
  };
});

fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + "\n");
console.log(`Wrote ${payload.length} threads to ${outputPath}`);
