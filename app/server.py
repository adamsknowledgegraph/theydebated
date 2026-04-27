#!/usr/bin/env python3
import json
import sqlite3
import sys
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import URLError
from urllib.parse import parse_qs, unquote, urlparse
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

APP_ROOT = Path(__file__).resolve().parent
DB_PATH = APP_ROOT / "debatebook.sqlite3"
LEGACY_QUEUE_PATH = APP_ROOT / "submitted-sources.json"
APP_TIMEZONE = ZoneInfo("Europe/Paris")

SEED_TOPIC_PROPOSALS = [
    {
        "slug": "trade-tariffs",
        "title": "U.S.-China tariff escalation",
        "question": "Do escalating tariffs on Chinese goods strengthen U.S. leverage, or mostly raise costs without changing the strategic balance?",
        "why_now": "Trade and industrial policy are back at the center of geopolitical argument, and both parties keep framing economics as national security.",
        "evidence_lane": "Tariff schedules, import-price effects, supply-chain shifts, and allied responses.",
        "base_votes": 34,
    },
    {
        "slug": "gaza-ceasefire",
        "title": "Gaza cease-fire diplomacy",
        "question": "Are U.S. and regional cease-fire efforts materially changing the trajectory of the war, or mostly managing headlines while the battlefield logic stays the same?",
        "why_now": "Every new negotiation round creates sweeping public claims about leverage, humanitarian pauses, and whether diplomacy is actually moving the parties.",
        "evidence_lane": "Negotiation drafts, humanitarian access figures, mediator statements, and battlefield outcomes.",
        "base_votes": 29,
    },
    {
        "slug": "europe-defense",
        "title": "Europe defense spending",
        "question": "Should Europe ramp defense spending much faster over the next few years, or would speed mostly create waste without near-term readiness gains?",
        "why_now": "European security debates keep colliding with fiscal constraints, burden-sharing demands, and pressure to show visible deterrence quickly.",
        "evidence_lane": "Budget commitments, procurement lead times, readiness data, and NATO planning assumptions.",
        "base_votes": 23,
    },
    {
        "slug": "chip-controls",
        "title": "AI chip export controls",
        "question": "Are AI chip export controls actually slowing frontier model development, or just reshuffling supply chains and political leverage?",
        "why_now": "Compute is still treated as a choke point, but the public argument mixes technical constraints, geopolitics, and industrial policy in messy ways.",
        "evidence_lane": "Chip export rules, compute availability, cloud workarounds, and model-training bottlenecks.",
        "base_votes": 19,
    },
]

NEWS_FEEDS = [
    ("Reuters World", "https://feeds.reuters.com/Reuters/worldNews"),
    ("Reuters Politics", "https://feeds.reuters.com/Reuters/PoliticsNews"),
    ("Reuters Business", "https://feeds.reuters.com/reuters/businessNews"),
    ("Google News", "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en"),
]

SCHEMA = """
CREATE TABLE IF NOT EXISTS vote_cycles (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    opens_at TEXT NOT NULL,
    closes_at TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS topic_proposals (
    id TEXT PRIMARY KEY,
    cycle_id TEXT NOT NULL,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    question TEXT NOT NULL,
    why_now TEXT NOT NULL DEFAULT '',
    evidence_lane TEXT NOT NULL DEFAULT '',
    base_votes INTEGER NOT NULL DEFAULT 0,
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (cycle_id) REFERENCES vote_cycles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS topic_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_id TEXT NOT NULL,
    proposal_id TEXT NOT NULL,
    voter_token TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (cycle_id, voter_token),
    FOREIGN KEY (cycle_id) REFERENCES vote_cycles(id) ON DELETE CASCADE,
    FOREIGN KEY (proposal_id) REFERENCES topic_proposals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    round_id TEXT NOT NULL,
    parent_id TEXT,
    author_name TEXT NOT NULL,
    voter_token TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_thread_round ON comments(thread_id, round_id, created_at);

CREATE TABLE IF NOT EXISTS submitted_sources (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    cadence TEXT NOT NULL DEFAULT 'daily',
    submitted_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued'
);
"""


def iso_now_utc():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def to_local_display(iso_value):
    try:
        dt = datetime.fromisoformat(iso_value.replace("Z", "+00:00")).astimezone(APP_TIMEZONE)
    except ValueError:
        return iso_value
    return dt.strftime("%b %d, %H:%M")


def slugify(value):
    lowered = "".join(ch.lower() if ch.isalnum() else "-" for ch in str(value))
    while "--" in lowered:
        lowered = lowered.replace("--", "-")
    return lowered.strip("-") or "topic"


