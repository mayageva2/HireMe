import asyncio
import json
import os
import uuid
from datetime import timedelta

from livekit import api
CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def _parse_context(event: dict) -> dict:
    query = event.get("queryStringParameters") or {}
    body = event.get("body") or ""
    data = {}
    if body:
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            pass

    return {
        "name": data.get("name") or query.get("name") or "Candidate",
        "role": data.get("role") or query.get("role") or "General Position",
        "user_id": data.get("userId") or data.get("user_id") or query.get("userId") or "",
        "sort_key": data.get("sortKey") or data.get("sort_key") or query.get("sortKey") or "",
    }


async def _mint_interview_token(name: str, role: str, user_id: str, sort_key: str) -> dict:
    livekit_url = os.environ["LIVEKIT_URL"]
    api_key = os.environ["LIVEKIT_API_KEY"]
    api_secret = os.environ["LIVEKIT_API_SECRET"]

    room_name = f"interview-{uuid.uuid4().hex[:8]}"
    # user_id travels to the agent so it knows which DynamoDB row to write the feedback to.
    metadata = json.dumps(
        {
            "agent_name": "my-agent",
            "name": name,
            "role": role,
            "user_id": user_id,
            "sort_key": sort_key,
        }
    )

    token = (
        api.AccessToken(api_key, api_secret)
        .with_identity("maya")
        .with_name(name)
        .with_metadata(metadata)
        .with_ttl(timedelta(hours=6))
        .with_grants(            api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
            )
        )
    )

    jwt = token.to_jwt()

    async with api.LiveKitAPI(livekit_url, api_key, api_secret) as lkapi:
        await lkapi.agent_dispatch.create_dispatch(
            api.CreateAgentDispatchRequest(
                agent_name="my-agent",
                room=room_name,
                metadata=metadata,
            )
        )

    return {"token": jwt, "room": room_name}


def lambda_handler(event, context):
    method = (
        event.get("requestContext", {}).get("http", {}).get("method")
        or event.get("httpMethod")
        or "GET"
    )

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        ctx = _parse_context(event)
        result = asyncio.run(
            _mint_interview_token(
                ctx["name"], ctx["role"], ctx["user_id"], ctx["sort_key"]
            )
        )
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps(result),
        }
    except Exception as exc:
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": str(exc)}),
        }
