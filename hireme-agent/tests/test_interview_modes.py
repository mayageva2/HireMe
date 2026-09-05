import pytest

import agent
import interview_feedback


def test_hr_prompt_uses_only_supplied_pool_questions() -> None:
    questions = [f"Behavioral question {index}?" for index in range(1, 6)]
    prompt = agent.build_interview_instructions(
        {
            "name": "Maya",
            "role": "DevOps Engineer",
            "interview_type": "hr",
            "hr_questions": questions,
        }
    )

    assert "Never ask technical questions" in prompt
    assert "Never invent, replace, or skip" in prompt
    assert all(question in prompt for question in questions)


def test_technical_prompt_is_not_behavioral() -> None:
    prompt = agent.build_interview_instructions(
        {
            "name": "Maya",
            "role": "DevOps Engineer",
            "interview_type": "technical",
            "job_requirements": "AWS, Terraform, Kubernetes, and CI/CD",
        }
    )

    assert "at least five technical questions" in prompt
    assert "Do not ask HR or behavioral questions" in prompt


def test_face_selection_is_per_interview(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("HR_SIMLI_FACE_ID", "hr-face")
    monkeypatch.setenv("TECHNICAL_SIMLI_FACE_ID", "technical-face")

    assert agent.select_simli_face_id({"interview_type": "hr"}) == "hr-face"
    assert agent.select_simli_face_id({"interview_type": "technical"}) == "technical-face"


def test_voice_matches_interview_type(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("HR_CARTESIA_VOICE", raising=False)
    monkeypatch.delenv("TECHNICAL_CARTESIA_VOICE", raising=False)

    hr_voice = agent.select_voice({"interview_type": "hr"})
    technical_voice = agent.select_voice({"interview_type": "technical"})

    assert hr_voice == agent.HR_CARTESIA_VOICE
    assert technical_voice == agent.TECHNICAL_CARTESIA_VOICE
    assert hr_voice != technical_voice

    monkeypatch.setenv("TECHNICAL_CARTESIA_VOICE", "override-voice")
    assert agent.select_voice({"interview_type": "technical"}) == "override-voice"


@pytest.mark.asyncio
async def test_hr_pool_requires_five_questions(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(agent, "_scan_hr_questions", lambda: ["One?", "Two?"])

    with pytest.raises(RuntimeError, match="at least 5"):
        await agent.load_hr_questions()


def test_feedback_categories_and_record_match_type() -> None:
    transcript = [
        {"role": "assistant", "text": "How would you diagnose a failed deployment?"},
        {"role": "user", "text": "I would inspect events and logs, then verify the rollout configuration."},
    ]
    feedback = interview_feedback.estimate_feedback(
        transcript, "DevOps Engineer", "technical"
    )
    record = interview_feedback.build_record(
        user_id="user-1",
        room="room-1",
        name="Maya",
        role="DevOps Engineer",
        interview_type="technical",
        transcript=transcript,
        feedback=feedback,
        started_at="2026-01-01T00:00:00+00:00",
        ended_at="2026-01-01T00:05:00+00:00",
    )

    assert record["interviewType"] == "technical"
    assert [item["name"] for item in feedback["categories"]] == [
        "Technical Correctness",
        "Technical Depth",
        "Problem Solving",
        "Communication",
        "Role Relevance",
    ]
