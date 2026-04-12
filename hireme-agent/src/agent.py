import logging
import os
import asyncio

from dotenv import load_dotenv
from livekit import rtc, api
from livekit.plugins import simli, deepgram, cartesia, google
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
async def my_agent(ctx: JobContext):
    # Logging setup
    print(f"--- DEBUG: Agent received request for room: {ctx.room.name} ---")
    if ctx.room.name != "interview-room":
        print(f"--- INFO: Ignoring room {ctx.room.name}, waiting for interview-room ---")
        return
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Set up a voice AI pipeline using OpenAI, Cartesia, Deepgram, and the LiveKit turn detector
    session = AgentSession(
        # Speech-to-text (STT) is your agent's ears, turning the user's speech into text that the LLM can understand
        # See all available models at https://docs.livekit.io/agents/models/stt/
        stt=deepgram.STT(),
        # A Large Language Model (LLM) is your agent's brain, processing user input and generating a response
        # See all available models at https://docs.livekit.io/agents/models/llm/
        llm = google.LLM(
            model="gemini-2.5-flash",
            api_key=os.getenv("GOOGLE_API_KEY")
        ),
        # Text-to-speech (TTS) is your agent's voice, turning the LLM's text into speech that the user can hear
        # See all available models as well as voice selections at https://docs.livekit.io/agents/models/tts/
        tts=cartesia.TTS(voice="f786b574-daa5-4673-aa0c-cbe3e8534c02"),
        # VAD and turn detection are used to determine when the user is speaking and when the agent should respond
        # See more at https://docs.livekit.io/agents/build/turns
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        # allow the LLM to generate a response while waiting for the end of turn
        # See more at https://docs.livekit.io/agents/build/audio/#preemptive-generation
        preemptive_generation=True,
    )

    # To use a realtime model instead of a voice pipeline, use the following session setup instead.
    # (Note: This is for the OpenAI Realtime API. For other providers, see https://docs.livekit.io/agents/models/realtime/))
    # 1. Install livekit-agents[openai]
    # 2. Set OPENAI_API_KEY in .env.local
    # 3. Add `from livekit.plugins import openai` to the top of this file
    # 4. Use the following session setup instead of the version above
    # session = AgentSession(
    #     llm=openai.realtime.RealtimeModel(voice="marin")
    # )

    # # Add a virtual avatar to the session, if desired
    # # For other providers, see https://docs.livekit.io/agents/models/avatar/
    # avatar = hedra.AvatarSession(
    #   avatar_id="...",  # See https://docs.livekit.io/agents/models/avatar/plugins/hedra
    # )
    # # Start the avatar and wait for it to join
    # await avatar.start(session, room=ctx.room)

    # Join the room and connect to the user
    await ctx.connect()
    print(f"--- DEBUG: Connected to room: {ctx.room.name} ---")

    #connect to simli avatar
    simli_conf = simli.SimliConfig(
        api_key=os.getenv("SIMLI_API_KEY", ""),
        face_id=os.getenv("SIMLI_FACE_ID", ""),
    )
    avatar = simli.AvatarSession(simli_config=simli_conf)
    await avatar.start(session, room=ctx.room) #activates avatar in room

    @session.on("start")
    def _on_start():
        asyncio.create_task(session.say("Hello, thank you for joining today. I’ll be asking you a few professional and personal questions to better understand your fit for this teaching role."))

    # Start the session, which initializes the voice pipeline and warms up the models
    await session.start(
        agent=Assistant(),
        room=ctx.room,
    )

'''
@server.rtc_session(agent_name="my-agent")
async def entrypoint(ctx: JobContext):
    logger.info(f"--- ג'וב התקבל בחדר: {ctx.room.name} ---")
    
    # חיבור לחדר
    await ctx.connect()

     #connect to simli avatar
    avatar = simli.AvatarSession(
        api_key=os.getenv("SIMLI_API_KEY"),
        face_id=os.getenv("SIMLI_FACE_ID"),
    )
    await avatar.start(session, room=ctx.room) #activates avatar in room

    # Start the session, which initializes the voice pipeline and warms up the models
    await session.start(
        agent=Assistant(),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: (
                    noise_cancellation.BVCTelephony()
                    if params.participant.kind
                    == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                    else noise_cancellation.BVC()
                ),
            ),
        ),
    )
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
    
    print(f"\nHIREME INTERVIEW READY:")
    print(f"{base_url}/?token={token}")
    print(f"--------------------------\n")

async def main():
    # It uses LIVEKIT_API_KEY/SECRET from your .env automatically
    async with api.LiveKitAPI() as lkapi:
        await lkapi.agent_dispatch.create_dispatch(
            api.CreateAgentDispatchRequest(
                agent_name="my-agent",
                room="interview-room"
            )
        )
        print("Dispatch sent! Check your agent terminal.")

if __name__ == "__main__":
    asyncio.run(main())
    generate_debug_url()
    cli.run_app(server)


    