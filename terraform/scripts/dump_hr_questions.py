"""Scan an HR questions DynamoDB table and write JSON for seeding another account."""

import argparse
import json
from decimal import Decimal
from pathlib import Path

import boto3


def _json_default(value):
    if isinstance(value, Decimal):
        return int(value) if value % 1 == 0 else float(value)
    raise TypeError(f"Cannot serialize {type(value)}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--table", required=True)
    parser.add_argument("--region", default="us-east-1")
    parser.add_argument(
        "--out",
        default=str(Path(__file__).resolve().parents[1] / "data" / "hr_questions.json"),
    )
    args = parser.parse_args()

    table = boto3.resource("dynamodb", region_name=args.region).Table(args.table)
    items = []
    response = table.scan()
    items.extend(response.get("Items") or [])
    while response.get("LastEvaluatedKey"):
        response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
        items.extend(response.get("Items") or [])

    if len(items) < 5:
        raise SystemExit(f"Expected at least 5 questions; scanned {len(items)}")

    Path(args.out).write_text(json.dumps(items, indent=2, default=_json_default) + "\n", encoding="utf-8")
    print(f"Wrote {len(items)} item(s) to {args.out}")


if __name__ == "__main__":
    main()
