import asyncio
import json
import logging
import os
import random

from dotenv import load_dotenv
from livekit import api, rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    inference,
    room_io,
)
from livekit.plugins import (
    cartesia,
    deepgram,
    noise_cancellation,
    openai,
    silero,
    simli,
)
from livekit.plugins.turn_detector.multilingual import MultilingualModel

import interview_feedback

logger = logging.getLogger("agent")

load_dotenv(".env")
os.environ["AWS_REGION"] = os.getenv("AWS_REGION", "us-east-1")

DEFAULT_AVATAR_CONTEXT = {
    "name": "Candidate",
    "role": "General Position",
    "user_id": "",
    "interview_type": "hr",
    "job_requirements": "",
}

# Cartesia voice library IDs: Katie (female) for HR, Blake (male) for technical.
HR_CARTESIA_VOICE = "f786b574-daa5-4673-aa0c-cbe3e8534c02"
TECHNICAL_CARTESIA_VOICE = "a167e0f3-df7e-4d52-a9c3-f949145efdab"
TECHNICAL_SIMLI_FACE_ID = "dd10cb5a-d31d-4f12-b69f-6db3383c006e"
MIN_MAIN_QUESTIONS = 5


def build_stt():
    deepgram_key = os.getenv("DEEPGRAM_API_KEY")
    if deepgram_key:
        print("--- DEBUG: Using Deepgram STT (direct API key) ---")
        return deepgram.STT(api_key=deepgram_key)

    livekit_key = os.getenv("LIVEKIT_API_KEY")
    livekit_secret = os.getenv("LIVEKIT_API_SECRET")
    if not livekit_key or not livekit_secret:
        raise ValueError(
            "Set DEEPGRAM_API_KEY or LIVEKIT_API_KEY + LIVEKIT_API_SECRET in hireme-agent/.env"
        )

    print("--- DEBUG: Using LiveKit Inference STT (Deepgram via LiveKit Cloud) ---")
    return inference.STT(
        model="deepgram/nova-3",
        language="en",
        api_key=livekit_key,
        api_secret=livekit_secret,
    )


def build_tts(context: dict | None = None):
    voice = select_voice(context or {})
    cartesia_key = os.getenv("CARTESIA_API_KEY")
    if cartesia_key:
        print(f"--- DEBUG: Using Cartesia TTS (direct API key), voice={voice} ---")
        return cartesia.TTS(api_key=cartesia_key, voice=voice)

    livekit_key = os.getenv("LIVEKIT_API_KEY")
    livekit_secret = os.getenv("LIVEKIT_API_SECRET")
    if not livekit_key or not livekit_secret:
        raise ValueError(
            "Set CARTESIA_API_KEY or LIVEKIT_API_KEY + LIVEKIT_API_SECRET in hireme-agent/.env"
        )

    print(f"--- DEBUG: Using LiveKit Inference TTS (Cartesia), voice={voice} ---")
    return inference.TTS(
        model="cartesia/sonic-2",
        voice=voice,
        api_key=livekit_key,
        api_secret=livekit_secret,
    )

def _job_requirements_from(data: dict) -> str:
    raw = data.get("job_requirements") or data.get("jobRequirements") or ""
    if not isinstance(raw, str):
        raw = str(raw)
    return raw.strip()[:6000]


def _interview_type_from(data: dict) -> str:
    raw = data.get("interview_type") or data.get("interviewType") or "hr"
    return "technical" if str(raw).strip().lower() == "technical" else "hr"


def select_simli_face_id(context: dict) -> str:
    if _interview_type_from(context) == "technical":
        return os.getenv("TECHNICAL_SIMLI_FACE_ID") or TECHNICAL_SIMLI_FACE_ID
    return os.getenv("HR_SIMLI_FACE_ID") or os.getenv("SIMLI_FACE_ID", "")


def select_voice(context: dict) -> str:
    """Match the voice to the avatar: the technical interviewer is male."""
    if _interview_type_from(context) == "technical":
        return os.getenv("TECHNICAL_CARTESIA_VOICE") or TECHNICAL_CARTESIA_VOICE
    return os.getenv("HR_CARTESIA_VOICE") or HR_CARTESIA_VOICE


def _scan_hr_questions() -> list[str]:
    import boto3

    table_name = (os.getenv("HR_QUESTIONS_TABLE") or "").strip()
    if not table_name:
        raise RuntimeError("HR_QUESTIONS_TABLE is not configured for the interview agent")

    table = boto3.resource("dynamodb", region_name=os.getenv("AWS_REGION", "us-east-1")).Table(table_name)
    items = []
    response = table.scan()
    items.extend(response.get("Items") or [])
    while response.get("LastEvaluatedKey"):
        response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
        items.extend(response.get("Items") or [])

    questions = []
    for item in items:
        value = item.get("question") or item.get("Question") or item.get("text")
        if value and str(value).strip():
            questions.append(str(value).strip())
    return list(dict.fromkeys(questions))


