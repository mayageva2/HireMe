"""Turn a captured interview transcript into a feedback report and store it.

The sink is chosen with INTERVIEW_FEEDBACK_SINK so the same code path runs locally
(writing a JSON file the Vite dev server reads) and on ECS (writing DynamoDB).
"""

import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

logger = logging.getLogger("agent.feedback")

SCHEMA_VERSION = 1

# Fixed set so the Dashboard skill bars have a stable shape across sessions.
CATEGORIES = [
    "Communication",
    "Technical Depth",
    "Structure (STAR)",
    "Confidence",
    "Role Relevance",
]

# DynamoDB items are capped at 400 KB, and long transcripts blow up prompt cost.
MAX_STORED_TURNS = 80
MAX_TURN_CHARS = 1200
MAX_PROMPT_TURNS = 60

MIN_USER_TURNS = 2

DEFAULT_DEV_DB = Path(__file__).resolve().parents[2] / "dev_interviews_db.json"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def count_user_turns(transcript: list[dict]) -> int:
    return sum(1 for turn in transcript if turn.get("role") == "user" and turn.get("text"))


def has_enough_content(transcript: list[dict]) -> bool:
    return count_user_turns(transcript) >= MIN_USER_TURNS


def _clean_turns(transcript: list[dict], max_turns: int) -> list[dict]:
    turns = [t for t in transcript if (t.get("text") or "").strip()]
    turns = turns[-max_turns:]
    return [
        {
            "role": t.get("role") or "user",
            "text": (t.get("text") or "")[:MAX_TURN_CHARS],
            "at": t.get("at") or "",
        }
        for t in turns
    ]


def _transcript_to_text(transcript: list[dict]) -> str:
    lines = []
    for turn in _clean_turns(transcript, MAX_PROMPT_TURNS):
        speaker = "Interviewer" if turn["role"] == "assistant" else "Candidate"
        lines.append(f"{speaker}: {turn['text']}")
    return "\n".join(lines)


def _build_system_prompt(role: str) -> str:
    category_list = ", ".join(f'"{c}"' for c in CATEGORIES)
    return f"""You are an experienced interview coach reviewing a mock job interview for a {role} position.

You are given the full transcript. The "Interviewer" lines are an AI interviewer; the "Candidate" lines are the person you are coaching. Judge only the candidate.

Be specific and honest but encouraging. Quote or paraphrase what the candidate actually said instead of giving generic advice. If the interview was very short or the candidate barely answered, say so and score accordingly.

Output a JSON object with exactly these keys:
1. "overallScore": a number from 0 to 10 (one decimal allowed) for overall interview performance.
2. "summary": one short paragraph (2-3 sentences) summarising how the candidate did.
3. "categories": a list with exactly these five entries, in this order, each an object with:
   - "name": one of {category_list}
   - "score": integer 0 to 10
   - "note": one short sentence justifying the score
4. "strengths": a list of up to 4 strings describing what the candidate did well.
5. "improvements": a list of up to 4 objects, each with:
   - "issue": what went wrong
   - "fix": a concrete, actionable change
   - "example": a short sample phrasing the candidate could have used
6. "questionFeedback": a list with one object per interviewer question that the candidate answered, each with:
   - "question": the interviewer's question, condensed to one line
   - "answerSummary": one line summarising the candidate's answer
   - "rating": exactly one of "strong", "ok", "weak"
   - "betterAnswer": a short suggestion for a stronger answer
7. "nextSteps": a list of up to 3 strings describing what to practise before the next interview.

Do not output markdown, backticks, or any text outside the JSON object."""


