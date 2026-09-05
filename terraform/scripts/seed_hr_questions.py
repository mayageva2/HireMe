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
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Overwrite items from the file and delete table rows whose id is not in the file.",
    )
    args = parser.parse_args()

    questions = json.loads(Path(args.data).read_text(encoding="utf-8"))
    if len(questions) < 5:
        raise SystemExit("Seed file must contain at least five questions")
    for question in questions:
        if "id" not in question:
            raise SystemExit("Each question must have an id field")

    table = boto3.resource("dynamodb", region_name=args.region).Table(args.table)
    existing = table.scan(ProjectionExpression="id").get("Items", [])
    existing_ids = {item["id"] for item in existing}
    seed_ids = {question["id"] for question in questions}
    added = 0
    with table.batch_writer(overwrite_by_pkeys=["id"]) as batch:
        for question in questions:
            if not args.replace and question["id"] in existing_ids:
                continue
            batch.put_item(Item=question)
            added += 1
        removed = 0
        if args.replace:
            for item_id in existing_ids - seed_ids:
                batch.delete_item(Key={"id": item_id})
                removed += 1

    if args.replace:
        print(f"HR pool replaced: wrote {added}; removed {removed} extra item(s).")
    else:
        print(f"HR pool ready: added {added}; preserved {len(existing_ids)} existing item(s).")


if __name__ == "__main__":
    main()
