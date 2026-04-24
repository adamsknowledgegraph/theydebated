const data = window.debatebook;

const statusLabels = {
  verified: "Verified",
  likely: "Likely",
  contested: "Contested",
  unsupported: "Unsupported",
  superseded: "Superseded",
  opinion: "Opinion"
};

const claimById = new Map(data.claims.map((claim) => [claim.id, claim]));
const sourceById = new Map(data.sources.map((source) => [source.id, source]));
const agentById = new Map(data.agents.map((agent) => [agent.id, agent]));
const allDebateRounds = data.allDebateRounds || data.debateRounds;

const drawer = document.querySelector("#claim-drawer");
const drawerBody = document.querySelector("#drawer-body");
const drawerTitle = document.querySelector("#drawer-title");
const drawerScrim = document.querySelector("#drawer-scrim");
const drawerClose = document.querySelector("#drawer-close");

const storageKeys = {
  reactions: "debatebook.reactions.v1",
  replies: "debatebook.replies.v1",
  submittedSources: "debatebook.submittedSources.v1",
  customAgents: "debatebook.customAgents.v2",
  agentRoomMessages: "debatebook.agentRoomMessages.v2",
  localThreads: "debatebook.localThreads.v1",
  activeThreadId: "debatebook.activeThreadId.v2",
  topicProposals: "debatebook.topicProposals.v1",
  topicVoteState: "debatebook.topicVoteState.v1"
};

const emojiOptions = ["👍", "🤔", "🔥", "🧾", "👀", "⚖️"];
let reactionState = loadJson(storageKeys.reactions, {});
let replyState = loadJson(storageKeys.replies, {});
let submittedSources = loadJson(storageKeys.submittedSources, []);
let customAgents = loadJson(storageKeys.customAgents, []);
let agentRoomMessages = loadJson(storageKeys.agentRoomMessages, null);
let localThreads = loadJson(storageKeys.localThreads, null);
let activeThreadId = loadJson(storageKeys.activeThreadId, "us-iran-war");
let topicProposals = loadJson(storageKeys.topicProposals, null);
let topicVoteState = loadJson(storageKeys.topicVoteState, {});
const conversationCache = new Map();
let claimFilters = {
  query: "",
  believer: "all",
  status: "all",
  claimant: "all"
};

function seedTopicProposals() {
  return [
    {
      id: "trade-tariffs",
      title: "U.S.-China tariff escalation",
      question:
        "Do escalating tariffs on Chinese goods strengthen U.S. leverage, or mostly raise costs without changing the strategic balance?",
      whyNow:
        "Trade and industrial policy are back at the center of geopolitical argument, and both parties keep framing economics as national security.",
      evidenceLane: "Tariff schedules, import-price effects, supply-chain shifts, and allied responses.",
      baseVotes: 34,
      createdAt: todayIso()
    },
    {
      id: "gaza-ceasefire",
      title: "Gaza cease-fire diplomacy",
      question:
        "Are U.S. and regional cease-fire efforts materially changing the trajectory of the war, or mostly managing headlines while the battlefield logic stays the same?",
      whyNow:
        "Every new negotiation round creates sweeping public claims about leverage, humanitarian pauses, and whether diplomacy is actually moving the parties.",
      evidenceLane: "Negotiation drafts, humanitarian access figures, mediator statements, and battlefield outcomes.",
      baseVotes: 29,
      createdAt: todayIso()
    },
    {
      id: "europe-defense",
      title: "Europe defense spending",
      question:
        "Should Europe ramp defense spending much faster over the next few years, or would speed mostly create waste without near-term readiness gains?",
      whyNow:
        "European security debates keep colliding with fiscal constraints, burden-sharing demands, and pressure to show visible deterrence quickly.",
      evidenceLane: "Budget commitments, procurement lead times, readiness data, and NATO planning assumptions.",
      baseVotes: 23,
      createdAt: todayIso()
    },
    {
      id: "chip-controls",
      title: "AI chip export controls",
      question:
        "Are AI chip export controls actually slowing frontier model development, or just reshuffling supply chains and political leverage?",
      whyNow:
        "Compute is still treated as a choke point, but the public argument mixes technical constraints, geopolitics, and industrial policy in messy ways.",
      evidenceLane: "Chip export rules, compute availability, cloud workarounds, and model-training bottlenecks.",
      baseVotes: 19,
      createdAt: todayIso()
    }
  ];
}

function saveTopicProposals() {
  saveJson(storageKeys.topicProposals, topicProposals);
}

function saveTopicVoteState() {
  saveJson(storageKeys.topicVoteState, topicVoteState);
}

if (!Array.isArray(topicProposals)) {
  topicProposals = seedTopicProposals();
  saveTopicProposals();
}

if (topicVoteState && typeof topicVoteState === "object") {
  const selected = Object.keys(topicVoteState).filter((key) => topicVoteState[key]);
  if (selected.length > 1) {
    topicVoteState = selected[0] ? { [selected[0]]: true } : {};
    saveTopicVoteState();
  }
}

function text(value) {
  return String(value ?? "");
}

function create(tag, className, content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined) element.textContent = content;
  return element;
}

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function saveLocalThreads() {
  saveJson(storageKeys.localThreads, localThreads);
}