def estimate_feedback(transcript: list[dict], role: str) -> dict:
    """Heuristic report used when OpenAI is unavailable, so the flow never dead-ends."""
    user_turns = [t for t in transcript if t.get("role") == "user" and (t.get("text") or "").strip()]
    answer_count = len(user_turns)
    words = sum(len((t.get("text") or "").split()) for t in user_turns)
    avg_words = round(words / answer_count) if answer_count else 0

    score = 5.0
    if answer_count >= 4:
        score += 1.0
    if avg_words >= 40:
        score += 1.0
    if avg_words < 15:
        score -= 1.5
    score = max(1.0, min(9.0, score))

    strengths = ["You completed the session and stayed engaged with the interviewer."]
    if avg_words >= 30:
        strengths.append("Your answers had enough detail to follow your reasoning.")

    improvements = [
        {
            "issue": "Automatic analysis was unavailable, so this report is based on answer length only.",
            "fix": "Run the interview again once the OpenAI key is configured to get detailed coaching.",
            "example": "",
        }
    ]
    if avg_words < 25:
        improvements.append(
            {
                "issue": "Answers were short on average.",
                "fix": "Use the STAR structure to give context, action, and result for each answer.",
                "example": "In my last project, the build took 20 minutes, so I parallelised the test suite and cut it to 6.",
            }
        )

    return {
        "overallScore": score,
        "summary": (
            f"You answered {answer_count} question(s) for the {role} role, averaging about "
            f"{avg_words} words per answer. Detailed AI analysis was not available for this session."
        ),
        "categories": [{"name": name, "score": int(round(score)), "note": "Estimated without AI analysis."} for name in CATEGORIES],
        "strengths": strengths,
        "improvements": improvements,
        "questionFeedback": [],
        "nextSteps": ["Re-run the interview once AI analysis is available for specific feedback."],
        "isMockFallback": True,
        "analyzedAt": utc_now_iso(),
    }


def _normalize_feedback(parsed: dict, role: str) -> dict:
    def clamp(value, low, high, default):
        try:
            number = float(value)
        except (TypeError, ValueError):
            return default
        return max(low, min(high, number))

    by_name = {}
    for entry in parsed.get("categories") or []:
        if isinstance(entry, dict) and entry.get("name"):
            by_name[str(entry["name"]).strip().lower()] = entry

    categories = []
    for name in CATEGORIES:
        entry = by_name.get(name.lower(), {})
        categories.append(
            {
                "name": name,
                "score": int(clamp(entry.get("score"), 0, 10, 5)),
                "note": str(entry.get("note") or "").strip(),
            }
        )

    improvements = []
    for item in (parsed.get("improvements") or [])[:4]:
        if not isinstance(item, dict):
            continue
        improvements.append(
            {
                "issue": str(item.get("issue") or "").strip(),
                "fix": str(item.get("fix") or "").strip(),
                "example": str(item.get("example") or "").strip(),
            }
        )

    question_feedback = []
    for item in (parsed.get("questionFeedback") or [])[:12]:
        if not isinstance(item, dict):
            continue
        rating = str(item.get("rating") or "").strip().lower()
        if rating not in ("strong", "ok", "weak"):
            rating = "ok"
        question_feedback.append(
            {
                "question": str(item.get("question") or "").strip(),
                "answerSummary": str(item.get("answerSummary") or "").strip(),
                "rating": rating,
                "betterAnswer": str(item.get("betterAnswer") or "").strip(),
            }
        )

    return {
        "overallScore": round(clamp(parsed.get("overallScore"), 0, 10, 5), 1),
        "summary": str(parsed.get("summary") or f"Mock interview for the {role} role.").strip(),
        "categories": categories,
        "strengths": [str(s).strip() for s in (parsed.get("strengths") or [])[:4] if str(s).strip()],
        "improvements": improvements,
        "questionFeedback": question_feedback,
        "nextSteps": [str(s).strip() for s in (parsed.get("nextSteps") or [])[:3] if str(s).strip()],
        "isMockFallback": False,
        "analyzedAt": utc_now_iso(),
    }


