import logging
import os
import asyncio

from dotenv import load_dotenv
from livekit import rtc, api
from livekit.plugins import simli, deepgram, cartesia, google, openai
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    cli,
    inference,
    room_io,
)
from livekit.plugins import noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from livekit.agents import WorkerOptions

logger = logging.getLogger("agent")

load_dotenv(".env")
os.environ["AWS_ACCESS_KEY_ID"] = os.getenv("AWS_ACCESS_KEY_ID", "")
os.environ["AWS_SECRET_ACCESS_KEY"] = os.getenv("AWS_SECRET_ACCESS_KEY", "")
os.environ["AWS_SESSION_TOKEN"] = os.getenv("AWS_SESSION_TOKEN", "") 
os.environ["AWS_REGION"] = os.getenv("AWS_REGION", "us-east-1")

class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""You are a professional and friendly interviewer conducting a job interview for a teaching position. 
            Your goal is to evaluate both the candidate’s pedagogical knowledge and interpersonal skills.

            BEHAVIOR & TONE:
            - Be polite, calm, and confident.
            - Ask one question at a time.
            - Allow the candidate time to respond before continuing.
            - If an answer is vague, ask a short follow-up question.
            - Keep responses concise to ensure smooth avatar lip-sync.

            INTERVIEW STRUCTURE:
            1. start by saying: "Hello, thank you for joining today. I’ll be asking you a few professional and personal questions to better understand your fit for this teaching role."
            2. Ask at least two technical teaching questions (e.g., Classroom management, Lesson planning, or Adapting to learning styles).
            3. Ask at least two HR / behavioral questions (e.g., Motivation, Handling conflict, or Teamwork).
            4. End by thanking the candidate and inviting them to ask questions.""",
        )

server = AgentServer()

def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()

server.setup_fnc = prewarm

@server.rtc_session(agent_name="my-agent")
async def entrypoint(ctx: JobContext):
    # Logging setup
    print(f"--- DEBUG: Agent received request for room: {ctx.room.name} ---")
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Set up a voice AI pipeline using OpenAI, Cartesia, Deepgram, and the LiveKit turn detector
    session = AgentSession(
        stt=deepgram.STT(),
        llm = google.LLM(
            model="gemini-2.5-flash",
            api_key=os.getenv("GOOGLE_API_KEY")
        ),
        tts=cartesia.TTS(voice="f786b574-daa5-4673-aa0c-cbe3e8534c02"),
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
    )

    # Join the room and connect to the user
    await ctx.connect()
    print(f"--- DEBUG: Connected to room: {ctx.room.name} ---")

    # Delay for docker networking
    await asyncio.sleep(1)

    # Starts session before avatar
    await session.start(
        agent=Assistant(),
        room=ctx.room,
    )
    print("--- DEBUG: Session started ---")

    #connect to simli avatar
    simli_conf = simli.SimliConfig(
        api_key=os.getenv("SIMLI_API_KEY", ""),
        face_id=os.getenv("SIMLI_FACE_ID", ""),
    )
    avatar = simli.AvatarSession(simli_config=simli_conf)
    
    #activates avatar in room
    try:
        await avatar.start(session, room=ctx.room)
        print("--- DEBUG: Simli Avatar joined and active ---")
    except Exception as e:
        print(f"--- ERROR: Simli failed to start: {e} ---")

    @session.on("start")
    def _on_start():
        asyncio.create_task(session.say("Hello, thank you for joining today. I’ll be asking you a few professional and personal questions to better understand your fit for this teaching role."))

'''
def generate_debug_url():
    base_url = "http://localhost:3000"
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    
    token = (
        api.AccessToken(api_key, api_secret)
        .with_identity("Maya")
        .with_grants(api.VideoGrants(room_join=True, room="interview-room"))
        .to_jwt()
    )
    
    print(f"\nHIREME INTERVIEW READY:", flush=True)
    print(f"{base_url}/?token={token}", flush=True)
    print(f"--------------------------\n", flush=True)
'''

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

def on_worker_registered(worker):
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    if api_key and api_secret:
        generate_debug_url()
    else:
        logger.warning("LIVEKIT_API_KEY or SECRET not set; cannot generate URL.")

if __name__ == "__main__":
    import sys
    import threading
    import time

    # Create the CLI object
    if len(sys.argv) > 1 and sys.argv[1] == "dispatch":
        print("--- Manually triggering agent dispatch to interview-room ---")
        asyncio.run(main())
        sys.exit(0)

    # Function to print the URL after a short delay so it appears after the worker starts
    def delayed_url():
        time.sleep(5) # Wait for worker to initialize
        api_key = os.getenv("LIVEKIT_API_KEY")
        api_secret = os.getenv("LIVEKIT_API_SECRET")
        if api_key and api_secret:
            generate_debug_url()

    # Only run the debug URL if we are starting the agent (not downloading files)
    if len(sys.argv) > 1 and sys.argv[1] == "dev":
        threading.Thread(target=delayed_url, daemon=True).start()

    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="my-agent", 
            prewarm_fnc=prewarm,
        )
    )


    