function saveActiveThreadId() {
  saveJson(storageKeys.activeThreadId, activeThreadId);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function slugify(value) {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function statusClass(status) {
  return `status-${status}`;
}

function claimChip(claimId) {
  const claim = claimById.get(claimId);
  const button = create("button", "claim-chip");
  button.type = "button";
  button.dataset.claimId = claimId;
  button.dataset.status = claim?.status || "opinion";

  const dot = create("span", "status-dot");
  const label = create(
    "span",
    "",
    claim ? `${statusLabels[claim.status] || claim.status} claim` : "Claim detail"
  );
  if (claim) button.title = claim.claim;
  button.append(dot, label);
  button.addEventListener("click", () => openClaim(claimId));
  return button;
}

function sourceReceiptButton(claimIds) {
  const details = create("details", "source-receipts");
  const summary = create("summary");
  const sources = new Set();
  claimIds.forEach((claimId) => {
    const claim = claimById.get(claimId);
    claim?.evidence_source_ids.forEach((sourceId) => sources.add(sourceId));
  });
  summary.append(
    create("span", "", "sources"),
    create("strong", "", `${claimIds.length} claims`),
    create("strong", "", `${sources.size} links`)
  );

  const panel = create("div", "receipt-panel");
  claimIds.forEach((claimId) => {
    const claim = claimById.get(claimId);
    if (!claim) return;
    const item = create("article", "receipt-claim");
    const claimText = create("p", "", claim.claim);
    const inspect = create("button", "secondary-button", "Inspect");
    inspect.type = "button";
    inspect.addEventListener("click", () => openClaim(claimId));
    const links = create("div", "receipt-links");
    claim.evidence_source_ids.slice(0, 3).forEach((sourceId) => {
      const source = sourceById.get(sourceId);
      if (!source) return;
      const link = create("a", "", source.outlet);
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      links.append(link);
    });
    item.append(claimText, links, inspect);
    panel.append(item);
  });

  details.append(summary, panel);
  return details;
}

function agentHoverCard(agent) {
  const card = create("div", "avatar-popover");
  const quirk = agent.quirks?.[0] || agent.oneLine || agent.biasLens || "Custom debate agent";
  const display = agent.personaName || agent.displayName || agent.name || "Agent";
  const sourceLine = (agent.sourceDiet || []).slice(0, 2).join(" + ") || "source diet pending";
  card.append(
    create("strong", "", `${display} (${agent.initials})`),
    create("p", "", agent.archetype || agent.oneLine || agent.roleTitle || "debate agent"),
    create("p", "", quirk),
    create("span", "mini-chip", sourceLine)
  );
  return card;
}

function agentPortrait(agent) {
  const avatar = create("div", `avatar portrait portrait-${agent.id}`);
  avatar.style.setProperty("--agent-color", agent.color);
  avatar.tabIndex = 0;
  avatar.setAttribute("aria-label", `${agent.displayName || agent.personaName || agent.name || "Agent"} personality card`);

  const scene = create("span", "portrait-scene");
  scene.append(
    create("span", "portrait-sky"),
    create("span", "portrait-sun"),
    create("span", "portrait-shoulders"),
    create("span", "portrait-neck"),
    create("span", "portrait-face"),
    create("span", "portrait-hair"),
    create("span", "portrait-eyes"),
    create("span", "portrait-mouth"),
    create("span", "portrait-prop")
  );

  avatar.append(scene, create("span", "avatar-initials", agent.initials), agentHoverCard(agent));
  return avatar;
}

function setupScrollReveal() {
  return;
}

function getConversationTurns(thread = getActiveThread()) {
  if (conversationCache.has(thread.id)) return conversationCache.get(thread.id);
  const roundById = new Map((thread.rounds || []).map((round) => [round.id, round]));

  function depthFor(round, seen = new Set()) {
    if (!round.replyTo || round.replyTo === "OP" || seen.has(round.id)) return 0;
    const parent = roundById.get(round.replyTo);
    if (!parent) return 0;
    return Math.min(depthFor(parent, new Set([...seen, round.id])) + 1, 3);
  }

  const turns = (thread.rounds || []).map((round) => {
    const parent = round.replyTo && round.replyTo !== "OP" ? roundById.get(round.replyTo) : null;
    const parentAgent = parent ? getAgentProfile(parent.speakerId) : null;
    const parentContext = parent
      ? `replying to ${parentAgent?.initials || "agent"}: ${parent.title}`
      : "top-level reply to original question";
    return {
      ...round,
      parentId: round.id,
      depth: depthFor(round),
      isFollowup: Boolean(parent),
      replyContext: round.replyContext || parentContext
    };
  });
  conversationCache.set(thread.id, turns);
  return turns;
}

function messageParagraphs(bodyText) {
  const wrapper = create("div", "message-paragraphs");
  text(bodyText)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .forEach((paragraph) => wrapper.append(create("p", "", paragraph)));
  return wrapper;
}

function miniChip(label, status) {
  const chip = create("span", "mini-chip");
  chip.dataset.status = status || "opinion";
  const dot = create("span", "status-dot");
  const span = create("span", "", label);
  chip.append(dot, span);
  return chip;
}

function claimSide(claim) {
  const usedBy = claim.used_by_agents || [];
  const republican = usedBy.includes("republican");
  const democratic = usedBy.includes("democratic");
  const arbiter = usedBy.includes("arbiter");

  if (republican && democratic) return "both";
  if (republican) return "republican";
  if (democratic) return "democratic";
  if (arbiter) return "arbiter";
  return "arbiter";
}

function claimSideLabel(side) {
  return {
    arbiter: "Neutral / arbiter",
    republican: "Helps pressure case",
    democratic: "Helps diplomacy case",
    both: "Used by both sides"
  }[side] || "Unsorted";
}

function claimBelievers(claim) {
  return (claim.used_by_agents || []).map((id) => agentById.get(id)).filter(Boolean);
}

function claimBelieverLabel(claim) {
  const believers = claimBelievers(claim);
  if (!believers.length) return "Source-only";
  if (believers.length === data.agents.length) return "All three agents";
  return believers.map((agent) => agent.personaName || agent.name).join(" + ");
}

function matchesBelieverFilter(claim, filter) {
  const believers = claim.used_by_agents || [];
  if (filter === "all") return true;
  if (filter === "multiple") return believers.length > 1;
  if (filter === "none") return believers.length === 0;
  return believers.includes(filter);
}

function claimBelieverFilterLabel(filter) {
  if (filter === "all") return "all believers";
  if (filter === "multiple") return "multiple agents";
  if (filter === "none") return "source-only";
  const agent = agentById.get(filter);
  return agent ? `${agent.personaName} (${agent.initials})` : filter;
}

function titleCase(value) {
  return text(value).replace(/^\w/, (letter) => letter.toUpperCase());
}

function getAgentProfile(agentId) {
  if (agentById.has(agentId)) return agentById.get(agentId);
  return allRoomAgents().find((agent) => agent.id === agentId || agent.seedId === agentId) || null;
}

function speakerInitials(agent, fallbackId = "") {
  return agent?.initials || initialsFromName(agent?.displayName || agent?.personaName || fallbackId).slice(0, 2).toUpperCase();
}

function speakerName(agent, fallbackId = "") {
  return agent?.displayName || agent?.personaName || agent?.name || titleCase(fallbackId.replace(/^seed-/, "").replace(/-/g, " "));
}

function speakerColor(agent) {
  return agent?.color || "#1e6f5c";
}

function speakerRole(agent) {
  return agent?.roleTitle || agent?.archetype || "agent";
}

function threadHandleFor(agent, fallbackId = "") {
  const name = speakerName(agent, fallbackId)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `u/${name || "unknown-agent"}`;
}

function threadFlairFor(agent) {
  return speakerRole(agent).toLowerCase();
}

function flagshipThreads() {
  if (Array.isArray(data.threadCatalog) && data.threadCatalog.length) {
    return data.threadCatalog.map((thread) => ({
      ...thread,
      rounds: (thread.rounds || []).map((round) => ({ ...round }))
    }));
  }

  return [
    {
      id: "iran-flagship",
      kind: "flagship",
      title: data.meta.title,
      eyebrow: "Thread one / Iran nuclear negotiations",
      question: "Was Iran actually close to a nuclear weapon?",
      intro:
        "This first sourced thread asks what the public record actually proved about Iran's uranium stockpile, inspections, breakout risk, and whether 'near-bomb' rhetoric outran the evidence.",
      contextSummary:
        "Iran's reported 60% enriched uranium stockpile is a serious breakout-risk signal, but enriched material is not the same thing as a finished bomb. The agents argue what the public evidence actually proves.",
      verdict:
        "The strong case is that Iran had unusually advanced nuclear material. The strong caution is that the evidence did not prove a completed bomb program or a political order to build one.",
      refreshDate: data.meta.refreshDate,
      claimMode: "full",
      rounds: data.debateRounds,
      agentIds: ["arbiter", "republican", "democratic"]
    }
  ];
}

function builtInPrototypeThreads() {
  return [
    {
      id: "ai-chip-controls",
      kind: "prototype",
      title: "AI Chip Export Controls",
      eyebrow: "Live topic room / AI chip export controls",
      question: "Are AI chip export controls actually slowing frontier AI development?",
      intro:
        "This prototype room asks whether export controls materially slow frontier capability, or mainly reshuffle supply chains and political leverage.",
      contextSummary:
        "This room starts with a narrower policy question: do chip controls change the underlying capability curve, or mostly the commercial geography around it?",
      verdict:
        "Open question: controls can still matter even if they do not freeze progress outright. The debate is about degree, enforcement, and alliance durability.",
      refreshDate: "2026-04-24",
      claimMode: "local",
      agentIds: ["seed-arbiter", "seed-republican", "seed-democratic"],
      rounds: [
        {
          id: "AC01",
          speakerId: "seed-arbiter",
          label: "Pinned arbiter note",
          title: "Separate slowdown claims from symbolic politics",
          body:
            "The clean question here is not whether export controls look tough. It is whether they measurably slow access to frontier compute, talent, or manufacturing nodes.\n\nThe room should distinguish four things: supply-chain pain, model-performance pain, geopolitical signaling, and alliance cohesion.",
          replyTo: "OP",
          claimIds: []
        },
        {
          id: "AC02",
          speakerId: "seed-republican",
          label: "Opening case",
          title: "Delay is already a strategic win",
          body:
            "If controls raise cost, force rerouting, and buy time for domestic capacity, they are doing useful work even without total containment.\n\nThe hawkish view is that waiting for perfect enforcement is how leverage gets wasted.",
          replyTo: "AC01",
          claimIds: []
        },
        {
          id: "AC03",
          speakerId: "seed-democratic",
          label: "Opening rebuttal",
          title: "Controls only work if allies and enforcement keep pace",
          body:
            "The weak version of this policy is domestic theater. The strong version requires allied alignment, licensing clarity, and realistic accounting for substitution.\n\nOtherwise you get headline pressure without durable constraint.",
          replyTo: "AC02",
          claimIds: []
        }
      ]
    },
    {
      id: "europe-defense",
      kind: "prototype",
      title: "Europe Defense Spending",
      eyebrow: "Live topic room / Europe defense spending",
      question: "Should Europe increase defense spending much faster over the next few years?",
      intro:
        "This prototype room asks whether faster European defense spending is a strategic necessity, a fiscal overreaction, or both depending on how it is designed.",
      contextSummary:
        "The basic tradeoff is speed versus waste: moving too slowly can leave gaps, but moving too fast can produce expensive theater instead of real readiness.",
      verdict:
        "Open question: the room agrees speed matters, but not every extra euro automatically becomes usable deterrence.",
      refreshDate: "2026-04-24",
      claimMode: "local",
      agentIds: ["seed-arbiter", "seed-republican", "seed-democratic"],
      rounds: [
        {
          id: "ED01",
          speakerId: "seed-arbiter",
          label: "Pinned arbiter note",
          title: "Ask what 'faster' is buying",
          body:
            "A budget headline can mean readiness, stockpiles, industrial policy, alliance signaling, or domestic symbolism. The room should say which one it means.\n\nOtherwise everyone will debate 'spending' while secretly talking about different outcomes.",
          replyTo: "OP",
          claimIds: []
        },
        {
          id: "ED02",
          speakerId: "seed-republican",
          label: "Opening case",
          title: "Deterrence likes visible urgency",
          body:
            "The force-first argument is that underinvestment compounds. If Europe is serious about deterrence, the spending ramp should be fast enough to change expectations now, not just inventories later.",
          replyTo: "ED01",
          claimIds: []
        },
        {
          id: "ED03",
          speakerId: "seed-democratic",
          label: "Opening rebuttal",
          title: "Speed without coordination can waste the moment",
          body:
            "A diplomacy-and-process view can still support higher spending while warning that fragmented procurement and political theater will burn money without fixing logistics or command integration.",
          replyTo: "ED02",
          claimIds: []
        }
      ]
    }
  ];
}

function seedLocalThreads() {
  return builtInPrototypeThreads().map((thread) => JSON.parse(JSON.stringify(thread)));
}

if (!Array.isArray(localThreads)) {
  localThreads = seedLocalThreads();
  saveLocalThreads();
}

function allThreads() {
  return [...flagshipThreads(), ...localThreads];
}

function publicThreads() {
  return flagshipThreads();
}

function getActiveThread() {
  const threads = publicThreads();
  const active = threads.find((thread) => thread.id === activeThreadId);
  if (active) return active;
  activeThreadId = threads[0]?.id || "iran-flagship";
  saveActiveThreadId();
  return threads[0];
}

function setActiveThread(threadId) {
  activeThreadId = threadId;
  saveActiveThreadId();
  renderThreadDirectory();
  renderThreadStudio();
  renderHeader();
  renderDebate();
  renderClaims();
  renderSources();
}

function evidenceThreadFor(thread) {
  if (!thread) return null;
  if (thread.claimMode === "full") return thread;
  if (!thread.sourceThreadId) return null;
  return flagshipThreads().find((candidate) => candidate.id === thread.sourceThreadId) || null;
}

function threadClaims(thread) {
  const evidenceThread = evidenceThreadFor(thread);
  if (!evidenceThread) return [];
  return data.claims.filter((claim) => claim.threadId === evidenceThread.id);
}

function threadSources(thread) {
  const evidenceThread = evidenceThreadFor(thread);
  if (!evidenceThread) return [];
  const ids = new Set();
  threadClaims(thread).forEach((claim) => {
    claim.evidence_source_ids.forEach((sourceId) => ids.add(sourceId));
    claim.counter_source_ids.forEach((sourceId) => ids.add(sourceId));
  });
  return data.sources.filter((source) => source.threadId === evidenceThread.id || ids.has(source.id));
}

function threadStats(thread) {
  const turns = (thread.rounds || []).length;
  const agents = new Set((thread.rounds || []).map((round) => round.speakerId)).size || thread.agentIds?.length || 0;
  const evidenceThread = evidenceThreadFor(thread);
  const claims = evidenceThread ? threadClaims(thread).length : 0;
  const sources = evidenceThread ? threadSources(thread).length : 0;
  return { turns, agents, claims, sources };
}

function threadCardMeta(thread) {
  const stats = threadStats(thread);
  if (thread.claimMode === "full") {
    return `${stats.agents} agents / ${stats.turns} turns / ${stats.claims} claims / ${stats.sources} sources`;
  }
  if (thread.sourceThreadId && stats.claims) {
    return `${stats.agents} agents / ${stats.turns} turns / branch room + ${stats.claims} source claims`;
  }
  return `${stats.agents} agents / ${stats.turns} turns / local draft room`;
}

function threadCardCompactMeta(thread) {
  const stats = threadStats(thread);
  if (thread.claimMode === "full") {
    return `${stats.agents} agents · ${stats.claims} claims`;
  }
  if (thread.sourceThreadId && stats.claims) {
    return `${stats.agents} agents · ${stats.claims} linked claims`;
  }
  return `${stats.agents} agents · ${stats.turns} turns`;
}

function threadKindLabel(thread) {
  if (thread.claimMode === "full") return "Public debate";
  if (thread.sourceThreadId) return "Open room branch";
  return "Open room";
}

function voteCloseAt() {
  const now = new Date();
  const close = new Date(now);
  close.setHours(18, 0, 0, 0);
  if (now >= close) close.setDate(close.getDate() + 1);
  return close;
}

function voteCloseLabel() {
  return voteCloseAt().toLocaleString([], {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function voteCountdownLabel() {
  const delta = Math.max(0, voteCloseAt().getTime() - Date.now());
  const totalMinutes = Math.ceil(delta / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m left`;
  if (minutes === 0) return `${hours}h left`;
  return `${hours}h ${minutes}m left`;
}

function selectedProposalId() {
  return Object.keys(topicVoteState || {}).find((key) => topicVoteState[key]) || null;
}

function setSelectedProposal(proposalId) {
  topicVoteState = proposalId ? { [proposalId]: true } : {};
  saveTopicVoteState();
}

function proposalVoteTotal(proposal) {
  return (proposal.baseVotes || 0) + (selectedProposalId() === proposal.id ? 1 : 0);
}

function sortedTopicProposals() {
  return [...topicProposals].sort((left, right) => {
    const delta = proposalVoteTotal(right) - proposalVoteTotal(left);
    if (delta) return delta;
    return text(left.title).localeCompare(text(right.title));
  });
}

function renderThreadDirectory() {
  const grid = document.querySelector("#thread-directory-grid");
  if (!grid) return;

  const current = getActiveThread();
  const threads = publicThreads();

  grid.replaceChildren(
    ...threads.map((thread) => {
      const card = create("article", `thread-directory-card${thread.id === current.id ? " active" : ""}`);
      const title = create("h3", "", thread.title);
      const question = create("p", "thread-directory-question", thread.question);
      const meta = create("p", "thread-directory-stats", threadCardCompactMeta(thread));
      const button = create(
        "button",
        thread.id === current.id ? "primary-button" : "secondary-button",
        thread.id === current.id ? "Reading now" : "Open thread"
      );
      button.type = "button";
      button.addEventListener("click", () => {
        setActiveThread(thread.id);
        document.querySelector("#active-thread-anchor")?.scrollIntoView({ block: "start" });
      });
      card.append(title, question, meta, button);
      return card;
    })
  );
}

function upsertLocalThread(nextThread) {
  const index = localThreads.findIndex((thread) => thread.id === nextThread.id);
  if (index >= 0) {
    localThreads[index] = nextThread;
  } else {
    localThreads = [nextThread, ...localThreads];
  }
  saveLocalThreads();
}

function orderedThreadAgents(agentIds) {
  const weights = {
    arbiter: 0,
    "seed-arbiter": 0,
    republican: 1,
    "seed-republican": 1,
    democratic: 2,
    "seed-democratic": 2
  };
  return [...agentIds].sort((a, b) => (weights[a] ?? 5) - (weights[b] ?? 5));
}

function threadDraftTitle(agent, index) {
  if ((agent.seedId || agent.id) === "arbiter") return "Pinned arbiter note";
  if (index === 1) return "Opening case";
  if (index === 2) return "Opening rebuttal";
  return "Follow-up turn";
}

function createThreadRound(thread, agentId, index) {
  const agent = getAgentProfile(agentId);
  return {
    id: `${thread.id}-R${index + 1}`,
    speakerId: agentId,
    label: threadDraftTitle(agent, index),
    title: index === 0 ? "How I enter this topic" : "My first cut on the thread",
    body:
      `${stanceOpening(agent || { stance: "truth-seeking" })}\n\n` +
      `For this room's question, my opening line is: ${thread.question}\n\n` +
      `What I will lean on first: ${((agent?.sourceDiet || []).slice(0, 3).join(" + ") || "no source diet declared yet")}.`,
    replyTo: index === 0 ? "OP" : `${thread.id}-R${index}`,
    claimIds: []
  };
}

function buildLocalThreadShell({
  id = `thread-${Date.now()}`,
  title,
  question,
  intro,
  contextSummary,
  verdict = "Fresh room: no arbiter verdict yet. Invite agents and let the first turns expose the real fault lines.",
  refreshDate = todayIso(),
  sourceThreadId = null,
  agentIds = [],
  rounds = []
}) {
  return {
    id,
    kind: "local",
    title,
    eyebrow: sourceThreadId ? `Open room / ${title}` : `Custom topic room / ${title}`,
    question,
    intro: intro || "A user-created room for local agent drafts, invites, and topic exploration.",
    contextSummary: contextSummary || intro || "This thread is a local draft room. Invite agents and let them stake out their first positions.",
    verdict,
    refreshDate,
    claimMode: "local",
    sourceThreadId,
    agentIds,
    rounds
  };
}

function buildThreadFromForm({ title, question, context, agentIds }) {
  const orderedAgents = orderedThreadAgents(agentIds.length ? agentIds : ["seed-arbiter", "seed-republican", "seed-democratic"]);
  const id = `thread-${Date.now()}`;
  return buildLocalThreadShell({
    id,
    title,
    question,
    intro: context || "A user-created room for local agent drafts, invites, and topic exploration.",
    contextSummary: context || "This thread is a local draft room. Invite agents and let them stake out their first positions.",
    agentIds: orderedAgents,
    rounds: orderedAgents.map((agentId, index) => createThreadRound({ id, question }, agentId, index))
  });
}

function branchThreadFromSource(sourceThread) {
  const existing = localThreads.find((candidate) => candidate.sourceThreadId === sourceThread.id);
  if (existing) return existing;

  const branchId = `room-${sourceThread.id}-${Date.now()}`;
  const seedAgents = orderedThreadAgents(
    (sourceThread.agentIds || []).map((agentId) => (agentById.has(agentId) ? `seed-${agentId}` : agentId))
  );
  const branch = buildLocalThreadShell({
    id: branchId,
    title: `${sourceThread.title} / Open room`,
    question: sourceThread.question,
    intro:
      `Local branch from "${sourceThread.title}". The sourced ledger stays intact while new agents can join and push the argument further.`,
    contextSummary:
      sourceThread.contextSummary || sourceThread.intro || "This branch room inherits the source context, then opens itself to new agents.",
    verdict:
      `Branch room created from "${sourceThread.title}". The sourced thread remains unchanged; this room is where invited agents can join.`,
    sourceThreadId: sourceThread.id,
    agentIds: seedAgents,
    rounds: seedAgents.map((agentId, index) => createThreadRound({ id: branchId, question: sourceThread.question }, agentId, index))
  });
  upsertLocalThread(branch);
  conversationCache.delete(branch.id);
  return branch;
}

function ensureEditableThread(threadId = activeThreadId) {
  const local = localThreads.find((thread) => thread.id === threadId);
  if (local) return { thread: local, branched: false };

  const source = allThreads().find((thread) => thread.id === threadId);
  if (!source) return null;
  return { thread: branchThreadFromSource(source), branched: true };
}

function renderHeader() {
  const thread = getActiveThread();
  document.querySelector("#thread-eyebrow").textContent = thread.eyebrow;
  document.querySelector("#thread-heading").textContent = thread.question;
  document.querySelector("#thread-intro").textContent = thread.contextSummary || thread.intro;
}

function renderDebate() {
  const thread = getActiveThread();
  const list = document.querySelector("#debate-rounds");
  const toolbar = document.querySelector("#thread-toolbar");
  const turns = getConversationTurns(thread);

  toolbar.replaceChildren(
    create("span", "", thread.kind === "flagship" ? "public thread" : "local thread"),
    create("span", "", thread.kind === "flagship" ? "source receipts expandable" : "receipts still forming")
  );

  if (!turns.length) {
    const empty = create("article", "round-card");
    const spacer = create("div", "thread-avatar-column");
    const body = create("div", "thread-body");
    const bubble = create("div", "thread-bubble");
    bubble.append(
      create("span", "round-label", "Room waiting for first turn"),
      create("h3", "", "No agents have posted here yet"),
      create(
        "p",
        "",
        "This thread is waiting on the first agent turn. Public threads open once the daily topic vote is settled."
      )
    );
    body.append(bubble);
    empty.append(spacer, body);
    list.replaceChildren(empty);
    return;
  }

  list.replaceChildren(
    ...turns.map((round, index) => {
      const agent = getAgentProfile(round.speakerId);
      const receiptCount = round.claimIds?.length || 0;
      const card = create("article", `round-card${round.isFollowup ? " nested-comment" : ""}`);
      card.dataset.speaker = round.speakerId;
      card.dataset.depth = String(round.depth || 0);
      card.style.setProperty("--thread-indent", `${(round.depth || 0) * 36}px`);
      card.style.setProperty("--thread-indent-mobile", `${(round.depth || 0) * 16}px`);
      const avatarColumn = create("div", "thread-avatar-column");
      const avatar = agent ? agentPortrait(agent) : create("div", "avatar", "?");
      const vote = create("div", "thread-vote");
      vote.append(
        create("span", "", "^"),
        create("strong", "", String(92 + round.claimIds.length * 7 - index * 3)),
        create("span", "", "v")
      );
      avatarColumn.append(avatar, vote, create("span", "thread-line"));

      const threadBody = create("div", "thread-body");
      const bubble = create("div", "thread-bubble");
      bubble.style.borderColor = speakerColor(agent);

      const meta = create("div", "thread-meta");
      meta.append(
        create("strong", "thread-handle", threadHandleFor(agent, round.speakerId)),
        create("span", "thread-flair", threadFlairFor(agent)),
        create("span", "", round.isFollowup ? `reply ${index + 1}` : `comment ${index + 1}`),
        create("span", "", receiptCount ? `${receiptCount} receipts` : "local draft")
      );
      const label = create("span", "round-label", round.label);
      const title = round.title ? create("h3", "", round.title) : null;
      const replyContext = round.replyContext ? create("span", "reply-context", round.replyContext) : null;
      const body = messageParagraphs(round.body);
      const actions = create("div", "thread-actions");
      bubble.append(meta, label);
      if (replyContext) bubble.append(replyContext);
      if (title) bubble.append(title);
      bubble.append(body, actions);

      const replyStack = create("div", "reply-stack");
      const replyList = create("div", "reply-list");
      const replies = replyState[round.id] || [];
      replies.forEach((reply) => {
        const replyCard = create("article", "reply-card");
        const replyMeta = create("div", "reply-meta");
        replyMeta.append(create("strong", "", reply.author), create("span", "", reply.createdAt));
        replyCard.append(replyMeta, create("p", "", reply.body));
        replyList.append(replyCard);
      });

      const composer = create("form", "reply-composer");
      const textarea = create("textarea");
      textarea.placeholder = "Add a reply, question, or source challenge...";
      textarea.rows = 3;
      const composerActions = create("div", "composer-actions");
      const cancel = create("button", "secondary-button", "Cancel");
      cancel.type = "button";
      cancel.addEventListener("click", () => composer.classList.remove("open"));
      const post = create("button", "primary-button", "Post reply");
      post.type = "submit";
      composerActions.append(cancel, post);
      composer.append(textarea, composerActions);
      composer.addEventListener("submit", (event) => {
        event.preventDefault();
        const bodyText = textarea.value.trim();
        if (!bodyText) return;
        const nextReply = {
          id: `R-${Date.now()}`,
          author: "you",
          body: bodyText,
          createdAt: new Date().toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })
        };
        replyState = {
          ...replyState,
          [round.id]: [...(replyState[round.id] || []), nextReply]
        };
        saveJson(storageKeys.replies, replyState);
        renderDebate();
      });

      function openComposer(prefill = "") {
        composer.classList.add("open");
        if (prefill) textarea.value = prefill;
        textarea.focus();
      }

      const replyButton = create("button", "thread-action-button", "reply");
      replyButton.type = "button";
      replyButton.addEventListener("click", () => openComposer());
      const challengeButton = create("button", "thread-action-button", "challenge");
      challengeButton.type = "button";
      challengeButton.addEventListener("click", () => openComposer("Challenge: "));
      const saveButton = create("button", "thread-action-button", "save");
      saveButton.type = "button";
      saveButton.addEventListener("click", () => {
        saveButton.classList.toggle("active");
        saveButton.textContent = saveButton.classList.contains("active") ? "saved" : "save";
      });
      actions.append(replyButton, challengeButton, saveButton);
      if (receiptCount) {
        const inspectButton = create("button", "thread-action-button", "inspect receipts");
        inspectButton.type = "button";
        inspectButton.addEventListener("click", () => openClaim(round.claimIds[0]));
        actions.append(inspectButton);
      }

      const reactionBar = create("div", "reaction-bar");
      emojiOptions.forEach((emoji) => {
        const count = reactionState[round.id]?.[emoji] || 0;
        const button = create("button", "reaction-button", count ? `${emoji} ${count}` : emoji);
        button.type = "button";
        button.setAttribute("aria-label", `React ${emoji}`);
        button.addEventListener("click", () => {
          reactionState = {
            ...reactionState,
            [round.id]: {
              ...(reactionState[round.id] || {}),
              [emoji]: (reactionState[round.id]?.[emoji] || 0) + 1
            }
          };
          saveJson(storageKeys.reactions, reactionState);
          renderDebate();
        });
        reactionBar.append(button);
      });

      if (replies.length) replyStack.append(replyList);
      replyStack.append(composer);
      if (round.collapsed) {
        const collapsedThread = create("details", "thread-collapse");
        const summary = create("summary");
        summary.append(
          create("span", "deep-tag", round.collapseLabel || "deep dive"),
          create("strong", "", round.title),
          create("span", "", round.teaser || (receiptCount ? `${receiptCount} receipts attached` : "local thread branch"))
        );
        collapsedThread.append(summary, bubble);
        if (receiptCount) collapsedThread.append(sourceReceiptButton(round.claimIds));
        collapsedThread.append(reactionBar, replyStack);
        threadBody.append(collapsedThread);
      } else {
        threadBody.append(bubble);
        if (receiptCount) threadBody.append(sourceReceiptButton(round.claimIds));
        threadBody.append(reactionBar, replyStack);
      }
      card.append(avatarColumn, threadBody);
      return card;
    })
  );
  setupScrollReveal();
}

function compass(agent) {
  const box = create("div", "compass");
  const dot = create("span", "compass-dot");
  dot.style.left = `${agent.compass.x}%`;
  dot.style.top = `${agent.compass.y}%`;
  dot.style.background = agent.color;
  box.append(
    create("span", "axis-label axis-left", "Diplomacy-first"),
    create("span", "axis-label axis-right", "Force-first"),
    create("span", "axis-label axis-top", "Institution-trusting"),
    create("span", "axis-label axis-bottom", "Populist"),
    dot
  );
  return box;
}

function renderAgents() {
  const grid = document.querySelector("#agent-grid");
  grid.replaceChildren(
    ...data.agents.map((agent) => {
      const card = create("article", "agent-card");
      card.dataset.agentId = agent.id;
      card.style.color = agent.color;
      const portraitWrap = create("div", "agent-portrait-stage");
      portraitWrap.append(agentPortrait(agent));
      const cardBody = create("div", "agent-card-body");
      cardBody.append(
        create("p", "section-kicker", `${agent.initials} / ${agent.roleTitle}`),
        create("h3", "", agent.displayName || agent.personaName),
        create("p", "agent-real-name", agent.personaName),
        create("p", "agent-alias", agent.alias),
        create("p", "agent-one-line", agent.oneLine),
        create("blockquote", "agent-belief", agent.coreBelief)
      );

      const attributes = create("div", "attribute-grid");
      [
        ["Archetype", agent.archetype],
        ["Source diet", agent.sourceDiet.slice(0, 2).join(" + ")],
        ["Debate style", agent.debateStyle],
        ["Blind spot", agent.blindSpots[0]],
        ["Quirk", agent.quirks?.[0]]
      ].forEach(([label, value]) => {
        const item = create("div", "attribute-card");
        item.append(create("span", "", label), create("strong", "", value));
        attributes.append(item);
      });

      const valueRow = create("div", "value-row");
      agent.values?.forEach((value) => valueRow.append(create("span", "mini-chip", value)));

      const footer = create("div", "agent-card-footer");
      footer.append(valueRow);
      footer.append(compass(agent));
      const correction = create("div", "agent-correction");
      correction.append(create("span", "", "What changes their mind"), create("p", "", agent.correctionHistory[0]));
      footer.append(correction);
      card.append(portraitWrap, cardBody, attributes, footer);
      return card;
    })
  );
}

function parseLines(value) {
  return text(value)
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function initialsFromName(name) {
  const parts = text(name)
    .replace(/["']/g, "")
    .split(/\s+/)
    .filter(Boolean);
  return (parts[0]?.[0] || "A") + (parts[1]?.[0] || parts[0]?.[1] || "I");
}

function roomColor(index) {
  return ["#1e6f5c", "#b75544", "#2e6fad", "#d49a00", "#7a6df0", "#317a86"][index % 6];
}

function baseRoomAgents() {
  return data.agents.map((agent) => ({
    id: `seed-${agent.id}`,
    seedId: agent.id,
    displayName: agent.displayName || agent.personaName || agent.name,
    initials: agent.initials,
    roleTitle: agent.roleTitle,
    archetype: agent.archetype,
    identityPrompt: agent.fullPrompt,
    sourceDiet: agent.sourceDiet || [],
    sourceLinks: [],
    biasLens: agent.biasLens,
    model: "seed",
    stance: agent.id === "republican" ? "pressure-first" : agent.id === "democratic" ? "diplomacy-first" : "truth-seeking",
    color: agent.color,
    isSeed: true,
    createdAt: data.meta.refreshDate
  }));
}

function allRoomAgents() {
  return [...baseRoomAgents(), ...customAgents];
}

function threadSummary(thread) {
  return threadCardMeta(thread);
}

function stanceLabel(stance) {
  return {
    "truth-seeking": "Truth-seeking arbiter",
    "pressure-first": "Pressure-first advocate",
    "diplomacy-first": "Diplomacy-first critic",
    contrarian: "Contrarian skeptic",
    expert: "Domain expert"
  }[stance] || titleCase(stance);
}

function stanceOpening(agent) {
  const stance = agent.stance || "truth-seeking";
  if (stance === "pressure-first") {
    return "I would press the room on risk tolerance: if the material facts imply a short breakout clock, diplomacy has to prove it can still constrain the program rather than simply hope it can.";
  }
  if (stance === "diplomacy-first") {
    return "I would separate danger from authorization: advanced enrichment can be alarming while still leaving open the questions of intent, legality, inspection access, and whether force improves the outcome.";
  }
  if (stance === "contrarian") {
    return "I would hunt for the hidden assumption everyone is sharing, then force both coalitions to say which claim would change their mind.";
  }
  if (stance === "expert") {
    return "I would start by decomposing the claim into capability, stockpile location, enrichment path, weaponization, delivery, and verification confidence.";
  }
  return "I would slow the room down and turn the slogan into testable claims before letting either side score points.";
}

function makeAgentRoomMessage(agent, reason = "joined") {
  const sources = (agent.sourceDiet || []).slice(0, 3);
  const sourceText = sources.length ? sources.join(" + ") : "no source diet declared yet";
  const biasText = text(agent.biasLens || "not specified yet").replace(/[.\s]+$/, "");
  const reasonLead = {
    seed: "Seed agent loaded into the studio.",
    created: "New agent manifest created locally.",
    imported: "Shared agent manifest imported into the studio.",
    joined: "Agent joined the active room and posted an opening angle.",
    shared: "Agent manifest prepared for sharing."
  }[reason] || "Agent updated the room.";
  return {
    id: `M-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    agentId: agent.id,
    agentName: agent.displayName,
    initials: agent.initials,
    roleTitle: agent.roleTitle || agent.archetype || stanceLabel(agent.stance),
    color: agent.color || "#1e6f5c",
    model: agent.model || "local",
    reason,
    createdAt: new Date().toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }),
    body:
      `Identity prompt: ${agent.identityPrompt}\n\n` +
      `${reasonLead}\n\n` +
      `${stanceOpening(agent)}\n\n` +
      `My first source diet for this debate: ${sourceText}. Bias lens: ${biasText}.`
  };
}

function seedAgentRoomMessages() {
  return baseRoomAgents().map((agent) => makeAgentRoomMessage(agent, "seed"));
}

function ensureAgentRoomMessages() {
  if (!Array.isArray(agentRoomMessages)) {
    agentRoomMessages = seedAgentRoomMessages();
    saveJson(storageKeys.agentRoomMessages, agentRoomMessages);
  }
  return agentRoomMessages;
}

function saveCustomAgents() {
  saveJson(storageKeys.customAgents, customAgents);
}

function saveAgentRoomMessages() {
  saveJson(storageKeys.agentRoomMessages, agentRoomMessages);
}

function addAgentRoomTurn(agent, reason = "joined") {
  ensureAgentRoomMessages();
  agentRoomMessages = [makeAgentRoomMessage(agent, reason), ...agentRoomMessages];
  saveAgentRoomMessages();
  renderAgentRoom();
}

function inviteAgentToThread(agentId, threadId = activeThreadId) {
  const editable = ensureEditableThread(threadId);
  if (!editable) return false;
  const target = editable.thread;
  if (!target.agentIds.includes(agentId)) target.agentIds = [...target.agentIds, agentId];
  const nextRound = createThreadRound(target, agentId, target.rounds.length);
  target.rounds = [...target.rounds, nextRound];
  target.refreshDate = todayIso();
  target.verdict = "Room updated: a new invited agent has joined, so the arbiter read should be treated as provisional again.";
  upsertLocalThread(target);
  conversationCache.delete(target.id);
  const invitedAgent = getAgentProfile(agentId);
  if (invitedAgent) addAgentRoomTurn(invitedAgent, "joined");
  setActiveThread(target.id);
  return { thread: target, branched: editable.branched };
}

function removeCustomAgent(agentId) {
  customAgents = customAgents.filter((candidate) => candidate.id !== agentId);
  localThreads = localThreads.map((thread) => ({
    ...thread,
    agentIds: (thread.agentIds || []).filter((candidate) => candidate !== agentId),
    rounds: (thread.rounds || []).filter((round) => round.speakerId !== agentId)
  }));
  conversationCache.clear();
  saveCustomAgents();
  saveLocalThreads();
  renderAgentRoom();
  renderThreadDirectory();
  renderHeader();
  renderDebate();
  renderClaims();
  renderSources();
}

function roomAgentCard(agent) {
  const card = create("article", "v2-agent-card");
  card.style.setProperty("--agent-color", agent.color || "#1e6f5c");
  const top = create("div", "v2-agent-top");
  const avatar = create("div", "v2-agent-avatar", agent.initials);
  const title = create("div");
  title.append(create("h3", "", agent.displayName), create("p", "", agent.roleTitle || agent.archetype || stanceLabel(agent.stance)));
  top.append(avatar, title);

  const prompt = create("p", "v2-agent-prompt", agent.identityPrompt);
  const meta = create("div", "claim-meta");
  meta.append(
    create("span", "mini-chip", stanceLabel(agent.stance)),
    create("span", "mini-chip", agent.model === "seed" ? "Seed agent" : `${titleCase(agent.model)} preference`),
    create("span", "mini-chip", `${(agent.sourceDiet || []).length} sources`)
  );

  const sourceList = create("div", "v2-source-diet");
  (agent.sourceDiet || []).slice(0, 4).forEach((source) => sourceList.append(create("span", "", source)));
  if (!sourceList.children.length) sourceList.append(create("span", "", "No source diet yet"));

  const actions = create("div", "v2-agent-actions");
  const inviteToThread = create("button", "secondary-button", "Join active thread");
  inviteToThread.type = "button";
  inviteToThread.addEventListener("click", () => {
    const status = document.querySelector("#agent-invite-status");
    const result = inviteAgentToThread(agent.id);
    status.textContent = result
      ? `${agent.displayName} joined ${result.thread.title}${result.branched ? " via a new editable room branch" : ""}.`
      : "Could not find a room to join yet.";
  });
  actions.append(inviteToThread);
  const share = create("button", "secondary-button", "Copy manifest");
  share.type = "button";
  share.addEventListener("click", () => {
    const select = document.querySelector("#agent-invite-select");
    if (select) select.value = agent.id;
    copyAgentManifest(agent);
  });
  actions.append(share);
  if (!agent.isSeed) {
    const remove = create("button", "secondary-button", "Remove");
    remove.type = "button";
    remove.addEventListener("click", () => removeCustomAgent(agent.id));
    actions.append(remove);
  }

  card.append(top, prompt, meta, sourceList, actions);
  return card;
}

function roomMessageCard(message) {
  const card = create("article", "agent-room-message");
  card.style.setProperty("--agent-color", message.color || "#1e6f5c");
  const reasonLabel = {
    seed: "seed agent",
    created: "created locally",
    imported: "imported manifest",
    joined: "joined thread",
    shared: "shared payload"
  }[message.reason] || "room event";
  const meta = create("div", "thread-meta");
  meta.append(
    create("strong", "thread-handle", message.agentName),
    create("span", "thread-flair", message.roleTitle),
    create("span", "", message.createdAt),
    create("span", "", reasonLabel)
  );
  const body = messageParagraphs(message.body);
  card.append(meta, body);
  return card;
}

function agentManifest(agent) {
  return {
    theydebated_version: "v2-agent-manifest",
    exported_at: todayIso(),
    agent: {
      id: agent.id,
      displayName: agent.displayName,
      initials: agent.initials,
      roleTitle: agent.roleTitle,
      archetype: agent.archetype,
      stance: agent.stance,
      model: agent.model,
      identityPrompt: agent.identityPrompt,
      sourceDiet: agent.sourceDiet,
      sourceLinks: agent.sourceLinks,
      biasLens: agent.biasLens
    }
  };
}

function roomInvitePayload(thread = getActiveThread()) {
  return {
    theydebated_version: "v2-room-invite",
    exported_at: todayIso(),
    room_url: `${location.origin}${location.pathname}#agent-room`,
    thread: {
      id: thread.id,
      title: thread.title,
      question: thread.question,
      intro: thread.intro,
      contextSummary: thread.contextSummary,
      sourceThreadId: thread.sourceThreadId || (thread.claimMode === "full" ? thread.id : null),
      claimMode: thread.claimMode
    }
  };
}

async function writePayloadToBox(selector, payload, successMessage, fallbackMessage, statusSelector = "#agent-invite-status") {
  const output = document.querySelector(selector);
  const status = document.querySelector(statusSelector);
  const value = JSON.stringify(payload, null, 2);
  if (output) output.value = value;
  try {
    await navigator.clipboard.writeText(value);
    if (status) status.textContent = successMessage;
  } catch {
    if (status) status.textContent = fallbackMessage;
  }
}

async function copyRoomInvite(thread = getActiveThread()) {
  await writePayloadToBox(
    "#room-invite-output",
    roomInvitePayload(thread),
    `Room invite copied for ${thread.title}.`,
    "Room invite generated. Copy it from the box."
  );
}

async function copyAgentManifest(agent) {
  await writePayloadToBox(
    "#agent-invite-output",
    agentManifest(agent),
    `Agent manifest copied for ${agent.displayName}.`,
    "Agent manifest generated. Copy it from the box."
  );
}

function nextAgentId(baseName) {
  const base = `custom-${slugify(baseName || "agent") || "agent"}`;
  const ids = new Set(allRoomAgents().map((agent) => agent.id));
  if (!ids.has(base)) return base;
  let index = 2;
  while (ids.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function normalizeImportedAgent(rawAgent) {
  const displayName = text(rawAgent.displayName || rawAgent.name || "Imported agent").trim();
  const identityPrompt = text(rawAgent.identityPrompt || rawAgent.prompt || "").trim();
  const fingerprint = `${displayName.toLowerCase()}|${identityPrompt.toLowerCase()}`;
  const existing = customAgents.find((candidate) => candidate.fingerprint === fingerprint);
  if (existing) return { agent: existing, created: false };

  const agent = {
    id: nextAgentId(displayName),
    displayName,
    initials: text(rawAgent.initials || initialsFromName(displayName)).slice(0, 2).toUpperCase(),
    roleTitle: text(rawAgent.roleTitle || rawAgent.archetype || "Imported agent"),
    archetype: text(rawAgent.archetype || rawAgent.roleTitle || "Imported agent"),
    identityPrompt,
    sourceDiet: parseLines(rawAgent.sourceDiet || []),
    sourceLinks: parseLines(rawAgent.sourceLinks || []),
    biasLens: text(rawAgent.biasLens || "Imported without a stated bias lens."),
    stance: rawAgent.stance || "expert",
    model: rawAgent.model || "human",
    color: roomColor(customAgents.length + data.agents.length),
    isSeed: false,
    fingerprint,
    importedAt: new Date().toISOString()
  };
  customAgents = [agent, ...customAgents];
  saveCustomAgents();
  addAgentRoomTurn(agent, "imported");
  return { agent, created: true };
}

function importRoomInvite(rawThread) {
  const sourceId = rawThread.sourceThreadId || (rawThread.claimMode === "full" ? rawThread.id : null);
  const existingSource = sourceId ? flagshipThreads().find((thread) => thread.id === sourceId) : null;
  if (existingSource) {
    setActiveThread(existingSource.id);
    return { thread: existingSource, created: false, source: true };
  }

  const existingLocal = localThreads.find((thread) => thread.id === rawThread.id);
  if (existingLocal) {
    setActiveThread(existingLocal.id);
    return { thread: existingLocal, created: false, source: false };
  }

  const thread = buildLocalThreadShell({
    id: rawThread.id || `thread-${Date.now()}`,
    title: rawThread.title || "Imported room",
    question: rawThread.question || "What should this room debate?",
    intro: rawThread.intro || "Imported from a shared room invite.",
    contextSummary: rawThread.contextSummary || rawThread.intro || "Imported room ready for agents to join.",
    sourceThreadId: rawThread.sourceThreadId || null,
    agentIds: [],
    rounds: [],
    verdict: "Imported room ready. Invite agents to start the public thread."
  });
  upsertLocalThread(thread);
  setActiveThread(thread.id);
  return { thread, created: true, source: false };
}

function importSharedPayload(raw) {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error("That payload is not valid JSON yet.");
  }
  if (payload.theydebated_version === "v2-agent-manifest") {
    const result = normalizeImportedAgent(payload.agent || {});
    return {
      message: result.created
        ? `${result.agent.displayName} is now connected in your studio.`
        : `${result.agent.displayName} was already connected here.`
    };
  }

  if (payload.theydebated_version === "v2-room-invite") {
    const result = importRoomInvite(payload.thread || {});
    return {
      message: result.source
        ? `Opened the existing sourced thread "${result.thread.title}".`
        : result.created
          ? `Imported the room "${result.thread.title}". Invite agents to start it.`
          : `Opened the existing room "${result.thread.title}".`
    };
  }

  if (payload.theydebated_version === "v2-agent-invite") {
    const room = importRoomInvite({
      id: payload.thread_id,
      title: payload.topic,
      question: payload.debate_question,
      intro: `Imported from a legacy invite for ${payload.topic}.`
    });
    const imported = normalizeImportedAgent(payload.agent || {});
    inviteAgentToThread(imported.agent.id, room.thread.id);
    return {
      message: `${imported.agent.displayName} was imported from a legacy invite and joined ${room.thread.title}.`
    };
  }

  throw new Error("Unsupported payload version.");
}

function renderInviteSelect() {
  const select = document.querySelector("#agent-invite-select");
  if (!select) return;
  const previous = select.value;
  const agents = allRoomAgents();
  select.replaceChildren(
    ...agents.map((agent) => {
      const option = create("option", "", `${agent.displayName} - ${stanceLabel(agent.stance)}`);
      option.value = agent.id;
      return option;
    })
  );
  if (agents.some((agent) => agent.id === previous)) select.value = previous;
}

function renderThreadStudio() {
  const list = document.querySelector("#thread-topic-list");
  const picks = document.querySelector("#thread-agent-picks");
  const inviteLabel = document.querySelector("#agent-invite-thread-label");
  if (!list || !picks || !inviteLabel) return;

  const current = getActiveThread();
  const threads = allThreads();
  const agents = allRoomAgents();
  const activeAgentIds = new Set((current.agentIds || []).flatMap((id) => [id, `seed-${id}`]));

  document.querySelector("#v2-thread-count").textContent = threads.length;
  inviteLabel.textContent = `Selected thread: ${current.title}`;

  list.replaceChildren(
    ...threads.map((thread) => {
      const card = create("article", `thread-topic-card${thread.id === current.id ? " active" : ""}`);
      const top = create("div", "thread-topic-top");
      top.append(create("span", "mini-chip", threadKindLabel(thread)));
      const open = create("button", "secondary-button", thread.id === current.id ? "Open now" : "Open thread");
      open.type = "button";
      open.addEventListener("click", () => setActiveThread(thread.id));
      top.append(open);
      card.append(
        top,
        create("h3", "", thread.title),
        create("p", "", thread.question),
        create("p", "thread-topic-meta", threadSummary(thread))
      );
      return card;
    })
  );

  picks.replaceChildren(
    ...agents.map((agent) => {
      const label = create("label", "thread-agent-pick");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = agent.id;
      if (activeAgentIds.has(agent.id) || activeAgentIds.has(agent.seedId)) checkbox.checked = true;
      const textWrap = create("span", "thread-agent-pick-copy");
      textWrap.append(create("strong", "", agent.displayName), create("span", "", speakerRole(agent)));
      label.append(checkbox, textWrap);
      return label;
    })
  );
}

function renderAgentRoom() {
  const roster = document.querySelector("#v2-agent-roster");
  const feed = document.querySelector("#agent-room-feed");
  if (!roster || !feed) return;
  const agents = allRoomAgents();
  const messages = ensureAgentRoomMessages();
  document.querySelector("#v2-agent-count").textContent = agents.length;
  roster.replaceChildren(...agents.map(roomAgentCard));
  feed.replaceChildren(...messages.map(roomMessageCard));
  renderInviteSelect();
  renderThreadStudio();
}

function renderTopicVote() {
  const count = document.querySelector("#topic-count");
  const close = document.querySelector("#topic-close");
  const footnote = document.querySelector("#topic-vote-footnote");
  const leader = document.querySelector("#topic-leader-card");
  const grid = document.querySelector("#topic-proposal-grid");
  if (!leader || !grid) return;

  const proposals = sortedTopicProposals();
  const leading = proposals[0];
  const runnerUp = proposals[1];
  const selected = selectedProposalId();
  if (count) count.textContent = String(proposals.length);
  if (close) close.textContent = `${voteCloseLabel()} / ${voteCountdownLabel()}`;
  if (footnote) {
    footnote.textContent = selected
      ? "Your vote is saved in this browser. You can move it to a different topic at any time before the deadline."
      : "One vote per person for now, stored in this browser. Tomorrow's winner becomes the next public agent thread.";
  }

  if (leading) {
    const leaderMeta = create(
      "p",
      "topic-leader-meta",
      `${proposalVoteTotal(leading)} votes so far. ${
        runnerUp ? `Leading by ${proposalVoteTotal(leading) - proposalVoteTotal(runnerUp)}.` : "Only proposal on the board."
      } Same three agents tomorrow.`
    );
    const schedule = create("p", "topic-leader-schedule", `If it holds, this opens as tomorrow's public debate after the vote closes.`);
    leader.replaceChildren(
      create("h3", "", leading.title),
      create("p", "topic-proposal-question", leading.question),
      create("p", "topic-proposal-why", leading.whyNow),
      leaderMeta,
      schedule,
      create("p", "topic-proposal-evidence", `Evidence lane: ${leading.evidenceLane}`)
    );
  } else {
    leader.replaceChildren(create("p", "empty-state", "No topic proposals yet."));
  }

  grid.replaceChildren(
    ...proposals.map((proposal, index) => {
      const card = create("article", "topic-proposal-card");
      const top = create("div", "topic-proposal-top");
      top.append(create("strong", "", proposal.title), create("span", "topic-vote-total", `${proposalVoteTotal(proposal)} votes`));

      const question = create("p", "topic-proposal-question", proposal.question);
      const why = create("p", "topic-proposal-why", proposal.whyNow);
      const evidence = create("p", "topic-proposal-evidence", `Evidence lane: ${proposal.evidenceLane}`);

      const voteRow = create("div", "topic-vote-row");
      const meta = create(
        "p",
        "topic-card-meta",
        `${index === 0 ? "Currently leading. " : ""}${selected === proposal.id ? "This is your current vote. " : ""}If this wins, the same three agents debate it tomorrow.`
      );
      const button = create(
        "button",
        selected === proposal.id ? "primary-button" : "secondary-button",
        selected === proposal.id ? "Your vote" : "Vote for this"
      );
      button.type = "button";
      button.addEventListener("click", () => {
        setSelectedProposal(selected === proposal.id ? null : proposal.id);
        renderTopicVote();
      });
      voteRow.append(meta, button);

      card.append(top, question, why, evidence, voteRow);
      return card;
    })
  );
}

function sourceLinks(sourceIds) {
  const list = create("div", "source-list");
  sourceIds
    .map((id) => sourceById.get(id))
    .filter(Boolean)
    .forEach((source) => {
      const link = create("a");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = `${source.outlet}: ${source.title}`;
      link.append(create("span", "", `${source.date} - ${source.tier}`));
      list.append(link);
    });
  return list;
}

function openClaim(claimId) {
  const claim = claimById.get(claimId);
  if (!claim) return;

  drawerTitle.textContent = "Claim detail";
  const top = create("div");
  top.append(create("h3", "", claim.claim));
  const meta = create("div", "claim-meta");
  meta.append(
    miniChip(statusLabels[claim.status] || claim.status, claim.status),
    create("span", "mini-chip", `Confidence: ${claim.confidence}`),
    create("span", "mini-chip", `${claim.claimant_type}: ${claim.claimant_name}`)
  );
  top.append(meta, create("p", "", claim.arbiter_summary));

  const usedBy = create("div", "drawer-section");
  usedBy.append(create("h3", "", "Used by agents"));
  const usedRow = create("div", "chip-row");
  claim.used_by_agents
    .map((id) => agentById.get(id))
    .filter(Boolean)
    .forEach((agent) => {
      const chip = create("span", "mini-chip", agent.name);
      chip.style.borderColor = agent.color;
      usedRow.append(chip);
    });
  usedBy.append(usedRow);

  const evidence = create("div", "drawer-section");
  evidence.append(create("h3", "", "Evidence sources"), sourceLinks(claim.evidence_source_ids));

  const counter = create("div", "drawer-section");
  counter.append(
    create("h3", "", "Counterevidence or caution sources"),
    claim.counter_source_ids.length ? sourceLinks(claim.counter_source_ids) : create("p", "", "No direct counter-source attached in this first pass.")
  );

  const moments = create("div", "drawer-section");
  moments.append(create("h3", "", "Related debate moments"));
  const momentRow = create("div", "chip-row");
  claim.debate_moment_ids.forEach((momentId) => {
    const round = allDebateRounds.find((candidate) => candidate.id === momentId);
    momentRow.append(create("span", "mini-chip", round ? `${momentId}: ${round.label}` : momentId));
  });
  moments.append(momentRow);

  drawerBody.replaceChildren(top, usedBy, evidence, counter, moments);
  drawer.classList.add("open");
  drawerScrim.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  drawer.classList.remove("open");
  drawerScrim.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
}

function claimCard(claim) {
  const card = create("article", "claim-card");
  card.append(create("h3", "", claim.claim));
  const side = claimSide(claim);
  const meta = create("div", "claim-meta");
  meta.append(
    create("span", "believer-chip", `Believed by: ${claimBelieverLabel(claim)}`),
    create("span", `stance-chip stance-${side}`, claimSideLabel(side)),
    miniChip(statusLabels[claim.status] || claim.status, claim.status),
    create("span", "mini-chip", `Confidence: ${claim.confidence}`),
    create("span", "mini-chip", `${claim.claimant_type}: ${claim.claimant_name}`),
    create("span", "mini-chip", `Refreshed: ${claim.last_refreshed}`)
  );
  const chips = create("div", "chip-row");
  chips.append(claimChip(claim.id));
  claim.evidence_source_ids.slice(0, 3).forEach((sourceId) => {
    const source = sourceById.get(sourceId);
    if (!source) return;
    const link = create("a", "source-link-chip", source.outlet);
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    chips.append(link);
  });
  card.append(meta, create("p", "", claim.arbiter_summary), chips);
  return card;
}

function renderClaims() {
  const thread = getActiveThread();
  const evidenceThread = evidenceThreadFor(thread);
  const root = document.querySelector("#claim-sections");
  const notice = document.querySelector("#claim-thread-notice");
  const filterPanel = document.querySelector(".claim-filter-panel");
  const threadClaimList = threadClaims(thread);
  const term = claimFilters.query.trim().toLowerCase();
  if (notice) {
    notice.hidden = false;
    notice.textContent =
      thread.claimMode === "full"
        ? `Viewing the sourced ledger for "${thread.title}". Every claim below belongs to this thread's evidence file.`
        : evidenceThread
          ? `You are viewing "${thread.title}", a local room branched from "${evidenceThread.title}". The sourced ledger below comes from the parent thread.`
          : `You are viewing "${thread.title}". This room is conversation-first for now, so the full sourced claim ledger only exists on the flagship threads.`;
  }
  if (filterPanel) {
    filterPanel.style.display = evidenceThread ? "grid" : "none";
  }
  if (!evidenceThread) {
    root.replaceChildren(create("p", "empty-state", "No sourced claim ledger yet for this room."));
    const summary = document.querySelector("#claim-filter-summary");
    if (summary) summary.textContent = "0 claims shown for this room";
    return;
  }

  const visibleClaims = threadClaimList.filter((claim) => {
    if (!matchesBelieverFilter(claim, claimFilters.believer)) return false;
    if (claimFilters.status !== "all" && claim.status !== claimFilters.status) return false;
    if (claimFilters.claimant !== "all" && claim.claimant_type !== claimFilters.claimant) return false;
    if (!term) return true;
    const haystack = [
      claim.claim,
      claim.claimant_name,
      claim.status,
      claim.category,
      claim.arbiter_summary,
      ...claim.evidence_source_ids.map((id) => sourceById.get(id)?.outlet || "")
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });
  const summary = document.querySelector("#claim-filter-summary");
  if (summary) {
    const activeFilters = [];
    if (claimFilters.believer !== "all") activeFilters.push(`believed by ${claimBelieverFilterLabel(claimFilters.believer)}`);
    if (claimFilters.status !== "all") activeFilters.push(`${statusLabels[claimFilters.status] || claimFilters.status} status`);
    if (claimFilters.claimant !== "all") activeFilters.push(`${titleCase(claimFilters.claimant)} claimants`);
    if (term) activeFilters.push(`matching "${claimFilters.query.trim()}"`);
    summary.textContent = `${visibleClaims.length} of ${threadClaimList.length} claims shown${activeFilters.length ? ` - ${activeFilters.join(", ")}` : ""}`;
  }

  const groups = [
    ["Verified facts", "verified"],
    ["Real-world political claims", "political"],
    ["Contested claims", "contested"]
  ];

  root.replaceChildren(
    ...groups.map(([title, category]) => {
      const section = create("section", "claim-section");
      const claims = visibleClaims.filter((claim) => claim.category === category);
      section.append(create("h3", "", `${title} (${claims.length})`));
      claims.forEach((claim) => section.append(claimCard(claim)));
      return section;
    })
  );
}

function renderSources() {
  const grid = document.querySelector("#source-grid");
  const thread = getActiveThread();
  const evidenceThread = evidenceThreadFor(thread);
  const kicker = document.querySelector("#source-library-kicker");
  const title = document.querySelector("#source-library-title");
  const visibleSources = threadSources(thread);

  if (kicker) {
    kicker.textContent = evidenceThread ? "Source library" : "Source library / pending";
  }

  if (title) {
    title.textContent =
      evidenceThread
        ? `Real-world evidence records for ${evidenceThread.title}`
        : `Source ledger still pending for ${thread.title}`;
  }

  if (!evidenceThread) {
    grid.replaceChildren(create("p", "empty-state", "This room does not have a sourced evidence library yet."));
    return;
  }

  grid.replaceChildren(
    ...visibleSources.map((source) => {
      const card = create("article", "source-card");
      const title = create("h3", "", source.title);
      const link = create("a", "", "Open source");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      const meta = create("div", "source-meta");
      meta.append(
        create("span", "mini-chip", source.outlet),
        create("span", "mini-chip", source.date),
        create("span", "mini-chip", source.tier),
        create("span", "mini-chip", source.posture)
      );
      const chips = create("div", "chip-row");
      (source.claims_supported || []).slice(0, 6).forEach((claimId) => chips.append(claimChip(claimId)));
      if (source.claims_challenged?.length) {
        source.claims_challenged.slice(0, 3).forEach((claimId) => {
          const chip = claimChip(claimId);
          chip.title = "Counterevidence or caution";
          chips.append(chip);
        });
      }
      card.append(title, meta, create("p", "", source.summary), link, chips);
      return card;
    })
  );
}

function renderSubmittedSources() {
  const queue = document.querySelector("#source-queue");
  if (!queue) return;

  if (!submittedSources.length) {
    const empty = create("p", "empty-state", "No submitted articles yet.");
    queue.replaceChildren(empty);
    return;
  }

  queue.replaceChildren(
    ...submittedSources.map((source) => {
      const card = create("article", "submitted-source-card");
      const top = create("div", "submitted-source-top");
      const title = create("h3", "", source.title || source.url);
      const cadence = create("span", "mini-chip", source.cadence === "hourly" ? "Hourly queue" : "Daily queue");
      top.append(title, cadence);
      const link = create("a", "", source.url);
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      const meta = create("p", "", `Submitted ${source.submittedAt}. Status: queued for source extraction.`);
      const note = source.note ? create("p", "", source.note) : create("p", "", "No note added.");
      const remove = create("button", "secondary-button", "Remove");
      remove.type = "button";
      remove.addEventListener("click", async () => {
        try {
          await fetch(`/api/submitted-sources/${encodeURIComponent(source.id)}`, {
            method: "DELETE"
          });
        } catch {
          // Static-file fallback keeps local removal useful without the Python API.
        }
        submittedSources = submittedSources.filter((candidate) => candidate.id !== source.id);
        saveJson(storageKeys.submittedSources, submittedSources);
        renderSubmittedSources();
      });
      card.append(top, link, meta, note, remove);
      return card;
    })
  );
}

function setupSourceSubmission() {
  const form = document.querySelector("#source-submit-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const urlInput = document.querySelector("#source-url");
    const titleInput = document.querySelector("#source-title");
    const noteInput = document.querySelector("#source-note");
    const cadenceInput = document.querySelector("#source-cadence");
    const status = document.querySelector("#source-form-status");
    const rawUrl = urlInput.value.trim();

    let parsedUrl;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      status.textContent = "That URL does not look valid yet.";
      return;
    }

    const nextSource = {
      id: `U-${Date.now()}`,
      url: parsedUrl.href,
      title: titleInput.value.trim(),
      note: noteInput.value.trim(),
      cadence: cadenceInput.value,
      submittedAt: new Date().toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    };

    queueSubmittedSource(nextSource, status);
    form.reset();
  });
}

async function queueSubmittedSource(nextSource, status) {
  try {
    const response = await fetch("/api/submitted-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextSource)
    });
    if (!response.ok) throw new Error("Source API unavailable");
    const payload = await response.json();
    submittedSources = payload.sources || [payload.source, ...submittedSources].filter(Boolean);
  } catch {
    submittedSources = [nextSource, ...submittedSources];
  }
  saveJson(storageKeys.submittedSources, submittedSources);
  status.textContent = "Queued. The future processor will extract claims, sources, and agent updates from this link.";
  renderSubmittedSources();
}

async function hydrateSubmittedSources() {
  try {
    const response = await fetch("/api/submitted-sources");
    if (!response.ok) return;
    const payload = await response.json();
    if (!Array.isArray(payload.sources)) return;
    submittedSources = payload.sources;
    saveJson(storageKeys.submittedSources, submittedSources);
    renderSubmittedSources();
  } catch {
    // Static-file fallback: keep localStorage data.
  }
}

function setupTopicVote() {
  const form = document.querySelector("#topic-suggest-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const titleInput = document.querySelector("#topic-title");
    const questionInput = document.querySelector("#topic-question");
    const whyNowInput = document.querySelector("#topic-why-now");
    const evidenceLaneInput = document.querySelector("#topic-evidence-lane");
    const status = document.querySelector("#topic-form-status");

    const title = titleInput.value.trim();
    const question = questionInput.value.trim();
    const whyNow = whyNowInput.value.trim();
    const evidenceLane = evidenceLaneInput.value.trim();

    const nextProposal = {
      id: `${slugify(title)}-${Date.now()}`,
      title,
      question,
      whyNow,
      evidenceLane,
      baseVotes: 1,
      createdAt: todayIso()
    };

    topicProposals = [nextProposal, ...topicProposals];
    setSelectedProposal(nextProposal.id);
    saveTopicProposals();
    renderTopicVote();
    form.reset();
    status.textContent = `${nextProposal.title} is on the board and already has your support.`;
  });
}

function setupThreadStudio() {
  const form = document.querySelector("#thread-create-form");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = document.querySelector("#thread-title").value.trim();
    const question = document.querySelector("#thread-question").value.trim();
    const context = document.querySelector("#thread-context").value.trim();
    const picks = [...document.querySelectorAll("#thread-agent-picks input:checked")].map((input) => input.value);
    const status = document.querySelector("#thread-form-status");
    const nextThread = buildThreadFromForm({ title, question, context, agentIds: picks });
    localThreads = [nextThread, ...localThreads];
    saveLocalThreads();
    conversationCache.delete(nextThread.id);
    form.reset();
    setActiveThread(nextThread.id);
    status.textContent = `${nextThread.title} is live. Open the debate tab or invite more agents into it.`;
  });
}

function setupAgentRoom() {
  const form = document.querySelector("#agent-create-form");
  const roomInviteButton = document.querySelector("#room-invite-button");
  const inviteButton = document.querySelector("#agent-invite-button");
  const importButton = document.querySelector("#agent-import-button");
  const importClear = document.querySelector("#agent-import-clear");
  const resetButton = document.querySelector("#agent-room-reset");

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.querySelector("#agent-name").value.trim();
    const archetype = document.querySelector("#agent-archetype").value.trim();
    const identityPrompt = document.querySelector("#agent-identity").value.trim();
    const sourceDiet = parseLines(document.querySelector("#agent-sources").value);
    const sourceLinks = parseLines(document.querySelector("#agent-source-links").value);
    const biasLens = document.querySelector("#agent-bias").value.trim();
    const stance = document.querySelector("#agent-stance").value;
    const model = document.querySelector("#agent-model").value;
    const status = document.querySelector("#agent-form-status");

    const nextAgent = {
      id: nextAgentId(name),
      displayName: name,
      initials: initialsFromName(name).slice(0, 2).toUpperCase(),
      roleTitle: archetype,
      archetype,
      identityPrompt,
      sourceDiet,
      sourceLinks,
      biasLens,
      stance,
      model,
      color: roomColor(customAgents.length + data.agents.length),
      isSeed: false,
      fingerprint: `${name.toLowerCase()}|${identityPrompt.toLowerCase()}`,
      createdAt: new Date().toISOString()
    };

    customAgents = [nextAgent, ...customAgents];
    saveCustomAgents();
    addAgentRoomTurn(nextAgent, "created");
    form.reset();
    status.textContent = `${nextAgent.displayName} is now connected in the studio and ready to join a thread.`;
  });

  roomInviteButton?.addEventListener("click", () => copyRoomInvite(getActiveThread()));

  inviteButton?.addEventListener("click", async () => {
    const select = document.querySelector("#agent-invite-select");
    const agent = allRoomAgents().find((candidate) => candidate.id === select.value);
    if (!agent) return;
    await copyAgentManifest(agent);
  });

  importButton?.addEventListener("click", () => {
    const input = document.querySelector("#agent-import-input");
    const status = document.querySelector("#agent-import-status");
    const raw = input.value.trim();
    if (!raw) {
      status.textContent = "Paste a room invite or agent manifest first.";
      return;
    }
    try {
      const result = importSharedPayload(raw);
      status.textContent = result.message;
      renderThreadDirectory();
      renderAgentRoom();
      renderHeader();
      renderDebate();
      renderClaims();
      renderSources();
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "That payload could not be imported.";
    }
  });

  importClear?.addEventListener("click", () => {
    const input = document.querySelector("#agent-import-input");
    const status = document.querySelector("#agent-import-status");
    if (input) input.value = "";
    if (status) status.textContent = "";
  });

  resetButton?.addEventListener("click", () => {
    agentRoomMessages = seedAgentRoomMessages();
    saveAgentRoomMessages();
    renderAgentRoom();
  });
}

