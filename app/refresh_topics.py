#!/usr/bin/env python3
import argparse
import json

from server import db_connection, ensure_db, ensure_cycle, generate_topic_candidates, replace_cycle_topics


def main():
    parser = argparse.ArgumentParser(
        description="Refresh tomorrow's topic-vote board from the latest news feeds."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the generated topic candidates without writing them into the database.",
    )
    args = parser.parse_args()

    proposals = generate_topic_candidates()

    if args.dry_run:
        print(json.dumps(proposals, indent=2))
        return

    with db_connection() as conn:
        ensure_db(conn)
        cycle_id = ensure_cycle(conn)
        replace_cycle_topics(conn, cycle_id, proposals)

    print(f"Refreshed {len(proposals)} topic candidates for {cycle_id}")
    for proposal in proposals:
        print(f"- {proposal['title']}: {proposal['question']}")


if __name__ == "__main__":
    main()
