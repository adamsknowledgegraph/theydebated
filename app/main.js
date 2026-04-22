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

const drawer = document.querySelector("#claim-drawer");
const drawerBody = document.querySelector("#drawer-body");
const drawerTitle = document.querySelector("#drawer-title");
const drawerScrim = document.querySelector("#drawer-scrim");
const drawerClose = document.querySelector("#drawer-close");

const storageKeys = {
  reactions: "debatebook.reactions.v1",
  replies: "debatebook.replies.v1",
  submittedSources: "debatebook.submittedSources.v1"
};

const emojiOptions = ["👍", "🤔", "🔥", "🧾", "👀", "⚖️"];
let reactionState = loadJson(storageKeys.reactions, {});
let replyState = loadJson(storageKeys.replies, {});
let submittedSources = loadJson(storageKeys.submittedSources, []);
let conversationTurns = null;
let revealObserver = null;
let claimFilters = {
  query: "",
  believer: "all",
  status: "all",
  claimant: "all"
};

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
  const quirk = agent.quirks?.[0] || agent.oneLine;
  card.append(
    create("strong", "", `${agent.personaName} (${agent.initials})`),
    create("p", "", agent.archetype || agent.oneLine),
    create("p", "", quirk),
    create("span", "mini-chip", agent.sourceDiet.slice(0, 2).join(" + "))
  );
  return card;
}

function agentPortrait(agent) {
  const avatar = create("div", `avatar portrait portrait-${agent.id}`);
  avatar.style.setProperty("--agent-color", agent.color);
  avatar.tabIndex = 0;
  avatar.setAttribute("aria-label", `${agent.name} personality card`);

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
  const cards = [...document.querySelectorAll(".round-card")];
  if (revealObserver) revealObserver.disconnect();

  if (!("IntersectionObserver" in window)) {
    cards.forEach((card) => card.classList.add("is-visible"));
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.16 }
  );

  cards.forEach((card, index) => {
    card.style.transitionDelay = `${Math.min(index * 35, 260)}ms`;
    revealObserver.observe(card);
  });
}

function getConversationTurns() {
  if (conversationTurns) return conversationTurns;
  const roundById = new Map(data.debateRounds.map((round) => [round.id, round]));

  function depthFor(round, seen = new Set()) {
    if (!round.replyTo || round.replyTo === "OP" || seen.has(round.id)) return 0;
    const parent = roundById.get(round.replyTo);
    if (!parent) return 0;
    return Math.min(depthFor(parent, new Set([...seen, round.id])) + 1, 3);
  }

  conversationTurns = data.debateRounds.map((round, index) => {
    const parent = round.replyTo && round.replyTo !== "OP" ? roundById.get(round.replyTo) : null;
    const parentAgent = parent ? agentById.get(parent.speakerId) : null;
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
  return conversationTurns;
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

function renderHeader() {
  document.querySelector("#topic-question").textContent = data.meta.question;
  document.querySelector("#claim-count").textContent = data.claims.length;
  document.querySelector("#source-count").textContent = data.sources.length;
  document.querySelector("#refresh-date").textContent = data.meta.refreshDate;
}

function renderStatusLegend() {
  const statuses = ["verified", "likely", "contested", "unsupported", "superseded", "opinion"];
  const legend = document.querySelector("#status-legend");
  legend.replaceChildren(
    ...statuses.map((status) => {
      const item = create("div", "legend-item");
      item.append(create("span", `status-dot ${statusClass(status)}`), create("span", "", statusLabels[status]));
      return item;
    })
  );
}

function renderDebate() {
  const list = document.querySelector("#debate-rounds");
  const handles = {
    arbiter: "u/mara-vale",
    republican: "u/cal-rourke",
    democratic: "u/nadia-cross"
  };
  const flairs = {
    arbiter: "arbiter mod",
    republican: "force-first advocate",
    democratic: "diplomacy/legal critic"
  };
  const turns = getConversationTurns();
  list.replaceChildren(
    ...turns.map((round, index) => {
      const agent = agentById.get(round.speakerId);
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
      bubble.style.borderColor = agent?.color || "#15171a";

      const meta = create("div", "thread-meta");
      meta.append(
        create("strong", "thread-handle", handles[round.speakerId] || "u/unknown-agent"),
        create("span", "thread-flair", flairs[round.speakerId] || "agent"),
        create("span", "", round.isFollowup ? `reply ${index + 1}` : `comment ${index + 1}`),
        create("span", "", `${round.claimIds.length} receipts`)
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
      const inspectButton = create("button", "thread-action-button", "inspect receipts");
      inspectButton.type = "button";
      inspectButton.addEventListener("click", () => openClaim(round.claimIds[0]));
      actions.append(replyButton, challengeButton, saveButton, inspectButton);

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
          create("span", "", round.teaser || `${round.claimIds.length} receipts attached`)
        );
        collapsedThread.append(summary, bubble, sourceReceiptButton(round.claimIds), reactionBar, replyStack);
        threadBody.append(collapsedThread);
      } else {
        threadBody.append(bubble, sourceReceiptButton(round.claimIds), reactionBar, replyStack);
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
      correction.append(create("span", "", "Correction history"), create("p", "", agent.correctionHistory[0]));
      footer.append(correction);
      card.append(portraitWrap, cardBody, attributes, footer);
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
    const round = data.debateRounds.find((candidate) => candidate.id === momentId);
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
  const root = document.querySelector("#claim-sections");
  const term = claimFilters.query.trim().toLowerCase();
  const visibleClaims = data.claims.filter((claim) => {
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
    summary.textContent = `${visibleClaims.length} of ${data.claims.length} claims shown${activeFilters.length ? ` - ${activeFilters.join(", ")}` : ""}`;
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
  grid.replaceChildren(
    ...data.sources.map((source) => {
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
  renderHeader();
  renderStatusLegend();
  renderDebate();
  renderAgents();
  renderClaims();
  renderSources();
  renderSubmittedSources();
  hydrateSubmittedSources();
  setupTabs();
  setupSearch();
  setupSourceSubmission();
  drawerClose.addEventListener("click", closeDrawer);
  drawerScrim.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer();
  });
}

init();