async def analyze_transcript(transcript: list[dict], *, name: str, role: str) -> dict:
    """Ask OpenAI to grade the interview. Never raises: falls back to a heuristic report."""
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    model = os.getenv("OPENAI_FEEDBACK_MODEL") or os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

    if not api_key:
        logger.warning("OPENAI_API_KEY not set; using heuristic interview feedback")
        return estimate_feedback(transcript, role)

    transcript_text = _transcript_to_text(transcript)
    if not transcript_text.strip():
        return estimate_feedback(transcript, role)

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)
        response = await asyncio.wait_for(
            client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": _build_system_prompt(role)},
                    {
                        "role": "user",
                        "content": f"Candidate name: {name}\nTarget role: {role}\n\nTranscript:\n{transcript_text}",
                    },
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
            ),
            # Shutdown callbacks run on a grace timer, so fail fast rather than hang.
            timeout=40,
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("OpenAI returned an empty response")

        feedback = _normalize_feedback(json.loads(content), role)
        feedback["model"] = model
        logger.info("Interview feedback generated (score %s)", feedback["overallScore"])
        return feedback
    except Exception as exc:
        logger.error("Interview analysis failed, using fallback: %s", exc)
        return estimate_feedback(transcript, role)


def build_record(
    *,
    user_id: str,
    room: str,
    name: str,
    role: str,
    transcript: list[dict],
    feedback: dict,
    started_at: str,
    ended_at: str,
) -> dict:
    stored_transcript = _clean_turns(transcript, MAX_STORED_TURNS)

    duration = 0
    try:
        start = datetime.fromisoformat(started_at)
        end = datetime.fromisoformat(ended_at)
        duration = max(0, int((end - start).total_seconds()))
    except (TypeError, ValueError):
        pass

    return {
        "userId": user_id,
        "sortKey": f"interview#{ended_at}#{room}",
        "room": room,
        "candidateName": name,
        "role": role,
        "startedAt": started_at,
        "endedAt": ended_at,
        "durationSeconds": duration,
        "turnCount": len(stored_transcript),
        "transcript": stored_transcript,
        "feedback": feedback,
        "schemaVersion": SCHEMA_VERSION,
    }


def _save_to_file(record: dict) -> None:
    path = Path(os.getenv("INTERVIEW_FEEDBACK_FILE") or DEFAULT_DEV_DB)
    db = {}
    if path.exists():
        try:
            db = json.loads(path.read_text(encoding="utf-8") or "{}")
        except json.JSONDecodeError:
            logger.warning("Local interview DB was corrupt; starting a new one")

    sessions = db.setdefault(record["userId"], [])
    for index, existing in enumerate(sessions):
        if existing.get("sortKey") == record["sortKey"]:
            sessions[index] = record
            break
    else:
        sessions.append(record)
    path.write_text(json.dumps(db, indent=2, ensure_ascii=False), encoding="utf-8")
    logger.info("Interview feedback written to %s", path)


def _save_to_dynamodb(record: dict) -> None:
    import boto3

    region = os.getenv("AWS_REGION", "us-east-1")
    table_name = os.getenv("DYNAMODB_TABLE", "HireMe_Table")

    item = {key: value for key, value in record.items() if key not in ("userId", "sortKey")}
    item["User id"] = record["userId"]
    item["Sort Key"] = record["sortKey"]

    # DynamoDB rejects floats, so route everything through Decimal.
    item = json.loads(json.dumps(item), parse_float=Decimal)

    table = boto3.resource("dynamodb", region_name=region).Table(table_name)
    table.put_item(Item=item)
    logger.info("Interview feedback written to %s/%s", table_name, record["sortKey"])


async def save_record(record: dict) -> None:
    """Upsert one session by sortKey, so re-saving replaces the estimate with the graded
    report. Never raises: a storage failure must not crash the worker."""
    sink = (os.getenv("INTERVIEW_FEEDBACK_SINK") or "dynamodb").strip().lower()
    try:
        if sink == "file":
            await asyncio.to_thread(_save_to_file, record)
        else:
            await asyncio.to_thread(_save_to_dynamodb, record)
    except Exception as exc:
        logger.error("Could not save interview feedback (sink=%s): %s", sink, exc)
