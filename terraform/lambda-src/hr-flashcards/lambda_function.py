import json


QUESTIONS = [
    {
        "category": "Introduction",
        "question": "Tell me about yourself.",
        "answer": "Give a concise present-past-future summary: your current focus, the experience most relevant to this role, and why this opportunity is your next step.",
    },
    {
        "category": "Motivation",
        "question": "Why do you want to work here?",
        "answer": "Connect specific details about the organization and role to your skills, values, and career direction. Avoid generic praise.",
    },
    {
        "category": "Strengths",
        "question": "What is your greatest professional strength?",
        "answer": "Choose a strength important to the role and support it with a brief example and measurable result.",
    },
    {
        "category": "Self-awareness",
        "question": "What is an area you are working to improve?",
        "answer": "Name a genuine but manageable weakness, explain the concrete steps you are taking, and show evidence of progress.",
    },
    {
        "category": "Behavioral",
        "question": "Describe a difficult challenge and how you handled it.",
        "answer": "Use STAR: explain the situation, your responsibility, the actions you personally took, and the outcome or lesson.",
    },
    {
        "category": "Teamwork",
        "question": "Tell me about a disagreement with a teammate.",
        "answer": "Focus on listening, facts, respectful communication, and the shared objective. End with the resolution and what you learned.",
    },
    {
        "category": "Failure",
        "question": "Tell me about a time you failed.",
        "answer": "Take ownership without blaming others, describe what changed in your approach, and show how the lesson improved later results.",
    },
    {
        "category": "Closing",
        "question": "Why should we hire you?",
        "answer": "Summarize two or three role-specific strengths, support them with evidence, and state the value you can deliver.",
    },
]


def lambda_handler(event, context):
    method = (
        event.get("requestContext", {}).get("http", {}).get("method")
        or event.get("httpMethod")
        or "GET"
    )

    if method not in {"GET", "OPTIONS"}:
        return {
            "statusCode": 405,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "Method not allowed"}),
        }

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(QUESTIONS),
    }