async def load_hr_questions(count: int = MIN_MAIN_QUESTIONS) -> list[str]:
    questions = await asyncio.to_thread(_scan_hr_questions)
    if len(questions) < count:
        raise RuntimeError(
            f"HR question pool needs at least {count} valid questions; found {len(questions)}"
        )
    return random.SystemRandom().sample(questions, count)


def build_interview_instructions(context: dict) -> str:
    name = context.get("name", DEFAULT_AVATAR_CONTEXT["name"])
    role = context.get("role", DEFAULT_AVATAR_CONTEXT["role"])
    interview_type = _interview_type_from(context)
    job_requirements = (context.get("job_requirements") or "").strip()

    if interview_type == "hr":
        questions = context.get("hr_questions") or []
        numbered_questions = "\n".join(
            f"{index}. {question}" for index, question in enumerate(questions, start=1)
        )
        return f"""You are a professional and friendly HireMe HR interviewer.

CANDIDATE CONTEXT:
- Name: {name}
- Target role: {role}

APPROVED HR QUESTION POOL FOR THIS SESSION:
{numbered_questions}

RULES:
- This is an HR and behavioral interview only. Never ask technical questions.
- Ask all five approved main questions, in the listed order, one at a time.
- Never invent, replace, or skip a main question.
- After an unclear or shallow answer, you may ask one short behavioral follow-up before continuing.
- Keep each reply to at most 2-3 short sentences for avatar lip-sync.
- After all five main questions are answered, thank {name}, say detailed feedback will appear after the call, and end naturally."""

    if job_requirements:
        return f"""You are a professional and friendly HireMe interviewer.

CANDIDATE CONTEXT:
- Name: {name}
- Target role: {role}

JOB DESCRIPTION (source of truth for technical questions):
{job_requirements}

BEHAVIOR & TONE:
- Be polite, calm, and confident.
- Ask one question at a time.
- Allow the candidate time to respond before continuing.
- If an answer is vague, ask a short follow-up question.
- Keep responses concise to ensure smooth avatar lip-sync.
- Never ask more than one question in a single reply.
- Keep each reply to at most 2-3 short sentences.

TECHNICAL QUESTIONS:
- Ask at least five technical questions grounded in the job description above.
- Cover the stack, tools, and responsibilities named in the posting.
- Do not invent a different tech stack. If the posting is thin, ask about the closest skills it does mention.
- Do not ask HR or behavioral questions.

INTERVIEW STRUCTURE:
1. Greet {name} and say you will interview them against this job description for a {role} position.
2. Ask five job-description technical questions, one at a time.
3. Ask a short technical follow-up only when an answer needs clarification.
4. End by thanking the candidate and say detailed feedback will appear after the call."""

    return f"""You are a professional and friendly HireMe interviewer.

CANDIDATE CONTEXT:
- Name: {name}
- Target role: {role}

BEHAVIOR & TONE:
- Be polite, calm, and confident.
- Ask one question at a time.
- Allow the candidate time to respond before continuing.
- If an answer is vague, ask a short follow-up question.
- Keep responses concise to ensure smooth avatar lip-sync.
- Never ask more than one question in a single reply.
- Keep each reply to at most 2-3 short sentences.

INTERVIEW STRUCTURE:
1. Greet {name} and explain this is a technical interview for a {role} position.
2. Generate and ask at least five varied technical questions relevant to {role}, one at a time.
3. Cover multiple relevant skills and include practical scenarios, debugging, or trade-offs.
4. Ask a short technical follow-up only when an answer needs clarification.
5. Never ask HR or behavioral questions.
6. End by thanking the candidate and say detailed feedback will appear after the call."""


def build_greeting(context: dict) -> str:
    name = context.get("name", DEFAULT_AVATAR_CONTEXT["name"])
    role = context.get("role", DEFAULT_AVATAR_CONTEXT["role"])
    if _interview_type_from(context) == "hr":
        return (
            f"Hello {name}, thank you for joining today. "
            "I'll guide you through a focused HR and behavioral interview."
        )
    if (context.get("job_requirements") or "").strip():
        return (
            f"Hello {name}, thank you for joining today. "
            f"I'll ask questions based on the job description you shared for this {role} role."
        )
    return (
        f"Hello {name}, thank you for joining today. "
        f"I'll be asking you a few questions to better understand your fit for this {role} role."
    )


