"""Admin management commands.

Usage (inside the api container):
  python -m app.cli create-admin admin@example.com            # prompts for password
  echo "$PW" | python -m app.cli create-admin a@b.c --password-stdin
"""

import argparse
import getpass
import sys

from app.db import SessionLocal
from app.services.admins import AdminError, create_admin


def _read_password(from_stdin: bool) -> str:
    if from_stdin:
        return sys.stdin.readline().rstrip("\n")
    password = getpass.getpass("Password: ")
    if password != getpass.getpass("Repeat password: "):
        raise AdminError("Passwords don't match")
    return password


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("create-admin", help="create an admin account")
    create.add_argument("email")
    create.add_argument(
        "--password-stdin", action="store_true", help="read the password from stdin (scripts)"
    )
    args = parser.parse_args(argv)

    try:
        password = _read_password(args.password_stdin)
        with SessionLocal() as db:
            admin = create_admin(db, args.email, password)
    except AdminError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    print(f"Created admin {admin.email}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
