import json
import os

import boto3


CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
}


def _first(item, *keys, default=""):
    for key in keys:
        value = item.get(key)
        if value:
            return value
    return default


def lambda_handler(event, context):
    method = (
        event.get("requestContext", {}).get("http", {}).get("method")
        or event.get("httpMethod")
        or "GET"
    )
    if method == "OPTIONS":
        return {"statusCode": 204, "headers": CORS_HEADERS, "body": ""}

    query = event.get("queryStringParameters") or {}
    user_id = query.get("userId", "")
    sort_key = query.get("sortKey") or user_id

    if not user_id:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": "userId is required"}),
        }

    try:
        table = boto3.resource("dynamodb").Table(os.environ["DYNAMODB_TABLE"])
        response = table.get_item(
            Key={
                "User id": user_id,
                "Sort Key": sort_key,
            }
        )
        item = response.get("Item") or {}

        body = {
            "name": _first(
                item,
                "FirstName",
                "firstName",
                "name",
                "fullName",
                default=user_id,
            ),
            "role": _first(
                item,
                "Target Field",
                "targetField",
                "profession",
                "role",
                default="General Position",
            ),
        }
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps(body),
        }
    except Exception as exc:
        print(f"Failed to load avatar context: {exc}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": "Unable to load avatar context"}),
        }