def display_name_for_token(voter_token):
    token = str(voter_token or "").strip().upper()
    suffix = (token.replace("-", "")[:4] or "GUEST").ljust(4, "0")
    return f"guest-{suffix}"


def read_json_body(handler):
    try:
        length = int(handler.headers.get("Content-Length", "0"))
    except ValueError:
        return None, "Invalid Content-Length header"
    try:
        payload = json.loads(handler.rfile.read(length) or b"{}")
    except json.JSONDecodeError:
        return None, "Invalid JSON"
    if not isinstance(payload, dict):
        return None, "JSON payload must be an object"
    return payload, None


def db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def import_legacy_source_queue(conn):
    if not LEGACY_QUEUE_PATH.exists():
        return
    count = conn.execute("SELECT COUNT(*) FROM submitted_sources").fetchone()[0]
    if count:
        return
    try:
        payload = json.loads(LEGACY_QUEUE_PATH.read_text())
    except json.JSONDecodeError:
        return
    for item in payload:
        conn.execute(
            """
            INSERT OR IGNORE INTO submitted_sources (id, url, title, note, cadence, submitted_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item.get("id") or f"U-{uuid.uuid4().hex[:12]}",
                item.get("url", ""),
                item.get("title", ""),
                item.get("note", ""),
                item.get("cadence", "daily"),
                item.get("submittedAt") or iso_now_utc(),
                item.get("status", "queued"),
            ),
        )


def cycle_window(now=None):
    local_now = (now or datetime.now(APP_TIMEZONE)).astimezone(APP_TIMEZONE)
    close_at = local_now.replace(hour=18, minute=0, second=0, microsecond=0)
    if local_now >= close_at:
        close_at += timedelta(days=1)
    opens_at = close_at - timedelta(days=1)
    cycle_id = f"vote-{close_at.date().isoformat()}"
    return {
        "id": cycle_id,
        "label": f"Tomorrow's debate / closes {close_at.strftime('%a %H:%M')}",
        "opens_at": opens_at,
        "closes_at": close_at,
        "status": "open",
    }


def ensure_cycle(conn):
    cycle = cycle_window()
    now = iso_now_utc()
    conn.execute(
        """
        INSERT INTO vote_cycles (id, label, opens_at, closes_at, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            label = excluded.label,
            opens_at = excluded.opens_at,
            closes_at = excluded.closes_at,
            status = excluded.status,
            updated_at = excluded.updated_at
        """,
        (
            cycle["id"],
            cycle["label"],
            cycle["opens_at"].astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
            cycle["closes_at"].astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
            cycle["status"],
            now,
            now,
        ),
    )
    proposal_count = conn.execute(
        "SELECT COUNT(*) FROM topic_proposals WHERE cycle_id = ?",
        (cycle["id"],),
    ).fetchone()[0]
    if proposal_count == 0:
        seed_cycle_proposals(conn, cycle["id"])
    return cycle["id"]


def seed_cycle_proposals(conn, cycle_id):
    now = iso_now_utc()
    for proposal in SEED_TOPIC_PROPOSALS:
        conn.execute(
            """
            INSERT OR IGNORE INTO topic_proposals
                (id, cycle_id, slug, title, question, why_now, evidence_lane, base_votes, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                f"{cycle_id}:{proposal['slug']}",
                cycle_id,
                proposal["slug"],
                proposal["title"],
                proposal["question"],
                proposal["why_now"],
                proposal["evidence_lane"],
                proposal["base_votes"],
                "seed",
                now,
                now,
            ),
        )


def ensure_db(conn):
    conn.executescript(SCHEMA)
    import_legacy_source_queue(conn)
    ensure_cycle(conn)
    conn.commit()


def active_cycle_row(conn):
    cycle_id = ensure_cycle(conn)
    row = conn.execute(
        "SELECT * FROM vote_cycles WHERE id = ?",
        (cycle_id,),
    ).fetchone()
    return row


def serialize_cycle(row):
    if not row:
        return None
    return {
        "id": row["id"],
        "label": row["label"],
        "opensAt": row["opens_at"],
        "closesAt": row["closes_at"],
        "status": row["status"],
    }


def proposal_rows(conn, cycle_id):
    rows = conn.execute(
        """
        SELECT
            p.*,
            p.base_votes + COUNT(v.id) AS vote_total
        FROM topic_proposals p
        LEFT JOIN topic_votes v ON v.proposal_id = p.id
        WHERE p.cycle_id = ?
        GROUP BY p.id
        ORDER BY vote_total DESC, p.created_at ASC
        """,
        (cycle_id,),
    ).fetchall()
    return rows


def serialize_proposal(row):
    return {
        "id": row["id"],
        "slug": row["slug"],
        "title": row["title"],
        "question": row["question"],
        "whyNow": row["why_now"],
        "evidenceLane": row["evidence_lane"],
        "baseVotes": row["base_votes"],
        "voteTotal": row["vote_total"],
        "createdAt": row["created_at"],
        "createdBy": row["created_by"],
    }


def viewer_vote_for_cycle(conn, cycle_id, viewer_token):
    if not viewer_token:
        return None
    row = conn.execute(
        "SELECT proposal_id FROM topic_votes WHERE cycle_id = ? AND voter_token = ?",
        (cycle_id, viewer_token),
    ).fetchone()
    if not row:
        return None
    return {"proposalId": row["proposal_id"]}


def submitted_source_rows(conn):
    return conn.execute(
        "SELECT * FROM submitted_sources ORDER BY submitted_at DESC"
    ).fetchall()


def serialize_source(row):
    return {
        "id": row["id"],
        "url": row["url"],
        "title": row["title"],
        "note": row["note"],
        "cadence": row["cadence"],
        "submittedAt": row["submitted_at"],
        "status": row["status"],
    }


def comment_rows(conn):
    return conn.execute(
        "SELECT * FROM comments ORDER BY created_at ASC"
    ).fetchall()


def serialize_comment(row):
    return {
        "id": row["id"],
        "threadId": row["thread_id"],
        "roundId": row["round_id"],
        "parentId": row["parent_id"],
        "author": row["author_name"],
        "body": row["body"],
        "createdAt": to_local_display(row["created_at"]),
        "createdAtIso": row["created_at"],
    }


def comments_by_round(conn):
    grouped = {}
    for row in comment_rows(conn):
        grouped.setdefault(row["round_id"], []).append(serialize_comment(row))
    return grouped


def build_bootstrap_payload(conn, viewer_token):
    cycle = active_cycle_row(conn)
    cycle_id = cycle["id"] if cycle else None
    return {
        "topicCycle": serialize_cycle(cycle),
        "viewerVote": viewer_vote_for_cycle(conn, cycle_id, viewer_token) if cycle_id else None,
        "proposals": [serialize_proposal(row) for row in proposal_rows(conn, cycle_id)] if cycle_id else [],
        "commentsByRound": comments_by_round(conn),
        "submittedSources": [serialize_source(row) for row in submitted_source_rows(conn)],
    }


def upsert_vote(conn, proposal_id, viewer_token):
    proposal = conn.execute(
        "SELECT cycle_id FROM topic_proposals WHERE id = ?",
        (proposal_id,),
    ).fetchone()
    if not proposal:
        raise ValueError("That topic proposal does not exist anymore.")
    now = iso_now_utc()
    conn.execute(
        """
        INSERT INTO topic_votes (cycle_id, proposal_id, voter_token, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(cycle_id, voter_token) DO UPDATE SET
            proposal_id = excluded.proposal_id,
            updated_at = excluded.updated_at
        """,
        (proposal["cycle_id"], proposal_id, viewer_token, now, now),
    )
    conn.commit()
    return proposal["cycle_id"]


def create_topic_proposal(conn, payload, viewer_token):
    title = str(payload.get("title", "")).strip()
    question = str(payload.get("question", "")).strip()
    why_now = str(payload.get("whyNow", "")).strip() or "Suggested by the community for the next vote cycle."
    evidence_lane = str(payload.get("evidenceLane", "")).strip() or "Primary reporting, official statements, and source comparison."
    if not title:
        raise ValueError("Topic title is required.")
    if not question:
        raise ValueError("Debate question is required.")
    cycle_id = ensure_cycle(conn)
    slug = slugify(title)
    proposal_id = f"{cycle_id}:{slug}:{uuid.uuid4().hex[:8]}"
    now = iso_now_utc()
    conn.execute(
        """
        INSERT INTO topic_proposals
            (id, cycle_id, slug, title, question, why_now, evidence_lane, base_votes, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            proposal_id,
            cycle_id,
            slug,
            title,
            question,
            why_now,
            evidence_lane,
            0,
            viewer_token or "anonymous",
            now,
            now,
        ),
    )
    if viewer_token:
        upsert_vote(conn, proposal_id, viewer_token)
    else:
        conn.commit()
    return proposal_id


def create_comment(conn, payload, viewer_token):
    thread_id = str(payload.get("threadId", "")).strip()
    round_id = str(payload.get("roundId", "")).strip()
    parent_id = str(payload.get("parentId", "")).strip() or None
    body = str(payload.get("body", "")).strip()
    author = str(payload.get("author", "")).strip() or display_name_for_token(viewer_token)
    if not thread_id:
        raise ValueError("threadId is required.")
    if not round_id:
        raise ValueError("roundId is required.")
    if not body:
        raise ValueError("Comment body is required.")
    comment_id = f"CMT-{uuid.uuid4().hex[:10]}"
    now = iso_now_utc()
    conn.execute(
        """
        INSERT INTO comments (id, thread_id, round_id, parent_id, author_name, voter_token, body, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (comment_id, thread_id, round_id, parent_id, author, viewer_token or "anonymous", body, now),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM comments WHERE id = ?", (comment_id,)).fetchone()
    return serialize_comment(row)


def delete_submitted_source(conn, source_id):
    conn.execute("DELETE FROM submitted_sources WHERE id = ?", (source_id,))
    conn.commit()


def upsert_submitted_source(conn, payload):
    raw_url = str(payload.get("url", "")).strip()
    parsed = urlparse(raw_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Invalid article URL")
    source = {
        "id": payload.get("id") or f"U-{uuid.uuid4().hex[:12]}",
        "url": raw_url,
        "title": str(payload.get("title", "")).strip(),
        "note": str(payload.get("note", "")).strip(),
        "cadence": payload.get("cadence") if payload.get("cadence") in {"hourly", "daily"} else "daily",
        "submitted_at": payload.get("submittedAt") or iso_now_utc(),
        "status": "queued",
    }
    conn.execute(
        """
        INSERT INTO submitted_sources (id, url, title, note, cadence, submitted_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            url = excluded.url,
            title = excluded.title,
            note = excluded.note,
            cadence = excluded.cadence,
            submitted_at = excluded.submitted_at,
            status = excluded.status
        """,
        (
            source["id"],
            source["url"],
            source["title"],
            source["note"],
            source["cadence"],
            source["submitted_at"],
            source["status"],
        ),
    )
    conn.commit()
    return source


def fetch_feed_items():
    items = []
    for feed_name, feed_url in NEWS_FEEDS:
        try:
            request = Request(feed_url, headers={"User-Agent": "TheyDebated/1.0"})
            with urlopen(request, timeout=12) as response:
                raw = response.read()
        except (TimeoutError, URLError, OSError):
            continue
        try:
            root = ET.fromstring(raw)
        except ET.ParseError:
            continue
        channel = root.find("channel")
        if channel is None:
            continue
        for item in channel.findall("item")[:12]:
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            published = (item.findtext("pubDate") or "").strip()
            if not title or not link:
                continue
            items.append(
                {
                    "feed": feed_name,
                    "title": title,
                    "link": link,
                    "published": published,
                }
            )
    deduped = []
    seen = set()
    for item in items:
        key = item["title"].lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def topic_from_headline(item, index):
    headline = item["title"]
    lowered = headline.lower()

    if "gaza" in lowered or "ceasefire" in lowered or "cease-fire" in lowered:
        return {
            "slug": "gaza-ceasefire",
            "title": "Gaza cease-fire diplomacy",
            "question": "Will the latest Gaza cease-fire push change the war's trajectory, or is diplomacy mostly buying headlines while battlefield logic stays the same?",
            "why_now": f"{item['feed']} is pushing fresh cease-fire reporting back to the top of the agenda.",
            "evidence_lane": "Mediator statements, humanitarian access, cease-fire text, and battlefield follow-through.",
            "base_votes": max(18 - index * 2, 8),
        }

    if "tariff" in lowered or "trade" in lowered or "china" in lowered:
        return {
            "slug": "trade-tariffs",
            "title": "U.S.-China tariff escalation",
            "question": "Do fresh tariff threats against China create real leverage, or mostly raise costs while both sides sell toughness to domestic audiences?",
            "why_now": f"{item['feed']} is elevating tariff politics back into the live geopolitical cycle.",
            "evidence_lane": "Tariff schedules, import-price effects, retaliation risk, and alliance responses.",
            "base_votes": max(17 - index * 2, 7),
        }

    if "iran" in lowered:
        return {
            "slug": "iran-ceasefire-followthrough",
            "title": "Iran cease-fire follow-through",
            "question": "Is the current Iran cease-fire actually stabilizing the region, or just freezing the same risks while each side claims victory?",
            "why_now": f"{item['feed']} is signaling that the Iran file is still unresolved after the first wave of strikes and bargaining.",
            "evidence_lane": "Cease-fire reporting, shipping attacks, proxy activity, and inspection or diplomacy updates.",
            "base_votes": max(16 - index * 2, 6),
        }

    if "chip" in lowered or "semiconductor" in lowered or "ai" in lowered:
        return {
            "slug": "ai-chip-controls",
            "title": "AI chip export controls",
            "question": "Are AI chip controls actually slowing frontier capability, or mostly rerouting supply chains while politicians pretend they changed the curve?",
            "why_now": f"{item['feed']} is putting compute, AI competition, or export controls back into the live policy fight.",
            "evidence_lane": "Export rules, cloud workarounds, compute availability, and frontier model disclosures.",
            "base_votes": max(15 - index * 2, 5),
        }

    if "election" in lowered or "campaign" in lowered or "vote" in lowered:
        return {
            "slug": "democracy-and-mandate",
            "title": "Democracy and mandate",
            "question": f'Does "{headline}" reflect a real democratic shift, or are campaigns outrunning what voters have actually signed up for?',
            "why_now": f"{item['feed']} is making electoral legitimacy part of the live argument again.",
            "evidence_lane": "Polling, turnout, party platforms, and institutional constraints after election-day rhetoric.",
            "base_votes": max(14 - index * 2, 4),
        }

    return {
        "slug": f"headline-{slugify(headline)[:28]}",
        "title": headline.split(":")[0][:80],
        "question": f'Does "{headline}" point to a real strategic shift, or is the public argument already outrunning the evidence?',
        "why_now": f"{item['feed']} surfaced this as one of the current live arguments worth pressure-testing.",
        "evidence_lane": "Primary reporting, official statements, and follow-through on the real-world effects.",
        "base_votes": max(13 - index * 2, 3),
    }


def fallback_topic_candidates():
    return [
        {
            "slug": proposal["slug"],
            "title": proposal["title"],
            "question": proposal["question"],
            "why_now": proposal["why_now"],
            "evidence_lane": proposal["evidence_lane"],
            "base_votes": proposal["base_votes"],
        }
        for proposal in SEED_TOPIC_PROPOSALS[:3]
    ]


def headline_is_relevant_for_public_debate(headline):
    lowered = headline.lower()
    positive_signals = [
        "iran",
        "gaza",
        "ceasefire",
        "cease-fire",
        "tariff",
        "trade",
        "china",
        "ai",
        "chip",
        "semiconductor",
        "election",
        "campaign",
        "vote",
        "fed",
        "interest rate",
        "inflation",
        "europe",
        "nato",
        "ukraine",
        "sanction",
        "supreme court",
        "immigration",
        "oil",
        "shipping",
        "defense",
        "military",
    ]
    negative_signals = [
        "gunman",
        "shooting",
        "murder",
        "celebrity",
        "sports",
        "lottery",
        "manifesto allegations",
    ]
    if any(signal in lowered for signal in negative_signals):
        return False
    return any(signal in lowered for signal in positive_signals)


def generate_topic_candidates():
    items = fetch_feed_items()
    if not items:
        return fallback_topic_candidates()
    candidates = []
    seen_slugs = set()
    for index, item in enumerate(items):
        if not headline_is_relevant_for_public_debate(item["title"]):
            continue
        topic = topic_from_headline(item, index)
        if topic["slug"] in seen_slugs:
            continue
        seen_slugs.add(topic["slug"])
        candidates.append(topic)
        if len(candidates) == 3:
            break
    if len(candidates) < 3:
        for fallback in fallback_topic_candidates():
            if fallback["slug"] in seen_slugs:
                continue
            candidates.append(fallback)
            seen_slugs.add(fallback["slug"])
            if len(candidates) == 3:
                break
    return candidates or fallback_topic_candidates()


def replace_cycle_topics(conn, cycle_id, proposals):
    now = iso_now_utc()
    conn.execute("DELETE FROM topic_votes WHERE cycle_id = ?", (cycle_id,))
    conn.execute("DELETE FROM topic_proposals WHERE cycle_id = ?", (cycle_id,))
    for proposal in proposals:
        slug = slugify(proposal["slug"] or proposal["title"])
        proposal_id = f"{cycle_id}:{slug}"
        conn.execute(
            """
            INSERT INTO topic_proposals
                (id, cycle_id, slug, title, question, why_now, evidence_lane, base_votes, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                proposal_id,
                cycle_id,
                slug,
                proposal["title"],
                proposal["question"],
                proposal.get("why_now", ""),
                proposal.get("evidence_lane", ""),
                int(proposal.get("base_votes", 0)),
                "daily-refresh",
                now,
                now,
            ),
        )
    conn.commit()


class DebatebookHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Viewer-Token")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        super().end_headers()

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_viewer_token(self, query=None, payload=None):
        token = self.headers.get("X-Viewer-Token", "").strip()
        if token:
            return token
        if payload and payload.get("viewerToken"):
            return str(payload.get("viewerToken")).strip()
        if query:
            values = query.get("viewerToken") or []
            if values:
                return values[0].strip()
        return ""

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)

        if parsed.path == "/api/health":
            self.send_json({"ok": True, "time": iso_now_utc()})
            return

        if parsed.path == "/api/bootstrap":
            viewer_token = self.read_viewer_token(query=query)
            with db_connection() as conn:
                ensure_db(conn)
                self.send_json(build_bootstrap_payload(conn, viewer_token))
            return

        if parsed.path == "/api/submitted-sources":
            with db_connection() as conn:
                ensure_db(conn)
                self.send_json({"sources": [serialize_source(row) for row in submitted_source_rows(conn)]})
            return

        if parsed.path == "/api/comments":
            with db_connection() as conn:
                ensure_db(conn)
                self.send_json({"commentsByRound": comments_by_round(conn)})
            return

        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        payload, error = read_json_body(self)
        if error:
            self.send_json({"error": error}, 400)
            return

        viewer_token = self.read_viewer_token(payload=payload)

        try:
            with db_connection() as conn:
                ensure_db(conn)

                if parsed.path == "/api/submitted-sources":
                    source = upsert_submitted_source(conn, payload)
                    self.send_json(
                        {
                            "source": serialize_source(
                                conn.execute("SELECT * FROM submitted_sources WHERE id = ?", (source["id"],)).fetchone()
                            ),
                            "sources": [serialize_source(row) for row in submitted_source_rows(conn)],
                        },
                        201,
                    )
                    return

                if parsed.path == "/api/topic-proposals":
                    create_topic_proposal(conn, payload, viewer_token)
                    self.send_json(build_bootstrap_payload(conn, viewer_token), 201)
                    return

                if parsed.path == "/api/topic-votes":
                    proposal_id = str(payload.get("proposalId", "")).strip()
                    if not proposal_id:
                        self.send_json({"error": "proposalId is required"}, 400)
                        return
                    if not viewer_token:
                        self.send_json({"error": "viewerToken is required"}, 400)
                        return
                    upsert_vote(conn, proposal_id, viewer_token)
                    self.send_json(build_bootstrap_payload(conn, viewer_token), 201)
                    return

                if parsed.path == "/api/comments":
                    comment = create_comment(conn, payload, viewer_token)
                    self.send_json(
                        {
                            "comment": comment,
                            "commentsByRound": comments_by_round(conn),
                        },
                        201,
                    )
                    return

        except ValueError as exc:
            self.send_json({"error": str(exc)}, 400)
            return

        self.send_error(404)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        prefix = "/api/submitted-sources/"
        if not parsed.path.startswith(prefix):
            self.send_error(404)
            return

        source_id = unquote(parsed.path[len(prefix) :])
        with db_connection() as conn:
            ensure_db(conn)
            delete_submitted_source(conn, source_id)
            self.send_json({"sources": [serialize_source(row) for row in submitted_source_rows(conn)]})


def refresh_daily_topics():
    with db_connection() as conn:
        ensure_db(conn)
        cycle_id = ensure_cycle(conn)
        proposals = generate_topic_candidates()
        replace_cycle_topics(conn, cycle_id, proposals)
        return cycle_id, proposals


def main(argv=None):
    argv = argv or sys.argv[1:]
    if argv and argv[0] == "refresh-topics":
        cycle_id, proposals = refresh_daily_topics()
        print(f"Refreshed {len(proposals)} topic candidates for {cycle_id}")
        for proposal in proposals:
            print(f"- {proposal['title']}: {proposal['question']}")
        return

    port = int(argv[0]) if argv else 3100
    with db_connection() as conn:
        ensure_db(conn)
    server = ThreadingHTTPServer(("", port), DebatebookHandler)
    print(f"Serving Debatebook on http://127.0.0.1:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
