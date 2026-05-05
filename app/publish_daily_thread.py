#!/usr/bin/env python3
from server import db_connection, ensure_cycle, ensure_db, publish_winning_thread


def main():
    with db_connection() as conn:
        ensure_db(conn)
        cycle_id = ensure_cycle(conn)
        thread_id, thread = publish_winning_thread(conn, cycle_id, actor="cli-publish")
    print(f"Published {thread_id}")
    print(thread["title"])
    print(thread["question"])


if __name__ == "__main__":
    main()
