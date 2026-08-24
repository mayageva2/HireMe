"""Run a transcript through the interview analysis and print the report.

    python scripts/test_feedback.py                  # built-in sample transcript
    python scripts/test_feedback.py my_transcript.json
"""

import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

import interview_feedback  # noqa: E402  (needs the src path above)

SAMPLE_TRANSCRIPT = [
    {"role": "assistant", "text": "Hello Maya, thanks for joining. Can you tell me a bit about yourself?"},
    {
        "role": "user",
        "text": "Sure. I'm a computer science student in my third year and I've been doing full stack work, "
        "mostly React on the front end and Node on the back end. Last summer I interned at Amdocs where I "
        "worked on internal APIs.",
    },
    {"role": "assistant", "text": "Great. Can you describe a technical challenge you faced in that internship?"},
    {
        "role": "user",
        "text": "Yeah, um, we had an endpoint that was really slow. It was taking like eight seconds. I looked at "
        "it and it was doing a database query inside a loop, so I rewrote it to fetch everything at once and it "
        "went down to under a second.",
    },
    {"role": "assistant", "text": "How do you handle disagreement with a teammate?"},
    {"role": "user", "text": "I just try to talk it out and usually we figure it out."},
    {"role": "assistant", "text": "Finally, where do you see yourself in three years?"},
    {
        "role": "user",
        "text": "I'd like to be a strong backend engineer, maybe leading a small feature team. I want to get much "
        "better at system design and cloud infrastructure along the way.",
    },
]


async def main() -> None:
    if len(sys.argv) > 1:
        transcript = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    else:
        transcript = SAMPLE_TRANSCRIPT

    feedback = await interview_feedback.analyze_transcript(
        transcript, name="Maya", role="Software Engineer"
    )
    print(json.dumps(feedback, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
