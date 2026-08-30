"""Idempotently add the versioned HR question seed to DynamoDB."""

import argparse
import json
from pathlib import Path

import boto3


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--table", required=True, help="DynamoDB HR questions table name")
    parser.add_argument("--region", default="us-east-1")
    parser.add_argument(
        "--data",
        default=str(Path(__file__).resolve().parents[1] / "data" / "hr_questions.json"),
    )
    args = parser.parse_args()

    questions = json.loads(Path(args.data).read_text(encoding="utf-8"))
    if len(questions) < 5:
        raise SystemExit("Seed file must contain at least five questions")

    table = boto3.resource("dynamodb", region_name=args.region).Table(args.table)
    existing = table.scan(ProjectionExpression="id").get("Items", [])
    existing_ids = {item["id"] for item in existing}
    added = 0
    with table.batch_writer(overwrite_by_pkeys=["id"]) as batch:
        for question in questions:
            if question["id"] in existing_ids:
                continue
            batch.put_item(Item=question)
            added += 1

    print(f"HR pool ready: added {added}; preserved {len(existing_ids)} existing item(s).")


if __name__ == "__main__":
    main()
