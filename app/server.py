#!/usr/bin/env python3
import json
import os
import re
import sqlite3
import sys
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import URLError
from urllib.parse import parse_qs, unquote, urlparse
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

APP_ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("THEYDEBATED_DB_PATH", str(APP_ROOT / "debatebook.sqlite3"))).resolve()
LEGACY_QUEUE_PATH = APP_ROOT / "submitted-sources.json"
THREAD_SEED_PATH = APP_ROOT / "thread-catalog.seed.json"
APP_TIMEZONE = ZoneInfo(os.environ.get("THEYDEBATED_TIMEZONE", "Europe/Paris"))
ADMIN_TOKEN = os.environ.get("THEYDEBATED_ADMIN_TOKEN", "").strip()
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("THEYDEBATED_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]

SEED_TOPIC_PROPOSALS = [
    {
        "slug": "openai-mission-trial",
        "title": "Sam Altman vs. Elon Musk",
        "question": "Did Sam Altman and OpenAI betray the founding nonprofit mission, or is Elon Musk using the courtroom to kneecap the company that left him behind?",
        "why_now": "With the Oakland trial underway, the public fight is no longer just about AI hype. It is about whether OpenAI sold a humanitarian story and then chased power, or whether Musk is dressing up a rivalry as principle.",
        "evidence_lane": "Founding documents, board records, restructuring plans, Microsoft ties, court filings, and what the founders said the mission actually was.",
        "base_votes": 38,
        "origin": "seed",
    },
    {
        "slug": "trump-good-person",
        "title": "Is Trump a good person?",
        "question": "Is Donald Trump a good person, or mainly a political avatar for people who stopped trusting the system?",
        "why_now": "Every Trump cycle turns character into a proxy war over institutions, populism, and whether private conduct matters when public enemies feel worse.",
        "evidence_lane": "Fraud findings, misconduct verdicts, public statements, treatment of allies and enemies, and the record of documented deception.",
        "base_votes": 31,
        "origin": "seed",
    },
    {
        "slug": "epstein-murdered",
        "title": "Was Epstein murdered?",
        "question": "Is there credible evidence Jeffrey Epstein was murdered, or is the conspiracy stronger than the proof?",
        "why_now": "Institutional distrust keeps this argument alive because every gap in the official story gets treated like proof of a cover-up.",
        "evidence_lane": "Autopsy findings, jail-failure reports, surveillance gaps, official investigations, and the difference between suspicious and documented.",
        "base_votes": 27,
        "origin": "seed",
    },
    {
        "slug": "israel-palestine-right",
        "title": "Who's right in Israel-Palestine?",
        "question": "Is Israel acting in justified self-defense, or has the war become morally and strategically indefensible?",
        "why_now": "People keep demanding a simple moral winner in a conflict where every new strike, hostage update, and aid failure reopens the whole argument.",
        "evidence_lane": "October 7 facts, hostage and rocket context, civilian casualty estimates, aid access, war aims, and strategic outcomes.",
        "base_votes": 24,
        "origin": "seed",
    },
    {
        "slug": "climate-hoax",
        "title": "Is climate change a hoax?",
        "question": "Is there any credible evidence climate change is a hoax, or is denial mostly political identity dressed up as skepticism?",
        "why_now": "Climate debate is still a magnet for elite mistrust, media overstatement, and real scientific evidence that partisans keep trying to bend into a culture war.",
        "evidence_lane": "Temperature records, attribution science, emissions trends, physical indicators, model performance, and media exaggeration versus consensus.",
        "base_votes": 21,
        "origin": "seed",
    },
]

NEWS_FEEDS = [
    ("Reuters World", "https://feeds.reuters.com/Reuters/worldNews"),
    ("Reuters Politics", "https://feeds.reuters.com/Reuters/PoliticsNews"),
    ("Reuters Business", "https://feeds.reuters.com/reuters/businessNews"),
    ("BBC World", "https://feeds.bbci.co.uk/news/world/rss.xml"),
    ("The Guardian World", "https://www.theguardian.com/world/rss"),
    ("Google News", "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en"),
]

ISSUE_BLUEPRINTS = [
    {
        "slug": "openai-mission-trial",
        "title": "Sam Altman vs. Elon Musk",
        "keywords": ["openai", "altman", "musk", "xai", "nonprofit", "sam altman", "elon musk"],
        "question": "Did Sam Altman betray OpenAI's founding mission, or is Elon Musk weaponizing the mission story because the company became powerful without him?",
        "why_now": "The courtroom fight puts governance, nonprofit mission, and founder rivalry into one very combustible public argument.",
        "evidence_lane": "Founding documents, board records, restructuring plans, court filings, and who actually controlled the mission as OpenAI scaled.",
        "priority": 11,
    },
    {
        "slug": "trump-good-person",
        "title": "Is Trump a good person?",
        "keywords": ["trump", "donald trump", "maga", "campaign", "white house"],
        "question": "Is Donald Trump a good person, or mainly a political avatar for people who stopped trusting the system?",
        "why_now": "Trump turns character, grievance, and institutional distrust into one giant public argument every time he reenters the cycle.",
        "evidence_lane": "Fraud findings, misconduct verdicts, public statements, treatment of allies and enemies, and the record of documented deception.",
        "priority": 10,
    },
    {
        "slug": "epstein-murdered",
        "title": "Was Epstein murdered?",
        "keywords": ["epstein", "ghislaine", "maxwell", "jail", "suicide watch"],
        "question": "Is there credible evidence Jeffrey Epstein was murdered, or is the conspiracy stronger than the proof?",
        "why_now": "This argument never really dies because institutional incompetence and elite suspicion keep feeding each other.",
        "evidence_lane": "Autopsy findings, jail-failure reports, surveillance gaps, official investigations, and the difference between suspicious and documented.",
        "priority": 10,
    },
    {
        "slug": "israel-palestine-right",
        "title": "Who's right in Israel-Palestine?",
        "keywords": ["israel", "gaza", "palestine", "palestinian", "hamas", "netanyahu", "hostage"],
        "question": "Is Israel acting in justified self-defense, or has the war become morally and strategically indefensible?",
        "why_now": "This remains one of the most emotionally loaded live disputes on earth, and people keep trying to compress it into a single moral answer.",
        "evidence_lane": "October 7 facts, hostage and rocket context, civilian casualty estimates, aid access, war aims, and strategic outcomes.",
        "priority": 10,
    },
    {
        "slug": "climate-hoax",
        "title": "Is climate change a hoax?",
        "keywords": ["climate", "warming", "emissions", "carbon", "co2", "fossil", "temperature"],
        "question": "Is there any credible evidence climate change is a hoax, or is denial mostly political identity dressed up as skepticism?",
        "why_now": "Climate politics rewards overstatement on one side and performative disbelief on the other, which makes the evidence fight unusually combustible.",
        "evidence_lane": "Temperature records, attribution science, emissions trends, physical indicators, model performance, and media exaggeration versus consensus.",
        "priority": 9,
    },
    {
        "slug": "gaza-ceasefire",
        "title": "Gaza cease-fire diplomacy",
        "keywords": ["gaza", "ceasefire", "cease-fire", "rafah", "hostage"],
        "question": "Will the latest Gaza cease-fire push change the war's trajectory, or is diplomacy still mostly buying headlines while battlefield logic stays in charge?",
        "why_now": "Multiple live sources are forcing cease-fire diplomacy back into the center of the public argument.",
        "evidence_lane": "Mediator drafts, humanitarian access, battlefield follow-through, and whether the parties honor what they announce.",
        "priority": 10,
    },
    {
        "slug": "iran-followthrough",
        "title": "Iran cease-fire follow-through",
        "keywords": ["iran", "hormuz", "uranium", "tehran", "iaea", "enrichment", "proxy"],
        "question": "Is the current Iran cease-fire actually reducing risk, or just freezing the same nuclear and regional dangers under a calmer headline?",
        "why_now": "The Iran file keeps returning because every claim of stabilization still runs into enrichment, shipping, and proxy questions.",
        "evidence_lane": "Inspection access, shipping attacks, proxy activity, and the real state of bargaining over uranium and sanctions.",
        "priority": 9,
    },
    {
        "slug": "trade-tariffs",
        "title": "U.S.-China tariff escalation",
        "keywords": ["tariff", "trade", "china", "duties", "import"],
        "question": "Do fresh tariff threats against China create real leverage, or mostly raise costs while both sides perform toughness for domestic audiences?",
        "why_now": "Trade pressure keeps getting sold as strategy, which makes it a perfect public argument to pressure-test.",
        "evidence_lane": "Tariff schedules, import-price effects, retaliation risk, and whether leverage changes negotiation behavior.",
        "priority": 9,
    },
    {
        "slug": "ai-chip-controls",
        "title": "AI chip export controls",
        "keywords": ["chip", "semiconductor", "ai", "compute", "export control", "nvidia"],
        "question": "Are AI chip controls actually slowing frontier capability, or mostly rerouting supply chains while politicians pretend they changed the curve?",
        "why_now": "Compute remains one of the few levers everyone treats as strategic, which means the claims around it deserve stress-testing.",
        "evidence_lane": "Export rules, compute availability, cloud workarounds, and whether model development actually slows down.",
        "priority": 8,
    },
    {
        "slug": "europe-defense",
        "title": "Europe defense spending",
        "keywords": ["europe", "nato", "ukraine", "defense", "deterrence", "readiness"],
        "question": "Should Europe ramp defense spending much faster right now, or would speed mostly create waste without near-term readiness gains?",
        "why_now": "Burden-sharing and readiness claims keep colliding, and both sides are cherry-picking what counts as deterrence.",
        "evidence_lane": "Budget commitments, procurement lead times, readiness data, and alliance planning assumptions.",
        "priority": 8,
    },
    {
        "slug": "inflation-and-rates",
        "title": "Inflation and rate politics",
        "keywords": ["inflation", "interest rate", "fed", "central bank", "prices"],
        "question": "Are today's inflation and rate headlines evidence of real economic cooling, or mostly ammunition for political storytelling?",
        "why_now": "Monetary headlines land as public verdicts fast, even when the underlying data is still messy and revisable.",
        "evidence_lane": "Inflation prints, labor data, central-bank guidance, and market expectations after the headline hit.",
        "priority": 7,
    },
]

SPAM_PATTERNS = [
    re.compile(r"\b(buy now|casino|betting|free money|loan offer|seo services|whatsapp|telegram|crypto signal|airdrop|onlyfans|porn)\b", re.I),
    re.compile(r"(https?://\S+\s*){3,}", re.I),
    re.compile(r"([!?])\1{5,}"),
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
    source_refs TEXT NOT NULL DEFAULT '[]',
    origin TEXT NOT NULL DEFAULT 'community',
    status TEXT NOT NULL DEFAULT 'approved',
    moderation_reason TEXT NOT NULL DEFAULT '',
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
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved',
    moderation_reason TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_comments_thread_round ON comments(thread_id, round_id, created_at);

CREATE TABLE IF NOT EXISTS argument_submissions (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    side TEXT NOT NULL,
    author_name TEXT NOT NULL,
    voter_token TEXT NOT NULL,
    argument_text TEXT NOT NULL,
    source_url TEXT NOT NULL,
    source_title TEXT NOT NULL DEFAULT '',
    source_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved',
    moderation_reason TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_argument_submissions_thread_side
ON argument_submissions(thread_id, side, created_at);

CREATE TABLE IF NOT EXISTS submitted_sources (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    cadence TEXT NOT NULL DEFAULT 'daily',
    submitted_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    submitted_by TEXT NOT NULL DEFAULT '',
    moderation_reason TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS rate_limit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voter_token TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_action_token_time
ON rate_limit_events(action, voter_token, created_at);

CREATE TABLE IF NOT EXISTS moderation_events (
    id TEXT PRIMARY KEY,
    entity_kind TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS board_state (
    cycle_id TEXT PRIMARY KEY,
    featured_proposal_id TEXT,
    promoted_proposal_id TEXT,
    promoted_title TEXT NOT NULL DEFAULT '',
    promoted_question TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (cycle_id) REFERENCES vote_cycles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS published_threads (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    eyebrow TEXT NOT NULL DEFAULT '',
    question TEXT NOT NULL,
    intro TEXT NOT NULL DEFAULT '',
    context_summary TEXT NOT NULL DEFAULT '',
    verdict TEXT NOT NULL DEFAULT '',
    refresh_date TEXT NOT NULL DEFAULT '',
    claim_mode TEXT NOT NULL DEFAULT 'remote',
    source_thread_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'published',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    origin TEXT NOT NULL DEFAULT 'seed',
    payload_json TEXT NOT NULL DEFAULT '{}'
);
"""


def iso_now_utc():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def today_iso_local():
    return datetime.now(APP_TIMEZONE).date().isoformat()


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


def json_list(value):
    if not value:
        return []
    if isinstance(value, list):
        return value
    try:
        parsed = json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return []
    return parsed if isinstance(parsed, list) else []


def json_object(value):
    if not value:
        return {}
    if isinstance(value, dict):
        return value
    try:
        parsed = json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


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
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def ensure_column(conn, table_name, column_name, definition):
    columns = {
        row["name"]
        for row in conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    }
    if column_name not in columns:
        conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}")


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
            INSERT OR IGNORE INTO submitted_sources
                (id, url, title, note, cadence, submitted_at, status, submitted_by, moderation_reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item.get("id") or f"U-{uuid.uuid4().hex[:12]}",
                item.get("url", ""),
                item.get("title", ""),
                item.get("note", ""),
                item.get("cadence", "daily"),
                item.get("submittedAt") or iso_now_utc(),
                item.get("status", "queued"),
                item.get("submittedBy", "legacy"),
                item.get("moderationReason", ""),
            ),
        )


def load_seed_threads():
    if not THREAD_SEED_PATH.exists():
        return []
    try:
        payload = json.loads(THREAD_SEED_PATH.read_text())
    except json.JSONDecodeError:
        return []
    return payload if isinstance(payload, list) else []


def seed_published_threads(conn):
    count = conn.execute("SELECT COUNT(*) FROM published_threads").fetchone()[0]
    if count:
        return
    now = iso_now_utc()
    for index, thread in enumerate(load_seed_threads()):
        payload = dict(thread)
        payload.setdefault("sortOrder", index)
        conn.execute(
            """
            INSERT OR IGNORE INTO published_threads
                (id, slug, title, eyebrow, question, intro, context_summary, verdict, refresh_date, claim_mode, source_thread_id, status, sort_order, created_at, updated_at, origin, payload_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.get("id"),
                slugify(payload.get("title") or payload.get("id")),
                payload.get("title", ""),
                payload.get("eyebrow", ""),
                payload.get("question", ""),
                payload.get("intro", ""),
                payload.get("contextSummary", ""),
                payload.get("verdict", ""),
                payload.get("refreshDate", ""),
                payload.get("claimMode", "remote"),
                payload.get("sourceThreadId", ""),
                "published",
                int(payload.get("sortOrder", index)),
                now,
                now,
                payload.get("origin", "seed"),
                json.dumps(payload, ensure_ascii=True),
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


def seed_cycle_proposals(conn, cycle_id):
    now = iso_now_utc()
    for proposal in SEED_TOPIC_PROPOSALS:
        conn.execute(
            """
            INSERT OR IGNORE INTO topic_proposals
                (id, cycle_id, slug, title, question, why_now, evidence_lane, base_votes, created_by, created_at, updated_at, source_refs, origin, status, moderation_reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                json.dumps([], ensure_ascii=True),
                proposal.get("origin", "seed"),
                "approved",
                "",
            ),
        )


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


def ensure_db(conn):
    conn.executescript(SCHEMA)
    ensure_column(conn, "topic_proposals", "source_refs", "TEXT NOT NULL DEFAULT '[]'")
    ensure_column(conn, "topic_proposals", "origin", "TEXT NOT NULL DEFAULT 'community'")
    ensure_column(conn, "topic_proposals", "status", "TEXT NOT NULL DEFAULT 'approved'")
    ensure_column(conn, "topic_proposals", "moderation_reason", "TEXT NOT NULL DEFAULT ''")
    ensure_column(conn, "comments", "status", "TEXT NOT NULL DEFAULT 'approved'")
    ensure_column(conn, "comments", "moderation_reason", "TEXT NOT NULL DEFAULT ''")
    ensure_column(conn, "argument_submissions", "status", "TEXT NOT NULL DEFAULT 'approved'")
    ensure_column(conn, "argument_submissions", "moderation_reason", "TEXT NOT NULL DEFAULT ''")
    ensure_column(conn, "submitted_sources", "submitted_by", "TEXT NOT NULL DEFAULT ''")
    ensure_column(conn, "submitted_sources", "moderation_reason", "TEXT NOT NULL DEFAULT ''")
    import_legacy_source_queue(conn)
    seed_published_threads(conn)
    ensure_cycle(conn)
    conn.execute(
        "DELETE FROM rate_limit_events WHERE created_at < ?",
        ((datetime.now(timezone.utc) - timedelta(days=7)).replace(microsecond=0).isoformat().replace("+00:00", "Z"),),
    )
    conn.commit()


def active_cycle_row(conn):
    cycle_id = ensure_cycle(conn)
    return conn.execute("SELECT * FROM vote_cycles WHERE id = ?", (cycle_id,)).fetchone()


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


def proposal_rows(conn, cycle_id, include_held=False):
    if not cycle_id:
        return []
    statuses = ["approved"] if not include_held else ["approved", "held"]
    placeholders = ", ".join("?" for _ in statuses)
    rows = conn.execute(
        f"""
        SELECT
            p.*,
            p.base_votes + COUNT(v.id) AS vote_total
        FROM topic_proposals p
        LEFT JOIN topic_votes v ON v.proposal_id = p.id
        WHERE p.cycle_id = ? AND p.status IN ({placeholders})
        GROUP BY p.id
        ORDER BY vote_total DESC, p.created_at ASC
        """,
        (cycle_id, *statuses),
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
        "sourceRefs": json_list(row["source_refs"]),
        "origin": row["origin"],
        "status": row["status"],
        "moderationReason": row["moderation_reason"],
    }


def viewer_vote_for_cycle(conn, cycle_id, viewer_token):
    if not viewer_token or not cycle_id:
        return None
    row = conn.execute(
        "SELECT proposal_id FROM topic_votes WHERE cycle_id = ? AND voter_token = ?",
        (cycle_id, viewer_token),
    ).fetchone()
    return {"proposalId": row["proposal_id"]} if row else None


def comment_rows(conn, include_held=False):
    statuses = ["approved"] if not include_held else ["approved", "held"]
    placeholders = ", ".join("?" for _ in statuses)
    return conn.execute(
        f"SELECT * FROM comments WHERE status IN ({placeholders}) ORDER BY created_at ASC",
        statuses,
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
        "status": row["status"],
        "moderationReason": row["moderation_reason"],
    }


def comments_by_round(conn):
    grouped = {}
    for row in comment_rows(conn):
        grouped.setdefault(row["round_id"], []).append(serialize_comment(row))
    return grouped


def argument_submission_rows(conn, include_held=False):
    statuses = ["approved"] if not include_held else ["approved", "held"]
    placeholders = ", ".join("?" for _ in statuses)
    return conn.execute(
        f"SELECT * FROM argument_submissions WHERE status IN ({placeholders}) ORDER BY created_at DESC",
        statuses,
    ).fetchall()


def serialize_argument_submission(row):
    return {
        "id": row["id"],
        "threadId": row["thread_id"],
        "side": row["side"],
        "author": row["author_name"],
        "argument": row["argument_text"],
        "sourceUrl": row["source_url"],
        "sourceTitle": row["source_title"],
        "sourceNote": row["source_note"],
        "createdAt": to_local_display(row["created_at"]),
        "createdAtIso": row["created_at"],
        "status": row["status"],
        "moderationReason": row["moderation_reason"],
    }


def submitted_source_rows(conn, include_held=False):
    statuses = ["queued", "approved"] if not include_held else ["queued", "approved", "held"]
    placeholders = ", ".join("?" for _ in statuses)
    return conn.execute(
        f"SELECT * FROM submitted_sources WHERE status IN ({placeholders}) ORDER BY submitted_at DESC",
        statuses,
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
        "submittedBy": row["submitted_by"],
        "moderationReason": row["moderation_reason"],
    }


def board_state_row(conn, cycle_id):
    if not cycle_id:
        return None
    return conn.execute("SELECT * FROM board_state WHERE cycle_id = ?", (cycle_id,)).fetchone()


def serialize_board_state(row):
    if not row:
        return {
            "featuredProposalId": None,
            "promotedThread": None,
            "note": "",
            "updatedAt": None,
        }
    promoted = None
    if row["promoted_proposal_id"] or row["promoted_title"] or row["promoted_question"]:
        promoted = {
            "proposalId": row["promoted_proposal_id"],
            "title": row["promoted_title"],
            "question": row["promoted_question"],
            "note": row["note"],
            "updatedAt": row["updated_at"],
        }
    return {
        "featuredProposalId": row["featured_proposal_id"],
        "promotedThread": promoted,
        "note": row["note"],
        "updatedAt": row["updated_at"],
    }


def published_thread_rows(conn):
    return conn.execute(
        """
        SELECT * FROM published_threads
        WHERE status = 'published'
        ORDER BY sort_order ASC, updated_at DESC
        """
    ).fetchall()


def published_thread_row(conn, thread_id):
    return conn.execute(
        "SELECT * FROM published_threads WHERE id = ? AND status = 'published'",
        (thread_id,),
    ).fetchone()


def serialize_published_thread(row):
    payload = json_object(row["payload_json"])
    payload.update(
        {
            "id": row["id"],
            "title": row["title"],
            "eyebrow": row["eyebrow"],
            "question": row["question"],
            "intro": row["intro"],
            "contextSummary": row["context_summary"],
            "verdict": row["verdict"],
            "refreshDate": row["refresh_date"],
            "claimMode": row["claim_mode"],
            "sourceThreadId": row["source_thread_id"] or None,
            "status": row["status"],
            "sortOrder": row["sort_order"],
            "origin": row["origin"],
        }
    )
    payload.setdefault("agentIds", ["arbiter", "republican", "democratic"])
    payload.setdefault("rounds", [])
    payload.setdefault("claims", [])
    payload.setdefault("sources", [])
    payload.setdefault("agents", [])
    return payload


def build_bootstrap_payload(conn, viewer_token):
    cycle = active_cycle_row(conn)
    cycle_id = cycle["id"] if cycle else None
    return {
        "threads": [serialize_published_thread(row) for row in published_thread_rows(conn)],
        "topicCycle": serialize_cycle(cycle),
        "viewerVote": viewer_vote_for_cycle(conn, cycle_id, viewer_token),
        "proposals": [serialize_proposal(row) for row in proposal_rows(conn, cycle_id)],
        "commentsByRound": comments_by_round(conn),
        "argumentSubmissions": [serialize_argument_submission(row) for row in argument_submission_rows(conn)],
        "submittedSources": [serialize_source(row) for row in submitted_source_rows(conn)],
        "boardState": serialize_board_state(board_state_row(conn, cycle_id)),
    }


def held_queue(conn):
    return {
        "proposals": [
            serialize_proposal(row)
            for row in conn.execute(
                """
                SELECT p.*, p.base_votes + COUNT(v.id) AS vote_total
                FROM topic_proposals p
                LEFT JOIN topic_votes v ON v.proposal_id = p.id
                WHERE p.status = 'held'
                GROUP BY p.id
                ORDER BY p.created_at DESC
                """
            ).fetchall()
        ],
        "comments": [
            serialize_comment(row)
            for row in conn.execute(
                "SELECT * FROM comments WHERE status = 'held' ORDER BY created_at DESC"
            ).fetchall()
        ],
        "arguments": [
            serialize_argument_submission(row)
            for row in conn.execute(
                "SELECT * FROM argument_submissions WHERE status = 'held' ORDER BY created_at DESC"
            ).fetchall()
        ],
        "sources": [
            serialize_source(row)
            for row in conn.execute(
                "SELECT * FROM submitted_sources WHERE status = 'held' ORDER BY submitted_at DESC"
            ).fetchall()
        ],
    }


def build_admin_bootstrap(conn):
    cycle = active_cycle_row(conn)
    cycle_id = cycle["id"] if cycle else None
    return {
        "threads": [serialize_published_thread(row) for row in published_thread_rows(conn)],
        "topicCycle": serialize_cycle(cycle),
        "boardState": serialize_board_state(board_state_row(conn, cycle_id)),
        "proposals": [serialize_proposal(row) for row in proposal_rows(conn, cycle_id, include_held=True)],
        "moderationQueue": held_queue(conn),
    }


def record_rate_limit_event(conn, voter_token, action):
    conn.execute(
        "INSERT INTO rate_limit_events (voter_token, action, created_at) VALUES (?, ?, ?)",
        (voter_token or "anonymous", action, iso_now_utc()),
    )


def assert_rate_limit(conn, voter_token, action, limit_count, window_seconds):
    now = datetime.now(timezone.utc)
    window_start = (now - timedelta(seconds=window_seconds)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    current_count = conn.execute(
        """
        SELECT COUNT(*) FROM rate_limit_events
        WHERE voter_token = ? AND action = ? AND created_at >= ?
        """,
        (voter_token or "anonymous", action, window_start),
    ).fetchone()[0]
    if current_count >= limit_count:
        raise PermissionError("You're going fast. Give it a minute, then try again.")
    record_rate_limit_event(conn, voter_token, action)


def url_count(text_value):
    return len(re.findall(r"https?://\S+", text_value, re.I))


def caps_ratio(text_value):
    letters = [ch for ch in text_value if ch.isalpha()]
    if not letters:
        return 0.0
    return sum(1 for ch in letters if ch.isupper()) / len(letters)


def moderation_status_for(kind, parts):
    joined = " ".join(part for part in parts if part).strip()
    reasons = []
    if not joined:
        return "approved", ""
    if any(pattern.search(joined) for pattern in SPAM_PATTERNS):
        reasons.append("Suspicious promotional or spammy language.")
    if url_count(joined) > (1 if kind == "topic" else 2):
        reasons.append("Too many links for a public-first submission.")
    if caps_ratio(joined) > 0.55 and len(joined) > 48:
        reasons.append("Excessive all-caps / shouty formatting.")
    if re.search(r"(.)\1{7,}", joined):
        reasons.append("Repeated characters or formatting looks automated.")
    return ("held", "; ".join(reasons)) if reasons else ("approved", "")


def log_moderation_event(conn, entity_kind, entity_id, action, actor, note=""):
    conn.execute(
        """
        INSERT INTO moderation_events (id, entity_kind, entity_id, action, actor, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (f"MOD-{uuid.uuid4().hex[:10]}", entity_kind, entity_id, action, actor, note, iso_now_utc()),
    )


def upsert_vote(conn, proposal_id, viewer_token):
    proposal = conn.execute(
        "SELECT cycle_id, status FROM topic_proposals WHERE id = ?",
        (proposal_id,),
    ).fetchone()
    if not proposal or proposal["status"] != "approved":
        raise ValueError("That topic proposal is not available for public voting.")
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

    if len(title) < 5:
        raise ValueError("Topic title is too short.")
    if len(title) > 120:
        raise ValueError("Topic title is too long.")
    if len(question) < 18:
        raise ValueError("Debate question needs a little more detail.")
    if len(question) > 260:
        raise ValueError("Debate question is too long.")

    assert_rate_limit(conn, viewer_token, "topic-proposal", 4, 60 * 60 * 6)
    cycle_id = ensure_cycle(conn)

    duplicate = conn.execute(
        """
        SELECT id FROM topic_proposals
        WHERE cycle_id = ? AND lower(title) = lower(?) AND lower(question) = lower(?) AND status != 'rejected'
        LIMIT 1
        """,
        (cycle_id, title, question),
    ).fetchone()
    if duplicate:
        raise ValueError("That topic is already on the board.")

    status, moderation_reason = moderation_status_for("topic", [title, question, why_now, evidence_lane])
    proposal_id = f"{cycle_id}:{slugify(title)}:{uuid.uuid4().hex[:8]}"
    now = iso_now_utc()
    conn.execute(
        """
        INSERT INTO topic_proposals
            (id, cycle_id, slug, title, question, why_now, evidence_lane, base_votes, created_by, created_at, updated_at, source_refs, origin, status, moderation_reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            proposal_id,
            cycle_id,
            slugify(title),
            title,
            question,
            why_now,
            evidence_lane,
            0,
            viewer_token or "anonymous",
            now,
            now,
            json.dumps([], ensure_ascii=True),
            "community",
            status,
            moderation_reason,
        ),
    )
    if status == "approved" and viewer_token:
        upsert_vote(conn, proposal_id, viewer_token)
    else:
        conn.commit()
    if status == "held":
        log_moderation_event(conn, "topic_proposal", proposal_id, "held", viewer_token or "anonymous", moderation_reason)
        conn.commit()
    return {
        "id": proposal_id,
        "status": status,
        "message": "Topic received and queued for moderation before it goes on the public board."
        if status == "held"
        else "Topic added to the vote board and backed by your vote.",
    }


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
    if len(body) < 4:
        raise ValueError("Reply is too short.")
    if len(body) > 1200:
        raise ValueError("Reply is too long.")

    assert_rate_limit(conn, viewer_token, "comment", 8, 60 * 15)
    status, moderation_reason = moderation_status_for("comment", [body, author])
    comment_id = f"CMT-{uuid.uuid4().hex[:10]}"
    now = iso_now_utc()
    conn.execute(
        """
        INSERT INTO comments (id, thread_id, round_id, parent_id, author_name, voter_token, body, created_at, status, moderation_reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (comment_id, thread_id, round_id, parent_id, author, viewer_token or "anonymous", body, now, status, moderation_reason),
    )
    if status == "held":
        log_moderation_event(conn, "comment", comment_id, "held", viewer_token or "anonymous", moderation_reason)
    conn.commit()
    row = conn.execute("SELECT * FROM comments WHERE id = ?", (comment_id,)).fetchone()
    return serialize_comment(row), {
        "id": comment_id,
        "status": status,
        "message": "Reply received and queued for moderation."
        if status == "held"
        else "Reply posted.",
    }


def create_argument_submission(conn, payload, viewer_token):
    thread_id = str(payload.get("threadId", "")).strip()
    side = str(payload.get("side", "")).strip().lower()
    argument_text = str(payload.get("argument", "")).strip()
    source_url = str(payload.get("sourceUrl", "")).strip()
    source_title = str(payload.get("sourceTitle", "")).strip()
    source_note = str(payload.get("sourceNote", "")).strip()
    author = str(payload.get("author", "")).strip() or display_name_for_token(viewer_token)

    if not thread_id:
        raise ValueError("threadId is required.")
    if side not in {"democratic", "republican", "arbiter"}:
        raise ValueError("Choose a side for the argument.")
    if len(argument_text) < 30:
        raise ValueError("Argument needs a little more detail.")
    if len(argument_text) > 2400:
        raise ValueError("Argument is too long.")

    parsed = urlparse(source_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Source URL must be a valid article link.")

    assert_rate_limit(conn, viewer_token, "argument-submit", 5, 60 * 60 * 6)
    status, moderation_reason = moderation_status_for(
        "argument",
        [author, side, argument_text, source_url, source_title, source_note],
    )
    submission_id = f"ARG-{uuid.uuid4().hex[:10]}"
    now = iso_now_utc()
    conn.execute(
        """
        INSERT INTO argument_submissions
            (id, thread_id, side, author_name, voter_token, argument_text, source_url, source_title, source_note, created_at, status, moderation_reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            submission_id,
            thread_id,
            side,
            author,
            viewer_token or "anonymous",
            argument_text,
            source_url,
            source_title,
            source_note,
            now,
            status,
            moderation_reason,
        ),
    )
    if status == "held":
        log_moderation_event(conn, "argument_submission", submission_id, "held", viewer_token or "anonymous", moderation_reason)
    conn.commit()
    row = conn.execute("SELECT * FROM argument_submissions WHERE id = ?", (submission_id,)).fetchone()
    return serialize_argument_submission(row), {
        "id": submission_id,
        "status": status,
        "message": "Argument received and queued for moderation."
        if status == "held"
        else "Argument added to the public debate board.",
    }


def upsert_submitted_source(conn, payload, viewer_token):
    raw_url = str(payload.get("url", "")).strip()
    parsed = urlparse(raw_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Invalid article URL.")

    assert_rate_limit(conn, viewer_token, "source-submit", 6, 60 * 60 * 6)

    duplicate = conn.execute(
        "SELECT * FROM submitted_sources WHERE url = ? AND status != 'rejected' ORDER BY submitted_at DESC LIMIT 1",
        (raw_url,),
    ).fetchone()
    if duplicate:
        return serialize_source(duplicate), {
            "status": "duplicate",
            "message": "That source is already in the queue.",
        }

    title = str(payload.get("title", "")).strip()
    note = str(payload.get("note", "")).strip()
    cadence = payload.get("cadence") if payload.get("cadence") in {"hourly", "daily"} else "daily"
    status, moderation_reason = moderation_status_for("source", [raw_url, title, note])
    queue_status = "queued" if status == "approved" else "held"
    source = {
        "id": payload.get("id") or f"U-{uuid.uuid4().hex[:12]}",
        "url": raw_url,
        "title": title,
        "note": note,
        "cadence": cadence,
        "submitted_at": payload.get("submittedAt") or iso_now_utc(),
        "status": queue_status,
        "submitted_by": viewer_token or "anonymous",
        "moderation_reason": moderation_reason,
    }
    conn.execute(
        """
        INSERT INTO submitted_sources (id, url, title, note, cadence, submitted_at, status, submitted_by, moderation_reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            source["id"],
            source["url"],
            source["title"],
            source["note"],
            source["cadence"],
            source["submitted_at"],
            source["status"],
            source["submitted_by"],
            source["moderation_reason"],
        ),
    )
    if source["status"] == "held":
        log_moderation_event(conn, "submitted_source", source["id"], "held", viewer_token or "anonymous", moderation_reason)
    conn.commit()
    return source, {
        "status": source["status"],
        "message": "Source queued for processing."
        if source["status"] == "queued"
        else "Source received and queued for moderation.",
    }


def delete_submitted_source(conn, source_id, viewer_token, is_admin=False):
    row = conn.execute("SELECT * FROM submitted_sources WHERE id = ?", (source_id,)).fetchone()
    if not row:
        return
    if not is_admin and row["submitted_by"] not in {"", viewer_token}:
        raise PermissionError("You can only remove sources you submitted.")
    conn.execute("DELETE FROM submitted_sources WHERE id = ?", (source_id,))
    conn.commit()


def parse_feed_datetime(value):
    if not value:
        return None
    try:
        return parsedate_to_datetime(value).astimezone(timezone.utc)
    except (TypeError, ValueError, IndexError):
        return None


def source_weight(feed_name):
    return {
        "Reuters World": 4.5,
        "Reuters Politics": 4.5,
        "Reuters Business": 4.0,
        "BBC World": 3.8,
        "The Guardian World": 3.5,
        "Google News": 2.6,
    }.get(feed_name, 2.5)


def text_contains_keyword(text_value, keyword):
    normalized_keyword = str(keyword or "").strip().lower()
    if not normalized_keyword:
        return False
    pattern = r"\b" + re.escape(normalized_keyword).replace(r"\ ", r"[\s\-]+") + r"\b"
    return re.search(pattern, text_value.lower()) is not None


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
        for item in channel.findall("item")[:14]:
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
                    "published_dt": parse_feed_datetime(published),
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
        "openai",
        "altman",
        "musk",
        "chip",
        "semiconductor",
        "election",
        "campaign",
        "trump",
        "vote",
        "fed",
        "interest rate",
        "inflation",
        "israel",
        "palestine",
        "climate",
        "epstein",
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
        "celebrity",
        "sports",
        "lottery",
        "manifesto allegations",
    ]
    if any(text_contains_keyword(lowered, signal) for signal in negative_signals):
        return False
    return any(text_contains_keyword(lowered, signal) for signal in positive_signals)


def best_blueprint_for_item(item):
    lowered = item["title"].lower()
    best = None
    best_score = 0
    for blueprint in ISSUE_BLUEPRINTS:
        matches = sum(1 for keyword in blueprint["keywords"] if text_contains_keyword(lowered, keyword))
        if not matches:
            continue
        score = matches * 10 + blueprint["priority"]
        if score > best_score:
            best = blueprint
            best_score = score
    return best, best_score


def fallback_topic_candidates():
    return [
        {
            "slug": proposal["slug"],
            "title": proposal["title"],
            "question": proposal["question"],
            "why_now": proposal["why_now"],
            "evidence_lane": proposal["evidence_lane"],
            "base_votes": proposal["base_votes"],
            "origin": proposal.get("origin", "seed"),
            "source_refs": [],
        }
        for proposal in SEED_TOPIC_PROPOSALS[:3]
    ]


def generic_topic_from_headline(item, index):
    headline = item["title"]
    return {
        "slug": f"headline-{slugify(headline)[:28]}",
        "title": headline.split(":")[0][:80] or "Live public argument",
        "question": f'Does "{headline}" point to a real strategic shift, or is the public argument already outrunning the evidence?',
        "why_now": f"{item['feed']} surfaced this as one of the live disputes now fighting for public attention.",
        "evidence_lane": "Primary reporting, official statements, and whether the real-world follow-through matches the claim.",
        "base_votes": max(18 - index * 2, 8),
        "origin": "news",
        "source_refs": [
            {
                "feed": item["feed"],
                "title": item["title"],
                "link": item["link"],
                "published": item["published"],
            }
        ],
    }


def build_topic_from_cluster(cluster, rank_index):
    blueprint = cluster["blueprint"]
    items = sorted(
        cluster["items"],
        key=lambda item: (
            source_weight(item["feed"]),
            item["published_dt"].timestamp() if item["published_dt"] else 0,
        ),
        reverse=True,
    )
    feed_names = []
    for item in items:
        if item["feed"] not in feed_names:
            feed_names.append(item["feed"])
    source_refs = [
        {
            "feed": item["feed"],
            "title": item["title"],
            "link": item["link"],
            "published": item["published"],
        }
        for item in items[:3]
    ]
    if len(feed_names) > 2:
        feed_line = ", ".join(feed_names[:2]) + f", and {feed_names[2]}"
    elif len(feed_names) == 2:
        feed_line = " and ".join(feed_names)
    else:
        feed_line = feed_names[0]
    return {
        "slug": blueprint["slug"],
        "title": blueprint["title"],
        "question": blueprint["question"],
        "why_now": f"{feed_line} all surfaced fresh movement on this issue, which is exactly when public claims start outrunning the underlying evidence.",
        "evidence_lane": blueprint["evidence_lane"],
        "base_votes": max(34 - rank_index * 6 + min(len(cluster["items"]), 3), 15),
        "origin": "news",
        "source_refs": source_refs,
    }


def generate_topic_candidates():
    items = [item for item in fetch_feed_items() if headline_is_relevant_for_public_debate(item["title"])]
    if not items:
        return fallback_topic_candidates()

    clusters = {}
    generics = []
    for index, item in enumerate(items):
        blueprint, score = best_blueprint_for_item(item)
        if not blueprint:
            generics.append((index, item))
            continue
        cluster = clusters.setdefault(
            blueprint["slug"],
            {"blueprint": blueprint, "items": [], "score": 0.0, "feeds": set()},
        )
        cluster["items"].append(item)
        cluster["score"] += score + source_weight(item["feed"])
        cluster["feeds"].add(item["feed"])
        if item["published_dt"]:
            age_hours = max(0, (datetime.now(timezone.utc) - item["published_dt"]).total_seconds() / 3600)
            cluster["score"] += max(0, 8 - min(age_hours, 8))

    ranked_clusters = sorted(
        clusters.values(),
        key=lambda cluster: (cluster["score"], len(cluster["feeds"]), len(cluster["items"])),
        reverse=True,
    )

    proposals = []
    seen_slugs = set()
    for rank_index, cluster in enumerate(ranked_clusters):
        proposal = build_topic_from_cluster(cluster, rank_index)
        if proposal["slug"] in seen_slugs:
            continue
        proposals.append(proposal)
        seen_slugs.add(proposal["slug"])
        if len(proposals) == 3:
            return proposals

    for index, item in generics:
        proposal = generic_topic_from_headline(item, len(proposals) + index)
        if proposal["slug"] in seen_slugs:
            continue
        proposals.append(proposal)
        seen_slugs.add(proposal["slug"])
        if len(proposals) == 3:
            return proposals

    for fallback in fallback_topic_candidates():
        if fallback["slug"] in seen_slugs:
            continue
        proposals.append(fallback)
        seen_slugs.add(fallback["slug"])
        if len(proposals) == 3:
            break

    return proposals or fallback_topic_candidates()


def replace_cycle_topics(conn, cycle_id, proposals, actor="daily-refresh"):
    now = iso_now_utc()
    refreshable_ids = [
        row["id"]
        for row in conn.execute(
            "SELECT id FROM topic_proposals WHERE cycle_id = ? AND origin IN ('seed', 'news')",
            (cycle_id,),
        ).fetchall()
    ]
    if refreshable_ids:
        placeholders = ", ".join("?" for _ in refreshable_ids)
        conn.execute(
            f"DELETE FROM topic_votes WHERE proposal_id IN ({placeholders})",
            refreshable_ids,
        )
        conn.execute(
            f"DELETE FROM topic_proposals WHERE id IN ({placeholders})",
            refreshable_ids,
        )

    for proposal in proposals:
        slug = slugify(proposal.get("slug") or proposal["title"])
        proposal_id = f"{cycle_id}:{slug}"
        conn.execute(
            """
            INSERT INTO topic_proposals
                (id, cycle_id, slug, title, question, why_now, evidence_lane, base_votes, created_by, created_at, updated_at, source_refs, origin, status, moderation_reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                actor,
                now,
                now,
                json.dumps(proposal.get("source_refs", []), ensure_ascii=True),
                proposal.get("origin", "news"),
                "approved",
                "",
            ),
        )
    conn.commit()


def review_entity(conn, entity_kind, entity_id, action, actor, note=""):
    if action not in {"approve", "reject"}:
        raise ValueError("Unsupported review action.")

    if entity_kind == "proposal":
        status = "approved" if action == "approve" else "rejected"
        conn.execute(
            "UPDATE topic_proposals SET status = ?, moderation_reason = ? WHERE id = ?",
            (status, note if action == "reject" else "", entity_id),
        )
        log_moderation_event(conn, "topic_proposal", entity_id, action, actor, note)
    elif entity_kind == "comment":
        status = "approved" if action == "approve" else "rejected"
        conn.execute(
            "UPDATE comments SET status = ?, moderation_reason = ? WHERE id = ?",
            (status, note if action == "reject" else "", entity_id),
        )
        log_moderation_event(conn, "comment", entity_id, action, actor, note)
    elif entity_kind == "argument":
        status = "approved" if action == "approve" else "rejected"
        conn.execute(
            "UPDATE argument_submissions SET status = ?, moderation_reason = ? WHERE id = ?",
            (status, note if action == "reject" else "", entity_id),
        )
        log_moderation_event(conn, "argument_submission", entity_id, action, actor, note)
    elif entity_kind == "source":
        status = "queued" if action == "approve" else "rejected"
        conn.execute(
            "UPDATE submitted_sources SET status = ?, moderation_reason = ? WHERE id = ?",
            (status, note if action == "reject" else "", entity_id),
        )
        log_moderation_event(conn, "submitted_source", entity_id, action, actor, note)
    else:
        raise ValueError("Unsupported queue kind.")
    conn.commit()


def set_featured_proposal(conn, cycle_id, proposal_id, actor, note=""):
    proposal = conn.execute(
        "SELECT id FROM topic_proposals WHERE id = ? AND cycle_id = ? AND status = 'approved'",
        (proposal_id, cycle_id),
    ).fetchone()
    if not proposal:
        raise ValueError("That proposal is not available to feature.")
    now = iso_now_utc()
    conn.execute(
        """
        INSERT INTO board_state (cycle_id, featured_proposal_id, promoted_proposal_id, promoted_title, promoted_question, note, updated_at, updated_by)
        VALUES (?, ?, NULL, '', '', ?, ?, ?)
        ON CONFLICT(cycle_id) DO UPDATE SET
            featured_proposal_id = excluded.featured_proposal_id,
            note = excluded.note,
            updated_at = excluded.updated_at,
            updated_by = excluded.updated_by
        """,
        (cycle_id, proposal_id, note, now, actor),
    )
    conn.commit()


def clear_featured_proposal(conn, cycle_id, actor):
    now = iso_now_utc()
    conn.execute(
        """
        INSERT INTO board_state (cycle_id, featured_proposal_id, promoted_proposal_id, promoted_title, promoted_question, note, updated_at, updated_by)
        VALUES (?, NULL, NULL, '', '', '', ?, ?)
        ON CONFLICT(cycle_id) DO UPDATE SET
            featured_proposal_id = NULL,
            updated_at = excluded.updated_at,
            updated_by = excluded.updated_by
        """,
        (cycle_id, now, actor),
    )
    conn.commit()


def publish_placeholder_thread_from_proposal(conn, proposal, actor, note=""):
    thread_id = f"daily-{proposal['cycle_id']}-{proposal['slug']}"
    now = iso_now_utc()
    payload = {
        "id": thread_id,
        "kind": "flagship",
        "title": proposal["title"],
        "eyebrow": f"AI-agent thread / {proposal['title']}",
        "question": proposal["question"],
        "openerTitle": f"Hot take: if this question makes everyone instantly sure, the thread probably has its teeth in exactly the right place.",
        "openerBody": (
            f"{proposal['why_now']}\n\n"
            "The same three AI agents will have to take sides in public, push their evidence as far as it goes, and get punished when they blur suspicion, ideology, and proof."
        ),
        "intro": "Three AI agents will debate this freshly promoted topic in public from visible prompts and sourced claims.",
        "contextSummary": proposal["why_now"] or "Tomorrow's public thread has been promoted from the vote board and is waiting for the first full debate run.",
        "verdict": "Scheduled for the next public debate cycle.",
        "refreshDate": today_iso_local(),
        "claimMode": "remote",
        "sourceThreadId": None,
        "agentIds": ["arbiter", "republican", "democratic"],
        "rounds": [],
        "claims": [],
        "sources": [],
        "agents": [],
        "origin": "promoted",
        "note": note,
    }
    sort_order = conn.execute("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM published_threads").fetchone()[0]
    conn.execute(
        """
        INSERT INTO published_threads
            (id, slug, title, eyebrow, question, intro, context_summary, verdict, refresh_date, claim_mode, source_thread_id, status, sort_order, created_at, updated_at, origin, payload_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            eyebrow = excluded.eyebrow,
            question = excluded.question,
            intro = excluded.intro,
            context_summary = excluded.context_summary,
            verdict = excluded.verdict,
            refresh_date = excluded.refresh_date,
            claim_mode = excluded.claim_mode,
            source_thread_id = excluded.source_thread_id,
            updated_at = excluded.updated_at,
            origin = excluded.origin,
            payload_json = excluded.payload_json
        """,
        (
            thread_id,
            proposal["slug"],
            proposal["title"],
            payload["eyebrow"],
            proposal["question"],
            payload["intro"],
            payload["contextSummary"],
            payload["verdict"],
            payload["refreshDate"],
            "remote",
            "",
            sort_order,
            now,
            now,
            "promoted",
            json.dumps(payload, ensure_ascii=True),
        ),
    )
    return thread_id


def promote_proposal_to_thread(conn, cycle_id, proposal_id, actor, note=""):
    proposal = conn.execute(
        "SELECT * FROM topic_proposals WHERE id = ? AND cycle_id = ? AND status = 'approved'",
        (proposal_id, cycle_id),
    ).fetchone()
    if not proposal:
        raise ValueError("That proposal is not available to promote.")
    now = iso_now_utc()
    publish_placeholder_thread_from_proposal(conn, proposal, actor, note=note)
    conn.execute(
        """
        INSERT INTO board_state (cycle_id, featured_proposal_id, promoted_proposal_id, promoted_title, promoted_question, note, updated_at, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(cycle_id) DO UPDATE SET
            featured_proposal_id = excluded.featured_proposal_id,
            promoted_proposal_id = excluded.promoted_proposal_id,
            promoted_title = excluded.promoted_title,
            promoted_question = excluded.promoted_question,
            note = excluded.note,
            updated_at = excluded.updated_at,
            updated_by = excluded.updated_by
        """,
        (
            cycle_id,
            proposal_id,
            proposal_id,
            proposal["title"],
            proposal["question"],
            note,
            now,
            actor,
        ),
    )
    conn.commit()


def clear_promoted_thread(conn, cycle_id, actor):
    now = iso_now_utc()
    conn.execute(
        """
        INSERT INTO board_state (cycle_id, featured_proposal_id, promoted_proposal_id, promoted_title, promoted_question, note, updated_at, updated_by)
        VALUES (?, NULL, NULL, '', '', '', ?, ?)
        ON CONFLICT(cycle_id) DO UPDATE SET
            promoted_proposal_id = NULL,
            promoted_title = '',
            promoted_question = '',
            note = '',
            updated_at = excluded.updated_at,
            updated_by = excluded.updated_by
        """,
        (cycle_id, now, actor),
    )
    conn.commit()


def refresh_daily_topics(conn=None, actor="daily-refresh"):
    owns_connection = conn is None
    if owns_connection:
        conn = db_connection()
    try:
        ensure_db(conn)
        cycle_id = ensure_cycle(conn)
        proposals = generate_topic_candidates()
        replace_cycle_topics(conn, cycle_id, proposals, actor=actor)
        return cycle_id, proposals
    finally:
        if owns_connection:
            conn.close()


def host_is_local(handler):
    host = handler.headers.get("Host", "").split(":")[0].lower()
    return host in {"127.0.0.1", "localhost", "::1"}


def admin_actor(handler, query=None, payload=None):
    header_token = handler.headers.get("X-Admin-Token", "").strip()
    query_token = ""
    if query:
        values = query.get("adminToken") or []
        if values:
            query_token = values[0].strip()
    payload_token = str(payload.get("adminToken", "")).strip() if payload else ""
    token = header_token or payload_token or query_token

    if ADMIN_TOKEN:
        if token != ADMIN_TOKEN:
            raise PermissionError("Admin token required.")
        return "admin-token"

    if host_is_local(handler):
        return "local-admin"

    raise PermissionError("Admin token not configured.")


class DebatebookHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_ROOT), **kwargs)

    def end_headers(self):
        origin = self.headers.get("Origin", "")
        allow_origin = "*"
        if ALLOWED_ORIGINS:
            allow_origin = origin if origin in ALLOWED_ORIGINS else ALLOWED_ORIGINS[0]
            self.send_header("Vary", "Origin")
        elif origin:
            allow_origin = origin
        self.send_header("Access-Control-Allow-Origin", allow_origin)
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Viewer-Token, X-Admin-Token")
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
            self.send_json(
                {
                    "ok": True,
                    "time": iso_now_utc(),
                    "timezone": str(APP_TIMEZONE),
                    "dbPath": str(DB_PATH),
                }
            )
            return

        if parsed.path == "/api/bootstrap":
            viewer_token = self.read_viewer_token(query=query)
            with db_connection() as conn:
                ensure_db(conn)
                self.send_json(build_bootstrap_payload(conn, viewer_token))
            return

        if parsed.path == "/api/threads":
            with db_connection() as conn:
                ensure_db(conn)
                self.send_json({"threads": [serialize_published_thread(row) for row in published_thread_rows(conn)]})
            return

        if parsed.path.startswith("/api/threads/"):
            thread_id = unquote(parsed.path.removeprefix("/api/threads/"))
            with db_connection() as conn:
                ensure_db(conn)
                row = published_thread_row(conn, thread_id)
                if not row:
                    self.send_json({"error": "Thread not found."}, 404)
                    return
                self.send_json({"thread": serialize_published_thread(row)})
            return

        if parsed.path == "/api/admin/bootstrap":
            try:
                admin_actor(self, query=query)
            except PermissionError as exc:
                self.send_json({"error": str(exc)}, 403)
                return
            with db_connection() as conn:
                ensure_db(conn)
                self.send_json(build_admin_bootstrap(conn))
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

        if parsed.path == "/api/argument-submissions":
            with db_connection() as conn:
                ensure_db(conn)
                self.send_json({"argumentSubmissions": [serialize_argument_submission(row) for row in argument_submission_rows(conn)]})
            return

        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        payload, error = read_json_body(self)
        if error:
            self.send_json({"error": error}, 400)
            return

        query = parse_qs(urlparse(self.path).query)
        viewer_token = self.read_viewer_token(payload=payload, query=query)

        try:
            with db_connection() as conn:
                ensure_db(conn)

                if parsed.path == "/api/submitted-sources":
                    source, submission = upsert_submitted_source(conn, payload, viewer_token)
                    self.send_json(
                        {
                            "source": serialize_source(
                                conn.execute("SELECT * FROM submitted_sources WHERE id = ?", (source["id"],)).fetchone()
                            ),
                            "sources": [serialize_source(row) for row in submitted_source_rows(conn)],
                            "submission": submission,
                        },
                        201,
                    )
                    return

                if parsed.path == "/api/topic-proposals":
                    submission = create_topic_proposal(conn, payload, viewer_token)
                    self.send_json(
                        {
                            **build_bootstrap_payload(conn, viewer_token),
                            "submission": submission,
                        },
                        201,
                    )
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
                    comment, submission = create_comment(conn, payload, viewer_token)
                    self.send_json(
                        {
                            "comment": comment if submission["status"] == "approved" else None,
                            "commentsByRound": comments_by_round(conn),
                            "submission": submission,
                        },
                        201,
                    )
                    return

                if parsed.path == "/api/argument-submissions":
                    argument, submission = create_argument_submission(conn, payload, viewer_token)
                    self.send_json(
                        {
                            "argument": argument if submission["status"] == "approved" else None,
                            "argumentSubmissions": [serialize_argument_submission(row) for row in argument_submission_rows(conn)],
                            "submission": submission,
                        },
                        201,
                    )
                    return

                if parsed.path.startswith("/api/admin/"):
                    actor = admin_actor(self, payload=payload)
                    cycle = active_cycle_row(conn)
                    cycle_id = cycle["id"] if cycle else ensure_cycle(conn)

                    if parsed.path == "/api/admin/review":
                        review_entity(
                            conn,
                            str(payload.get("kind", "")).strip(),
                            str(payload.get("id", "")).strip(),
                            str(payload.get("action", "")).strip(),
                            actor,
                            str(payload.get("note", "")).strip(),
                        )
                        self.send_json(build_admin_bootstrap(conn), 201)
                        return

                    if parsed.path == "/api/admin/feature-proposal":
                        proposal_id = str(payload.get("proposalId", "")).strip()
                        if not proposal_id:
                            self.send_json({"error": "proposalId is required"}, 400)
                            return
                        set_featured_proposal(conn, cycle_id, proposal_id, actor, str(payload.get("note", "")).strip())
                        self.send_json(build_admin_bootstrap(conn), 201)
                        return

                    if parsed.path == "/api/admin/clear-featured":
                        clear_featured_proposal(conn, cycle_id, actor)
                        self.send_json(build_admin_bootstrap(conn), 201)
                        return

                    if parsed.path == "/api/admin/promote-thread":
                        proposal_id = str(payload.get("proposalId", "")).strip()
                        if not proposal_id:
                            self.send_json({"error": "proposalId is required"}, 400)
                            return
                        promote_proposal_to_thread(conn, cycle_id, proposal_id, actor, str(payload.get("note", "")).strip())
                        self.send_json(build_admin_bootstrap(conn), 201)
                        return

                    if parsed.path == "/api/admin/clear-promoted":
                        clear_promoted_thread(conn, cycle_id, actor)
                        self.send_json(build_admin_bootstrap(conn), 201)
                        return

                    if parsed.path == "/api/admin/refresh-topics":
                        cycle_id, proposals = refresh_daily_topics(conn, actor=actor)
                        self.send_json(
                            {
                                "cycleId": cycle_id,
                                "proposals": proposals,
                                "admin": build_admin_bootstrap(conn),
                            },
                            201,
                        )
                        return

        except ValueError as exc:
            self.send_json({"error": str(exc)}, 400)
            return
        except PermissionError as exc:
            self.send_json({"error": str(exc)}, 403)
            return

        self.send_error(404)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        prefix = "/api/submitted-sources/"
        if not parsed.path.startswith(prefix):
            self.send_error(404)
            return

        source_id = unquote(parsed.path[len(prefix) :])
        viewer_token = self.read_viewer_token()
        try:
            with db_connection() as conn:
                ensure_db(conn)
                is_admin = False
                try:
                    admin_actor(self)
                    is_admin = True
                except PermissionError:
                    is_admin = False
                delete_submitted_source(conn, source_id, viewer_token, is_admin=is_admin)
                self.send_json({"sources": [serialize_source(row) for row in submitted_source_rows(conn)]})
        except PermissionError as exc:
            self.send_json({"error": str(exc)}, 403)


def main(argv=None):
    argv = argv or sys.argv[1:]
    if argv and argv[0] == "refresh-topics":
        cycle_id, proposals = refresh_daily_topics(actor="cli-refresh")
        print(f"Refreshed {len(proposals)} topic candidates for {cycle_id}")
        for proposal in proposals:
            print(f"- {proposal['title']}: {proposal['question']}")
        return

    port = int(argv[0]) if argv else int(os.environ.get("PORT", "3100"))
    with db_connection() as conn:
        ensure_db(conn)
    server = ThreadingHTTPServer(("", port), DebatebookHandler)
    print(f"Serving Debatebook on http://127.0.0.1:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