async def wait_for_user_context(room: rtc.Room, timeout: float = 30.0) -> dict:
    def parse_context(metadata: str | None) -> dict | None:
        if not metadata:
            return None
        try:
            data = json.loads(metadata)
        except json.JSONDecodeError:
            logger.warning("Invalid participant metadata JSON: %s", metadata)
            return None

        if data.get("name") or data.get("role") or data.get("job_requirements") or data.get("jobRequirements"):
            return {
                "name": data.get("name", DEFAULT_AVATAR_CONTEXT["name"]),
                "role": data.get("role", DEFAULT_AVATAR_CONTEXT["role"]),
                "user_id": data.get("user_id") or "",
                "interview_type": _interview_type_from(data),
                "job_requirements": _job_requirements_from(data),
            }
        return None

    def check_participants() -> dict | None:
        for participant in room.remote_participants.values():
            context = parse_context(participant.metadata)
            if context:
                return context
        return None

    existing = check_participants()
    if existing:
        logger.info("Avatar context loaded from existing participant: %s", existing)
        return existing

    loop = asyncio.get_running_loop()
    future: asyncio.Future[dict] = loop.create_future()

    @room.on("participant_connected")
    def _on_connected(participant: rtc.RemoteParticipant) -> None:
        context = parse_context(participant.metadata)
        if context and not future.done():
            logger.info("Avatar context loaded on participant_connected: %s", context)
            future.set_result(context)

    @room.on("participant_metadata_changed")
    def _on_metadata_changed(
        participant: rtc.RemoteParticipant,
        prev_metadata: str,
    ) -> None:
        context = parse_context(participant.metadata)
        if context and not future.done():
            logger.info("Avatar context loaded on metadata_changed: %s", context)
            future.set_result(context)

    try:
        return await asyncio.wait_for(future, timeout)
    except asyncio.TimeoutError:
        logger.warning("Timed out waiting for participant metadata; using defaults")
        return DEFAULT_AVATAR_CONTEXT.copy()


class Assistant(Agent):
    def __init__(self, context: dict | None = None) -> None:
        context = context or DEFAULT_AVATAR_CONTEXT.copy()
        super().__init__(instructions=build_interview_instructions(context))
        self._context = context


server = AgentServer()

def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()

server.setup_fnc = prewarm

def load_avatar_context(ctx: JobContext) -> dict | None:
    if not ctx.job.metadata:
        return None
    try:
        data = json.loads(ctx.job.metadata)
    except json.JSONDecodeError:
        logger.warning("Invalid job metadata JSON: %s", ctx.job.metadata)
        return None

    if data.get("name") or data.get("role") or data.get("job_requirements") or data.get("jobRequirements"):
        return {
            "name": data.get("name", DEFAULT_AVATAR_CONTEXT["name"]),
            "role": data.get("role", DEFAULT_AVATAR_CONTEXT["role"]),
            "user_id": data.get("user_id") or "",
            "interview_type": _interview_type_from(data),
            "job_requirements": _job_requirements_from(data),
        }
    return None


