import json
import os

import boto3


CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def lambda_handler(event, context):
    method = (
        event.get("requestContext", {}).get("http", {}).get("method")
        or event.get("httpMethod")
        or "GET"
    )
    if method == "OPTIONS":
        return {"statusCode": 204, "headers": CORS_HEADERS, "body": ""}

    table = boto3.resource("dynamodb").Table(os.environ["HR_QUESTIONS_TABLE"])
    items = table.scan().get("Items") or []
    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps(items),
    }
