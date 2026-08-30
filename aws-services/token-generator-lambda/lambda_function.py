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


def _validate_hr_pool() -> None:
    table_name = (os.environ.get("HR_QUESTIONS_TABLE") or "").strip()
    if not table_name:
        raise RuntimeError("HR interviews are not configured: HR_QUESTIONS_TABLE is missing")

    import boto3

    response = boto3.resource("dynamodb").Table(table_name).scan(
        Select="COUNT",
        Limit=5,
    )
    if response.get("Count", 0) < 5:
        raise RuntimeError("HR interviews need at least five questions in the HR pool")


def _parse_context(event: dict) -> dict:
    query = event.get("queryStringParameters") or {}
    body = event.get("body") or ""
    data = {}
    if body:
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            pass

    job_requirements = (
        data.get("jobRequirements")
        or data.get("job_requirements")
        or query.get("jobRequirements")
        or ""
    )
    if not isinstance(job_requirements, str):
        job_requirements = str(job_requirements)
    job_requirements = job_requirements.strip()[:6000]
    interview_type = data.get("interviewType") or data.get("interview_type") or "hr"
    interview_type = "technical" if str(interview_type).lower() == "technical" else "hr"
    if interview_type == "hr":
        job_requirements = ""

    return {
        "name": data.get("name") or query.get("name") or "Candidate",
        "role": data.get("role") or query.get("role") or "General Position",
        "user_id": data.get("userId") or data.get("user_id") or query.get("userId") or "",
        "sort_key": data.get("sortKey") or data.get("sort_key") or query.get("sortKey") or "",
        "interview_type": interview_type,
        "job_requirements": job_requirements,
    }


async def _mint_interview_token(
    name: str,
    role: str,
    user_id: str,
    sort_key: str,
    interview_type: str = "hr",
    job_requirements: str = "",
) -> dict:
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
            "interview_type": interview_type,
            "job_requirements": job_requirements,
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
        if ctx["interview_type"] == "hr":
            _validate_hr_pool()
        result = asyncio.run(
            _mint_interview_token(
                ctx["name"],
                ctx["role"],
                ctx["user_id"],
                ctx["sort_key"],
                ctx["interview_type"],
                ctx["job_requirements"],
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