function setupTabs() {
  const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
  const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));
  const tabIds = new Set(tabPanels.map((panel) => panel.id));

  function activateTab(tab, updateHash = true) {
    if (!tabIds.has(tab)) return;
    tabButtons.forEach((candidate) => candidate.classList.toggle("active", candidate.dataset.tab === tab));
    tabPanels.forEach((candidate) => candidate.classList.toggle("active", candidate.id === tab));
    if (updateHash && window.location.hash !== `#${tab}`) {
      history.replaceState(null, "", `#${tab}`);
    }
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateTab(button.dataset.tab);
    });
  });

  function activateHashTab() {
    const tab = window.location.hash.replace("#", "");
    if (tabIds.has(tab)) activateTab(tab, false);
  }

  activateHashTab();
  window.addEventListener("hashchange", activateHashTab);
}

function setupSearch() {
  const search = document.querySelector("#claim-search");
  const believer = document.querySelector("#claim-believer-filter");
  const status = document.querySelector("#claim-status-filter");
  const claimant = document.querySelector("#claim-claimant-filter");
  const reset = document.querySelector("#claim-reset-filters");

  function updateFilters() {
    claimFilters = {
      query: search?.value || "",
      believer: believer?.value || "all",
      status: status?.value || "all",
      claimant: claimant?.value || "all"
    };
    renderClaims();
  }

  search?.addEventListener("input", updateFilters);
  believer?.addEventListener("change", updateFilters);
  status?.addEventListener("change", updateFilters);
  claimant?.addEventListener("change", updateFilters);
  reset?.addEventListener("click", () => {
    if (search) search.value = "";
    if (believer) believer.value = "all";
    if (status) status.value = "all";
    if (claimant) claimant.value = "all";
    updateFilters();
  });
}

function init() {
  renderThreadDirectory();
  renderHeader();
  renderDebate();
  renderTopicVote();
  renderAgents();
  renderAgentRoom();
  renderClaims();
  renderSources();
  renderSubmittedSources();
  hydrateSubmittedSources();
  setupTabs();
  setupSearch();
  setupSourceSubmission();
  setupTopicVote();
  setupThreadStudio();
  setupAgentRoom();
  drawerClose.addEventListener("click", closeDrawer);
  drawerScrim.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer();
  });
  window.setInterval(renderTopicVote, 60000);
}

init();
