#!/usr/bin/env python3
import json
import sys
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

QUEUE_PATH = Path(__file__).with_name("submitted-sources.json")


def read_queue():
    if not QUEUE_PATH.exists():
        return []
    try:
        return json.loads(QUEUE_PATH.read_text())
    except json.JSONDecodeError:
        return []


def write_queue(sources):
    QUEUE_PATH.write_text(json.dumps(sources, indent=2) + "\n")


class DebatebookHandler(SimpleHTTPRequestHandler):
    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/submitted-sources":
            self.send_json({"sources": read_queue()})
            return
        super().do_GET()

    def do_POST(self):
        if self.path != "/api/submitted-sources":
            self.send_error(404)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            self.send_json({"error": "Invalid JSON"}, 400)
            return

        raw_url = str(payload.get("url", "")).strip()
        parsed = urlparse(raw_url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            self.send_json({"error": "Invalid article URL"}, 400)
            return

        source = {
            "id": payload.get("id") or f"U-{int(datetime.utcnow().timestamp() * 1000)}",
            "url": raw_url,
            "title": str(payload.get("title", "")).strip(),
            "note": str(payload.get("note", "")).strip(),
            "cadence": payload.get("cadence") if payload.get("cadence") in {"hourly", "daily"} else "daily",
            "submittedAt": payload.get("submittedAt") or datetime.utcnow().isoformat(timespec="minutes") + "Z",
            "status": "queued",
        }
        sources = [source] + [item for item in read_queue() if item.get("id") != source["id"]]
        write_queue(sources)
        self.send_json({"source": source, "sources": sources}, 201)

    def do_DELETE(self):
        prefix = "/api/submitted-sources/"
        if not self.path.startswith(prefix):
            self.send_error(404)
            return

        source_id = unquote(self.path[len(prefix) :])
        sources = [item for item in read_queue() if item.get("id") != source_id]
        write_queue(sources)
        self.send_json({"sources": sources})


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3100
    server = ThreadingHTTPServer(("", port), DebatebookHandler)
    print(f"Serving Debatebook on http://127.0.0.1:{port}")
    server.serve_forever()