@server.rtc_session(agent_name="my-agent")
async def entrypoint(ctx: JobContext):
    print(f"--- DEBUG: Agent received request for room: {ctx.room.name} ---")
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    openai_api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if openai_api_key.startswith("Sk-"):
        openai_api_key = "sk-" + openai_api_key[3:]
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set. Add it to your .env file.")

    await ctx.connect()
    print(f"--- DEBUG: Connected to room: {ctx.room.name} ---")

    avatar_context = load_avatar_context(ctx)
    if avatar_context:
        print(f"--- DEBUG: Interview context from job metadata: name={avatar_context.get('name')} role={avatar_context.get('role')} ---")
    else:
        avatar_context = await wait_for_user_context(ctx.room)
        print(f"--- DEBUG: Interview context from participant metadata: name={avatar_context.get('name')} role={avatar_context.get('role')} ---")
    print(
        f"--- DEBUG: Job description chars: {len((avatar_context.get('job_requirements') or '').strip())} ---"
    )
    if _interview_type_from(avatar_context) == "hr":
        avatar_context["hr_questions"] = await load_hr_questions()
        print(f"--- DEBUG: Loaded {len(avatar_context['hr_questions'])} HR questions ---")

    session = AgentSession(
        stt=build_stt(),
        llm=openai.LLM(
            model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            api_key=openai_api_key,
        ),
        tts=build_tts(avatar_context),
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        # Simli + open speakers: don't allow echo from the mic to interrupt the avatar.
        preemptive_generation=False,
        resume_false_interruption=False,
        allow_interruptions=False,
        discard_audio_if_uninterruptible=True,
        aec_warmup_duration=5.0,
        min_endpointing_delay=0.6,
        max_endpointing_delay=3.0,
    )

    greeting = build_greeting(avatar_context)
    print(f"--- DEBUG: Interview role for this session: {avatar_context.get('role')} ---")
    print(f"--- DEBUG: Greeting: {greeting} ---")

    await session.start(
        agent=Assistant(context=avatar_context),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=noise_cancellation.BVC(),
            ),
        ),
    )
    print("--- DEBUG: Session started ---")

    transcript: list[dict] = []
    started_at = interview_feedback.utc_now_iso()

    @session.on("conversation_item_added")
    def _on_conversation_item(ev):
        try:
            item = getattr(ev, "item", None)
            role = str(getattr(item, "role", "") or "")
            text = getattr(item, "text_content", None) or ""
            if role in ("user", "assistant") and text.strip():
                transcript.append(
                    {
                        "role": role,
                        "text": text,
                        "at": interview_feedback.utc_now_iso(),
                    }
                )
        except Exception as exc:
            print(f"--- WARN: could not record transcript turn: {exc} ---")

    async def _analyze_and_store(*_args):
        try:
            name = avatar_context.get("name", DEFAULT_AVATAR_CONTEXT["name"])
            role = avatar_context.get("role", DEFAULT_AVATAR_CONTEXT["role"])
            user_id = avatar_context.get("user_id") or ""
            interview_type = _interview_type_from(avatar_context)
            job_requirements = avatar_context.get("job_requirements") or ""

            if not user_id:
                print("--- DEBUG: No user_id in metadata; skipping interview feedback ---")
                return

            answers = interview_feedback.count_user_turns(transcript)
            if not interview_feedback.has_enough_content(transcript):
                print(f"--- DEBUG: Only {answers} answer(s); skipping interview feedback ---")
                return

            record = interview_feedback.build_record(
                user_id=user_id,
                room=ctx.room.name,
                name=name,
                role=role,
                interview_type=interview_type,
                transcript=transcript,
                feedback=interview_feedback.estimate_feedback(transcript, role, interview_type),
                started_at=started_at,
                ended_at=interview_feedback.utc_now_iso(),
            )

            # Store the estimate first: if grading is slow or the process is killed,
            # the session still has a report instead of disappearing.
            await interview_feedback.save_record(record)
            print(f"--- DEBUG: Interview transcript stored: {record['sortKey']} ---")

            print(f"--- DEBUG: Analyzing interview for {user_id} ({answers} answers) ---")
            feedback = await interview_feedback.analyze_transcript(
                transcript,
                name=name,
                role=role,
                interview_type=interview_type,
                job_requirements=job_requirements,
            )
            if feedback.get("isMockFallback"):
                print("--- DEBUG: Grading unavailable; keeping the estimated report ---")
                return

            record["feedback"] = feedback
            await interview_feedback.save_record(record)
            print(f"--- DEBUG: Interview feedback stored: {record['sortKey']} ---")
        except Exception as exc:
            print(f"--- ERROR: Interview feedback pipeline failed: {exc} ---")

    ctx.add_shutdown_callback(_analyze_and_store)

    simli_conf = simli.SimliConfig(
        api_key=os.getenv("SIMLI_API_KEY", ""),
        face_id=select_simli_face_id(avatar_context),
    )
    avatar = simli.AvatarSession(simli_config=simli_conf)

    try:
        await avatar.start(session, room=ctx.room)
        print("--- DEBUG: Simli Avatar joined and active ---")
    except Exception as e:
        print(f"--- ERROR: Simli failed to start: {e} ---")

    greeting_tasks = set()

    @session.on("start")
    def _on_start():
        task = asyncio.create_task(session.say(greeting))
        greeting_tasks.add(task)
        task.add_done_callback(greeting_tasks.discard)


async def main():
    url = os.getenv("LIVEKIT_URL")
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")

    async with api.LiveKitAPI(url, api_key, api_secret) as lkapi:
        await lkapi.agent_dispatch.create_dispatch(
            api.CreateAgentDispatchRequest(
                agent_name="my-agent",
                room="interview-room"
            )
        )
        print("Dispatch sent! Your Docker agent should now start the session.")

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "dispatch":
        print("--- Manually triggering agent dispatch to interview-room ---")
        asyncio.run(main())
        sys.exit(0)

    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="my-agent",
            prewarm_fnc=prewarm,
            # Interview grading runs in a shutdown callback and calls OpenAI, which
            # does not fit in the 10s default before the job process is killed.
            shutdown_process_timeout=60.0,
        )
    )
