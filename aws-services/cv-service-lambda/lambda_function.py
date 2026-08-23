import base64
import json
import os
import urllib.request
import boto3
import jwt
from boto3.dynamodb.conditions import Key
from decimal import Decimal

# CORS headers required for API Gateway / Lambda Function URL response
CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
}

class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            if o % 1 == 0:
                return int(o)
            return float(o)
        return super(DecimalEncoder, self).default(o)

COGNITO_JWKS = None

def analyze_cv_with_openai(cv_data: dict) -> dict:
    """Send structured CV data to OpenAI for review using built-in urllib."""
    import datetime
    
    # Dynamic fallback generator for Lambda
    def get_mock_analysis_fallback(data: dict) -> dict:
        skills = data.get("skills") or []
        experience = data.get("experience") or []
        projects = data.get("projects") or []
        personal_info = data.get("personalInfo") or {}
        
        strengths = []
        suggestions = []
        score = 70
        
        if personal_info.get("summary"):
            strengths.append("Professional summary provides a concise overview of your background.")
        else:
            strengths.append("Contact information is clearly structured.")
            
        if skills:
            strengths.append(f"Lists relevant core technologies (including {', '.join(skills[:2])}).")
            
        if projects:
            strengths.append("Showcases personal projects demonstrating hands-on experience.")
            
        if not experience:
            score -= 10
            suggestions.append({
                "category": "experience",
                "issue": "No work experience section listed.",
                "fix": "Add any past internships, freelance work, or junior roles to demonstrate practical background."
            })
        else:
            score += 5
            suggestions.append({
                "category": "experience",
                "issue": "Experience descriptions could be more impact-oriented.",
                "fix": "Quantify your achievements with action verbs (e.g. 'Reduced loading time by 20%' or 'Managed 3 client releases')."
            })
            
        if len(skills) < 3:
            score -= 5
            suggestions.append({
                "category": "skills",
                "issue": "Skills list is quite sparse.",
                "fix": "Expand your skills list to cover full-stack libraries, cloud platforms, and developer tools you have used."
            })
        else:
            score += 5
            
        if not projects:
            score -= 10
            suggestions.append({
                "category": "projects",
                "issue": "No project examples listed to validate your skills.",
                "fix": "Add 1-2 major academic or personal projects. List the technologies used in each project."
            })
        else:
            score += 5
            suggestions.append({
                "category": "projects",
                "issue": "Technologies are not specified per project.",
                "fix": "Ensure you clearly tag or describe the technologies (e.g. React, Node.js) used in each project description."
            })
            
        if not personal_info.get("linkedin") and not personal_info.get("github"):
            score -= 5
            suggestions.append({
                "category": "personal",
                "issue": "Missing professional links (LinkedIn or GitHub).",
                "fix": "Add your LinkedIn URL and GitHub profile to make it easier for recruiters to review your work."
            })
            
        score = max(50, min(95, score))
        
        return {
            "score": score,
            "strengths": strengths,
            "suggestions": suggestions,
            "analyzedAt": datetime.datetime.utcnow().isoformat() + "Z",
            "isMockFallback": True
        }

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("[cv-service-lambda] Warning: OPENAI_API_KEY is not set. Using local mock analysis fallback.")
        return get_mock_analysis_fallback(cv_data)

    model = os.environ.get("OPENAI_MODEL", "gpt-4.1-mini")
    print(f"[cv-service-lambda] Sending CV to OpenAI. Model: {model}")

    system_prompt = """You are an expert technical recruiter and CV reviewer. Your job is to analyze the candidate's structured CV JSON and provide constructive feedback in a strict JSON format.

Evaluate the CV on the following criteria:
1. Impact-oriented wording: Use of strong action verbs and quantifiable metrics/results.
2. Formatting & structural gaps: Missing fields, vague descriptions, poor organization.
3. Strength of skills vs. projects: Are their projects demonstrating the skills they claimed to have?

You must output a JSON object with exactly the following keys:
1. "score": An integer between 0 and 100 representing the overall strength of the CV.
2. "strengths": A list of strings (maximum 4) detailing what the candidate did well.
3. "suggestions": A list of objects. Each object must represent an actionable improvement suggestion and contain:
   - "category": Must be exactly one of: "personal", "education", "experience", "skills", "projects".
   - "issue": A concise description of the problem in that section.
   - "fix": A specific, actionable recommendation to fix the issue.

Do not output any markdown formatting, backticks, prefix, or suffix. Output only the raw JSON."""

    user_prompt = f"Here is the structured CV JSON to analyze:\n{json.dumps(cv_data, indent=2)}"

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2
    }

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            res_body = response.read().decode("utf-8")
            data = json.loads(res_body)

        content = data.get("choices", [{}])[0].get("message", {}).get("content")
        if not content:
            raise ValueError("OpenAI returned an empty response")

        parsed = json.loads(content)
        
        # Normalize categories
        valid_categories = ["personal", "education", "experience", "skills", "projects"]
        raw_suggestions = parsed.get("suggestions") or []
        suggestions = []
        
        for s in raw_suggestions:
            category = str(s.get("category") or "").lower().strip()
            if category not in valid_categories:
                category = "experience"
            suggestions.append({
                "category": category,
                "issue": s.get("issue") or "Improvement needed",
                "fix": s.get("fix") or "Update details"
            })
            
        return {
            "score": int(parsed.get("score") or 70),
            "strengths": parsed.get("strengths") or [],
            "suggestions": suggestions,
            "analyzedAt": datetime.datetime.utcnow().isoformat() + "Z",
            "isMockFallback": False
        }
    except Exception as e:
        print(f"[cv-service-lambda] Warning: OpenAI API request failed: {e}. Falling back to local mock analysis.")
        return get_mock_analysis_fallback(cv_data)

def polish_text_with_openai(text: str) -> str:
    """Rewrite text using OpenAI to be more professional."""
    def get_mock_polished_fallback(t: str) -> str:
        if not t or not t.strip():
            return "Developed and optimized scalable web applications."
        trimmed = t.strip()
        mock = trimmed[0].upper() + trimmed[1:]
        if not mock.endswith('.'):
            mock += '.'
        lower_mock = mock.lower()
        if not any(k in lower_mock for k in ["led", "engineered", "implemented", "optimized"]):
            mock = "Engineered and optimized: " + mock
        return mock + " (AI Polish Fallback)"

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("[cv-service-lambda] Warning: OPENAI_API_KEY is not set for polishing. Using local mock fallback.")
        return get_mock_polished_fallback(text)

    model = os.environ.get("OPENAI_MODEL", "gpt-4.1-mini")
    print(f"[cv-service-lambda] Polishing text with OpenAI. Model: {model}")

    try:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert resume writer. Rewrite the following bullet point or description to be highly professional, impactful, action-oriented, and tailored for a modern tech resume. Keep it concise, similar in length, and preserve the original meaning. Return ONLY the polished text with no extra conversational commentary."
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            "temperature": 0.3
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = json.loads(response.read().decode("utf-8"))
            content = res_body["choices"][0]["message"]["content"].strip()
            return content

    except Exception as exc:
        print(f"[cv-service-lambda] OpenAI Polish Fallback Triggered. Original Error: {exc}")
        return get_mock_polished_fallback(text)

def parse_cv_text_with_openai(text: str) -> dict:
    """Parse CV text into structured JSON using OpenAI."""
    def get_mock_import_fallback() -> dict:
        return {
            "personalInfo": {
                "fullName": "Maya Geva",
                "email": "maya@example.com",
                "phone": "050-1234567",
                "linkedin": "linkedin.com/in/mayageva",
                "github": "github.com/mayageva",
                "summary": "Software engineering student with hands-on experience in full-stack web development."
            },
            "skills": ["React", "Node.js", "Python", "C++", "AWS"],
            "experience": [
                {
                    "company": "Amdocs",
                    "role": "Software Developer Intern",
                    "startDate": "2025-06",
                    "endDate": "Present",
                    "description": "Implemented high-performance Node.js APIs and enhanced React UI responsiveness. Collaborated on cloud deployment setups."
                }
            ],
            "education": [
                {
                    "institution": "MTA College",
                    "degree": "B.Sc. Computer Science",
                    "startYear": "2023",
                    "endYear": "2026",
                    "description": "Focus on Algorithms, Full-Stack Web Development, and AI components."
                }
            ],
            "projects": [
                {
                    "title": "HireMe Platform",
                    "description": "Designed an AI mock interview application using React and OpenAI integrations.",
                    "technologies": ["React", "Vite", "Node.js", "OpenAI"]
                }
            ],
            "languages": [
                { "language": "Hebrew", "level": "Native" },
                { "language": "English", "level": "Fluent" }
              ],
            "customSections": []
        }

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("[cv-service-lambda] Warning: OPENAI_API_KEY is not set for parsing. Using local mock fallback.")
        return get_mock_import_fallback()

    model = os.environ.get("OPENAI_MODEL", "gpt-4.1-mini")
    print(f"[cv-service-lambda] Parsing CV text with OpenAI. Model: {model}")

    try:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        system_prompt = (
            "You are an AI assistant that parses unstructured resume text and converts it into our exact CV JSON schema. "
            "You must output a JSON object conforming exactly to this structure: "
            "{\n"
            "  \"personalInfo\": {\n"
            "    \"fullName\": \"Candidate's full name\",\n"
            "    \"email\": \"Candidate's email\",\n"
            "    \"phone\": \"Candidate's phone number\",\n"
            "    \"linkedin\": \"LinkedIn URL\",\n"
            "    \"github\": \"GitHub URL\",\n"
            "    \"summary\": \"Professional profile summary\"\n"
            "  },\n"
            "  \"skills\": [\"Skill 1\", \"Skill 2\", ...],\n"
            "  \"experience\": [\n"
            "    {\n"
            "      \"company\": \"Company Name\",\n"
            "      \"role\": \"Role / Title\",\n"
            "      \"startDate\": \"Start Date\",\n"
            "      \"endDate\": \"End Date or Present\",\n"
            "      \"description\": \"Details about responsibilities and achievements\"\n"
            "    },\n"
            "    ...\n"
            "  ],\n"
            "  \"education\": [\n"
            "    {\n"
            "      \"institution\": \"School / University Name\",\n"
            "      \"degree\": \"Degree / Focus\",\n"
            "      \"startYear\": \"Start Year\",\n"
            "      \"endYear\": \"End Year\",\n"
            "      \"description\": \"Details about relevant coursework or achievements\"\n"
            "    },\n"
            "    ...\n"
            "  ],\n"
            "  \"projects\": [\n"
            "    {\n"
            "      \"title\": \"Project Title\",\n"
            "      \"description\": \"Project details\",\n"
            "      \"technologies\": [\"Tech 1\", \"Tech 2\", ...]\n"
            "    },\n"
            "    ...\n"
            "  ]\n"
            "}\n"
            "Ensure all fields map correctly from the unstructured text. If some information is not present, use an empty string or empty array. "
            "Do not output any markdown formatting, backticks, prefix, or suffix. Output only the raw JSON."
        )

        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            "response_format": { "type": "json_object" },
            "temperature": 0.2
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        
        with urllib.request.urlopen(req, timeout=12) as response:
            res_body = json.loads(response.read().decode("utf-8"))
            content = res_body["choices"][0]["message"]["content"].strip()
            return json.loads(content)

    except Exception as exc:
        print(f"[cv-service-lambda] OpenAI Parse Fallback Triggered. Original Error: {exc}")
        return get_mock_import_fallback()

def get_mock_tech_questions(skills: list, role: str, difficulty: str) -> list:
    pool = {
        "react": {
            "Beginner": [
                { "id": "mock-react-j1", "question": "What is the difference between props and state in React?", "answer": "Props are read-only properties passed from parent components to child components to configure them. State is local state managed inside the component itself using hooks (e.g., useState) and can change over time based on user interaction or lifecycle events.", "category": "React" },
                { "id": "mock-react-j2", "question": "What is a React Hook and why do we use them?", "answer": "React Hooks are functions that let functional components use state and lifecycle features (e.g., useState, useEffect). They allow logic reuse, make code cleaner, and avoid class component complexities.", "category": "React" }
            ],
            "Intermediate": [
                { "id": "mock-react-m1", "question": "What is the difference between React.memo and useMemo?", "answer": "React.memo is a higher-order component that memoizes the rendered output of a component to prevent re-renders unless props change. useMemo is a React Hook that memoizes the return value of an expensive calculation function inside a component to avoid recalculating it on every render unless dependencies change.", "category": "React" }
            ],
            "Advanced": [
                { "id": "mock-react-s1", "question": "How does React's Reconciliation algorithm work under the hood?", "answer": "React uses a virtual DOM to optimize updates. When a component's state changes, a new virtual DOM tree is generated. React diffs this tree with the previous one using a heuristic O(n) algorithm. It assumes that elements of different types generate different trees, and keys are used to uniquely identify elements across renders to prevent unnecessary re-mounting.", "category": "React" }
            ],
            "Expert": [
                { "id": "mock-react-l1", "question": "How would you design a migration strategy to move a large, legacy React application to React Server Components (RSC)?", "answer": "A successful migration requires a phased approach: 1. Audit components to categorize them into Client vs Server. 2. Establish a server routing layout (e.g., using Next.js App Router). 3. Migrate leaves of the tree first or top-down shell layout. 4. Use 'use client' directives at state/interaction boundary leaves. 5. Measure performance (FCP, LCP) and bundle sizes to validate benefits.", "category": "React / RSC" }
            ]
        },
        "python": {
            "Beginner": [
                { "id": "mock-python-j1", "question": "What is the difference between lists and tuples in Python?", "answer": "Lists are mutable, meaning their elements can be modified after creation, and are defined with brackets []. Tuples are immutable, meaning they cannot be modified after creation, and are defined with parentheses (). Tuples are generally faster and safer for fixed datasets.", "category": "Python" }
            ],
            "Intermediate": [
                { "id": "mock-python-m1", "question": "Explain Python decorators and write a simple execution-time logger decorator.", "answer": "Decorators are functions that modify the behavior of other functions. They take a function as an argument, wrap it, and return a new function.\nExample:\n```python\nimport time\ndef time_logger(func):\n    def wrapper(*args, **kwargs):\n        start = time.time()\n        result = func(*args, **kwargs)\n        print(f'{func.__name__} took {time.time() - start}s')\n        return result\n    return wrapper\n```", "category": "Python" }
            ],
            "Advanced": [
                { "id": "mock-python-s1", "question": "How does Python's Global Interpreter Lock (GIL) affect multi-threaded programs and how do you bypass it?", "answer": "The GIL is a mutex that protects access to Python objects, preventing multiple threads from executing Python bytecodes at once. This makes multi-threaded CPU-bound programs single-threaded. To bypass it, you can use: 1. The `multiprocessing` module (runs separate processes). 2. Alternative implementations like Jython or PyPy (some configurations). 3. C-extensions or libraries like NumPy that release the GIL during heavy computations. 4. Asyncio for I/O-bound tasks.", "category": "Python" }
            ],
            "Expert": [
                { "id": "mock-python-l1", "question": "How would you design a distributed, fault-tolerant background task processing architecture in Python?", "answer": "Use Celery as the task runner, Redis or RabbitMQ as the message broker, and PostgreSQL/DynamoDB for task result storage. Ensure fault tolerance by: 1. Enabling task acknowledgements (`task_acks_late`). 2. Setting dead-letter queues (DLQ) in the broker. 3. Designing tasks to be idempotent. 4. Monitoring with Flower and Prometheus.", "category": "Python / Systems" }
            ]
        },
        "java": {
            "Beginner": [
                { "id": "mock-java-j1", "question": "What is the difference between an Interface and an Abstract Class in Java?", "answer": "An interface defines a contract with abstract methods (and default methods in Java 8+), allowing multiple inheritance. An abstract class is a class that cannot be instantiated but can contain state (instance variables) and constructors, and classes can only extend one abstract class.", "category": "Java" }
            ],
            "Intermediate": [
                { "id": "mock-java-m1", "question": "Explain Java's Garbage Collection process and the difference between minor and major GC.", "answer": "JVM heap is split into Young (Eden, Survivor) and Old generations. Minor GC runs on the Young generation to quickly collect short-lived objects. Major GC (or Full GC) cleans the Old generation when it fills up, which is much slower and usually pauses application execution threads (Stop-The-World).", "category": "Java" }
            ],
            "Advanced": [
                { "id": "mock-java-s1", "question": "Describe the Java Memory Model and how the 'volatile' keyword ensures thread safety.", "answer": "The Java Memory Model (JMM) specifies how threads interact through memory. The `volatile` keyword ensures that updates to a variable are immediately written to main memory and read from main memory, preventing local thread caches from holding stale values. It also prevents instruction reordering around the variable.", "category": "Java" }
            ],
            "Expert": [
                { "id": "mock-java-l1", "question": "Design a high-throughput, low-latency API service using Spring Boot.", "answer": "1. Use Spring WebFlux (reactive non-blocking I/O) if applicable, or optimize MVC with virtual threads (Java 21). 2. Implement connection pooling (HikariCP) and tune database parameters. 3. Implement Redis caching for read-heavy operations. 4. Add rate limiting (Bucket4j) and Circuit Breaker (Resilience4j). 5. Tune JVM GC parameters (e.g., use G1GC or ZGC for low pauses).", "category": "Java / Systems" }
            ]
        },
        "general": {
            "Beginner": [
                { "id": "mock-gen-j1", "question": "What is the difference between a primary key and a foreign key in a relational database?", "answer": "A primary key uniquely identifies each record in a table and cannot be NULL. A foreign key is a column or group of columns in one table that refers to the primary key in another table, establishing a link and maintaining referential integrity between the tables.", "category": "Databases" },
                { "id": "mock-gen-j2", "question": "What is Git and how does `git merge` differ from `git rebase`?", "answer": "`git merge` takes all the changes in one branch and merges them into another in a single merge commit, preserving historical commit order and chronology. `git rebase` reapplies your commits on top of another branch, rewriting commit history to create a clean, linear sequence of commits.", "category": "Dev Tools" }
            ],
            "Intermediate": [
                { "id": "mock-gen-m1", "question": "What is the difference between SQL and NoSQL databases, and how do you choose?", "answer": "SQL databases are relational, table-based, have a predefined schema, and scale vertically (e.g., PostgreSQL, MySQL). They are ideal for complex queries and transactional consistency (ACID). NoSQL databases are non-relational, document- or key-value-based, have dynamic schemas, and scale horizontally (e.g., MongoDB, DynamoDB). They are ideal for unstructured data, high write throughput, and rapid development.", "category": "Databases" },
                { "id": "mock-gen-m2", "question": "What is the purpose of writing unit tests, and how do they differ from integration tests?", "answer": "Unit tests verify that a single unit of code (like a function or class) works correctly in isolation, using mocks/stubs for external dependencies. Integration tests verify that different modules or external services (like a database or API) work correctly together. Unit tests are fast and run frequently, while integration tests are slower but provide higher confidence.", "category": "Testing" }
            ],
            "Advanced": [
                { "id": "mock-gen-s1", "question": "Explain how database indexing (B-Tree indexes) works and how it affects write vs. read performance.", "answer": "A B-Tree index organizes data in a balanced tree structure, enabling binary-like search speeds (O(log N)) for queries. It speeds up SELECT queries significantly. However, it slows down INSERT, UPDATE, and DELETE operations because the database must update the index structures and balance the B-Tree on every modification, in addition to writing the raw data.", "category": "Databases" },
                { "id": "mock-gen-s2", "question": "What is architectural observability, and what are the three pillars of observability?", "answer": "Observability is the ability to measure a system's internal state based on its external outputs. The three pillars are:\n1. Logs: Detailed, timestamped records of events (best for debugging root causes).\n2. Metrics: Numeric values measured over intervals (best for alerting and monitoring system health, e.g., CPU, error rates).\n3. Traces: End-to-end paths of requests through distributed services (best for latency bottleneck analysis).", "category": "DevOps" }
            ],
            "Expert": [
                { "id": "mock-gen-l1", "question": "How would you design a globally distributed cache system with low latency and eventual consistency?", "answer": "1. Use a CDN for static asset caching. 2. Implement Redis clusters in multiple geographic regions. 3. Use write-through or write-around cache invalidation strategies based on read/write patterns. 4. Implement pub/sub or event queue replication (e.g., Kafka) to propagate cache invalidation events globally. 5. Manage synchronization trade-offs (e.g. read-your-writes consistency via session binding, or eventual consistency with short TTLs).", "category": "System Design" },
                { "id": "mock-gen-l2", "question": "How do you manage technical debt in a rapidly growing software engineering team?", "answer": "1. Establish clear coding standards and automated linting/CI pipelines. 2. Track technical debt items transparently in the backlog. 3. Allocate a fixed percentage of development capacity (e.g. 15-20%) to maintenance, refactoring, and tooling. 4. Conduct architectural reviews for critical systems. 5. Encourage refactoring as part of feature development ('Boy Scout Rule').", "category": "Engineering Leadership" }
            ]
        }
    }

    matches = []
    normalized_skills = [s.lower() for s in skills]

    # Check matches
    if any("react" in s or "javascript" in s or "js" in s or "node" in s for s in normalized_skills):
        matches.append("react")
    if any("python" in s or "django" in s or "flask" in s for s in normalized_skills):
        matches.append("python")
    if any("java" in s or "spring" in s for s in normalized_skills):
        matches.append("java")

    selected_questions = []
    for m in matches:
        lst = pool.get(m, {}).get(difficulty, [])
        selected_questions.extend(lst)

    general_list = pool.get("general", {}).get(difficulty, [])
    gen_index = 0
    while len(selected_questions) < 5 and gen_index < len(general_list):
        selected_questions.append(general_list[gen_index])
        gen_index += 1

    if len(selected_questions) < 5:
        all_gen = []
        for diff in ["Beginner", "Intermediate", "Advanced", "Expert"]:
            all_gen.extend(pool.get("general", {}).get(diff, []))
        for q in all_gen:
            if len(selected_questions) >= 5:
                break
            if not any(sq["id"] == q["id"] for sq in selected_questions):
                selected_questions.append(q)

    return selected_questions[:5]

def generate_tech_questions_with_openai(cv_data: dict, role: str, difficulty: str) -> list:
    """Generate personalized technical questions using OpenAI."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("[cv-service-lambda] Warning: OPENAI_API_KEY is not set. Using local mock generator.")
        return None

    model = os.environ.get("OPENAI_MODEL", "gpt-4.1-mini")
    print(f"[cv-service-lambda] Generating technical questions with OpenAI. Model: {model}")

    system_prompt = f"""You are an expert technical interviewer for the role: "{role}" at the "{difficulty}" expertise level.
Generate exactly 5 distinct, high-quality technical questions tailored specifically to the candidate's CV and skills.

Candidate CV:
{json.dumps(cv_data, indent=2)}

Ensure the questions correspond to the requested difficulty tier:
- Beginner: Focus on core concepts, fundamental principles, and basic terminology.
- Intermediate: Focus on practical application, standard processes, tools, and direct problem-solving.
- Advanced: Focus on strategy, design patterns, optimization, and complex scenarios.
- Expert: Focus on leadership, high-level strategy, trade-offs, global design, and scalability.

You must output a JSON object with exactly the key "questions" containing an array of objects. Each object must have:
1. "id": A unique string identifier (UUID or random string).
2. "question": The technical question text.
3. "answer": A comprehensive, high-quality sample/model answer for the candidate to learn from, including key concepts/strategies and code snippets if applicable.
4. "category": A short category/topic name (e.g. "React", "Python Concurrency", "System Design", "SQL").

Do not include any markdown formatting, backticks, prefix, or suffix. Output only raw JSON."""

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Generate 5 technical questions for difficulty: {difficulty}"}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3
    }

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            res_body = response.read().decode("utf-8")
            data = json.loads(res_body)

        content = data.get("choices", [{}])[0].get("message", {}).get("content")
        if not content:
            raise ValueError("OpenAI returned an empty response")

        parsed = json.loads(content)
        return parsed.get("questions") or []
    except Exception as e:
        print(f"[cv-service-lambda] OpenAI tech questions API request failed: {e}")
        return None

def get_cognito_jwks(region, user_pool_id):
    """Fetch and cache Cognito JWKS keys."""
    global COGNITO_JWKS
    if COGNITO_JWKS is not None:
        return COGNITO_JWKS
    url = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json"
    try:
        with urllib.request.urlopen(url) as response:
            COGNITO_JWKS = json.loads(response.read().decode("utf-8"))
        return COGNITO_JWKS
    except Exception as e:
        print(f"Error fetching JWKS from Cognito: {e}")
        raise ValueError(f"Failed to fetch Cognito public keys: {e}")

def validate_cognito_token(token, region, user_pool_id):
    """Decode and validate Cognito JWT using RS256 algorithm and public JWKS."""
    try:
        unverified_header = jwt.get_unverified_header(token)
    except Exception as e:
        raise ValueError(f"Invalid token format: {e}")
        
    kid = unverified_header.get("kid")
    if not kid:
        raise ValueError("Token header missing 'kid'")
        
    jwks = get_cognito_jwks(region, user_pool_id)
    public_key_jwk = None
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            public_key_jwk = key
            break
            
    if not public_key_jwk:
        raise ValueError("Public key not found in JWKS")
        
    try:
        # Build the public key object from JWK parameters
        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(public_key_jwk)
    except Exception as e:
        raise ValueError(f"Failed to load public key: {e}")
        
    issuer = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}"
    try:
        # Decode & Verify token signature, expiration, and issuer
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            issuer=issuer,
            options={"verify_aud": False}  # Support both access token & ID token structures
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError as e:
        raise ValueError(f"Invalid token signature or claims: {e}")

def extract_token(event) -> str:
    """Extract Authorization bearer token from Lambda request headers."""
    headers = event.get("headers") or {}
    auth_header = None
    for k, v in headers.items():
        if k.lower() == "authorization":
            auth_header = v
            break
            
    if not auth_header:
        raise ValueError("Authorization header is missing")
        
    if auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()
    return auth_header.strip()

def get_username_from_payload(payload: dict) -> str:
    """Extract username matching Cognito username conventions used in DynamoDB."""
    email = payload.get("email") or ""
    if email and "@" in email:
        return email.split("@")[0]
    return payload.get("username") or payload.get("cognito:username") or payload.get("sub") or "user"

def lambda_handler(event, context):
    method = (
        event.get("requestContext", {}).get("http", {}).get("method")
        or event.get("httpMethod")
        or "GET"
    )

    # Handle Preflight OPTIONS request
    if method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": ""
        }

    try:
        # 1. Parse configuration parameters
        region = os.environ.get("AWS_REGION", "us-east-1")
        user_pool_id = os.environ.get("COGNITO_USER_POOL_ID", "us-east-1_u56lBJUdL")
        table_name = os.environ.get("DYNAMODB_TABLE", "HireMe_Table")

        # 2. Extract and validate Cognito JWT Token
        token = extract_token(event)
        payload = validate_cognito_token(token, region, user_pool_id)
        username = get_username_from_payload(payload)

        dynamodb = boto3.resource("dynamodb", region_name=region)
        table = dynamodb.Table(table_name)

        path = event.get("rawPath") or event.get("path") or ""
        is_analyze_path = path.endswith("/analyze")
        is_polish_path = path.endswith("/polish")
        is_import_path = path.endswith("/import")
        is_interviews_path = path.endswith("/interviews")
        is_tech_questions = "/tech-questions" in path
        is_hr_questions = "/hr-questions" in path

        # --- HR QUESTIONS PROGRESS ENDPOINTS ---
        if is_hr_questions:
            import datetime
            # 1. GET /progress
            if method == "GET" and path.endswith("/progress"):
                response = table.get_item(
                    Key={
                        "User id": username,
                        "Sort Key": "hr-questions#progress"
                    }
                )
                item = response.get("Item") or {}
                progress = item.get("progress") or {
                    "history": {},
                    "performanceScore": 0
                }
                return {
                    "statusCode": 200,
                    "headers": CORS_HEADERS,
                    "body": json.dumps(progress, cls=DecimalEncoder)
                }

            # 2. POST /submit
            if method == "POST" and path.endswith("/submit"):
                body_str = event.get("body") or ""
                if event.get("isBase64Encoded"):
                    body_str = base64.b64decode(body_str).decode("utf-8")
                body_json = json.loads(body_str) if body_str else {}
                question_id = body_json.get("questionId")
                status = body_json.get("status")

                if not question_id or not status:
                    return {
                        "statusCode": 400,
                        "headers": CORS_HEADERS,
                        "body": json.dumps({"error": "questionId and status are required"})
                    }

                response = table.get_item(
                    Key={
                        "User id": username,
                        "Sort Key": "hr-questions#progress"
                    }
                )
                item = response.get("Item") or {}
                progress = item.get("progress") or {
                    "history": {},
                    "performanceScore": 0
                }

                history = progress.get("history") or {}
                history[question_id] = {
                    "status": status,
                    "updatedAt": datetime.datetime.utcnow().isoformat() + "Z"
                }
                progress["history"] = history

                history_vals = list(history.values())
                correct_count = len([h for h in history_vals if h.get("status") == "correct"])
                total_count = len(history_vals)
                progress["performanceScore"] = int(round((correct_count / total_count) * 100)) if total_count > 0 else 0

                table.put_item(
                    Item={
                        "User id": username,
                        "Sort Key": "hr-questions#progress",
                        "progress": progress
                    }
                )

                return {
                    "statusCode": 200,
                    "headers": CORS_HEADERS,
                    "body": json.dumps({"success": True, "progress": progress}, cls=DecimalEncoder)
                }

        # --- TECHNICAL QUESTIONS ENDPOINTS ---
        if is_tech_questions:
            import datetime
            # 1. GET /progress
            if method == "GET" and path.endswith("/progress"):
                response = table.get_item(
                    Key={
                        "User id": username,
                        "Sort Key": "tech-questions#progress"
                    }
                )
                item = response.get("Item") or {}
                progress = item.get("progress") or {
                    "history": {},
                    "activeDifficulty": "Beginner",
                    "performanceScore": 0
                }
                return {
                    "statusCode": 200,
                    "headers": CORS_HEADERS,
                    "body": json.dumps(progress, cls=DecimalEncoder)
                }

            # 2. POST /submit
            if method == "POST" and path.endswith("/submit"):
                body_str = event.get("body") or ""
                if event.get("isBase64Encoded"):
                    body_str = base64.b64decode(body_str).decode("utf-8")
                body_json = json.loads(body_str) if body_str else {}
                question_id = body_json.get("questionId")
                status = body_json.get("status")

                if not question_id or not status:
                    return {
                        "statusCode": 400,
                        "headers": CORS_HEADERS,
                        "body": json.dumps({"error": "questionId and status are required"})
                    }

                response = table.get_item(
                    Key={
                        "User id": username,
                        "Sort Key": "tech-questions#progress"
                    }
                )
                item = response.get("Item") or {}
                progress = item.get("progress") or {
                    "history": {},
                    "activeDifficulty": "Beginner",
                    "performanceScore": 0
                }

                difficulty = body_json.get("difficulty") or progress.get("activeDifficulty") or "Beginner"
                history = progress.get("history") or {}
                history[question_id] = {
                    "status": status,
                    "difficulty": difficulty,
                    "updatedAt": datetime.datetime.utcnow().isoformat() + "Z"
                }
                progress["history"] = history

                history_vals = list(history.values())
                correct_count = len([h for h in history_vals if h.get("status") == "correct"])
                total_count = len(history_vals)
                progress["performanceScore"] = int(round((correct_count / total_count) * 100)) if total_count > 0 else 0

                table.put_item(
                    Item={
                        "User id": username,
                        "Sort Key": "tech-questions#progress",
                        "progress": progress
                    }
                )

                return {
                    "statusCode": 200,
                    "headers": CORS_HEADERS,
                    "body": json.dumps({"success": True, "progress": progress}, cls=DecimalEncoder)
                }

            # 3. POST /generate
            if method == "POST" and path.endswith("/generate"):
                body_str = event.get("body") or ""
                if event.get("isBase64Encoded"):
                    body_str = base64.b64decode(body_str).decode("utf-8")
                body_json = json.loads(body_str) if body_str else {}
                difficulty = body_json.get("difficulty", "Beginner")

                cv_response = table.get_item(
                    Key={
                        "User id": username,
                        "Sort Key": "cv"
                    }
                )
                cv_item = cv_response.get("Item") or {}
                cv_data = cv_item.get("cv") or {}
                skills = cv_data.get("skills") or []
                personal_info = cv_data.get("personalInfo") or {}
                summary = personal_info.get("summary") or ""
                role = summary.split(".")[0] if summary else personal_info.get("fullName") or "Software Engineer"

                questions = generate_tech_questions_with_openai(cv_data, role, difficulty)
                if not questions:
                    questions = get_mock_tech_questions(skills, role, difficulty)

                table.put_item(
                    Item={
                        "User id": username,
                        "Sort Key": f"tech-questions#{difficulty}",
                        "questions": questions
                    }
                )

                progress_response = table.get_item(
                    Key={
                        "User id": username,
                        "Sort Key": "tech-questions#progress"
                    }
                )
                progress_item = progress_response.get("Item") or {}
                progress = progress_item.get("progress") or {
                    "history": {},
                    "activeDifficulty": "Beginner",
                    "performanceScore": 0
                }
                progress["activeDifficulty"] = difficulty
                table.put_item(
                    Item={
                        "User id": username,
                        "Sort Key": "tech-questions#progress",
                        "progress": progress
                    }
                )

                return {
                    "statusCode": 200,
                    "headers": CORS_HEADERS,
                    "body": json.dumps({"success": True, "questions": questions}, cls=DecimalEncoder)
                }

            # 4. GET / (list questions for a specific difficulty)
            if method == "GET":
                query_params = event.get("queryStringParameters") or {}
                difficulty = query_params.get("difficulty", "Beginner") if query_params else "Beginner"

                response = table.get_item(
                    Key={
                        "User id": username,
                        "Sort Key": f"tech-questions#{difficulty}"
                    }
                )
                item = response.get("Item") or {}
                questions = item.get("questions") or []

                return {
                    "statusCode": 200,
                    "headers": CORS_HEADERS,
                    "body": json.dumps(questions, cls=DecimalEncoder)
                }

        # --- GET /interviews: Interview feedback history written by the agent ---
        if method == "GET" and is_interviews_path:
            query_params = event.get("queryStringParameters") or {}
            include_transcript = str(query_params.get("full") or "") == "1"

            response = table.query(
                KeyConditionExpression=Key("User id").eq(username)
                & Key("Sort Key").begins_with("interview#"),
                ScanIndexForward=False,
                Limit=20,
            )

            interviews = [
                {
                    "id": item.get("Sort Key"),
                    "room": item.get("room"),
                    "role": item.get("role"),
                    "candidateName": item.get("candidateName"),
                    "startedAt": item.get("startedAt"),
                    "endedAt": item.get("endedAt"),
                    "durationSeconds": item.get("durationSeconds"),
                    "turnCount": item.get("turnCount"),
                    "feedback": item.get("feedback"),
                    **({"transcript": item.get("transcript")} if include_transcript else {}),
                }
                for item in response.get("Items") or []
            ]

            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({"interviews": interviews}, cls=DecimalEncoder)
            }
 
        # --- GET: Fetch saved CV and Analysis ---
        if method == "GET":
            response = table.get_item(
                Key={
                    "User id": username,
                    "Sort Key": "cv"
                }
            )
            item = response.get("Item") or {}
            
            # Extract CV and analysis, default to None if not present
            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({
                    "cv": item.get("cv"),
                    "analysis": item.get("analysis")
                }, cls=DecimalEncoder)
            }

        # --- POST: Save and optionally Analyze CV ---
        elif method == "POST":
            # Parse body
            body_str = event.get("body") or ""
            if event.get("isBase64Encoded"):
                body_str = base64.b64decode(body_str).decode("utf-8")
            
            body_json = json.loads(body_str) if body_str else {}
            
            if is_polish_path:
                text_to_polish = body_json.get("text") or ""
                polished_text = polish_text_with_openai(text_to_polish)
                return {
                    "statusCode": 200,
                    "headers": CORS_HEADERS,
                    "body": json.dumps({"polished": polished_text}, cls=DecimalEncoder)
                }

            if is_import_path:
                text_to_parse = body_json.get("text") or ""
                parsed_cv = parse_cv_text_with_openai(text_to_parse)
                return {
                    "statusCode": 200,
                    "headers": CORS_HEADERS,
                    "body": json.dumps({"cv": parsed_cv}, cls=DecimalEncoder)
                }
                
            cv_data = body_json
            if not cv_data:
                return {
                    "statusCode": 400,
                    "headers": CORS_HEADERS,
                    "body": json.dumps({"error": "Empty or invalid CV body data"}, cls=DecimalEncoder)
                }

            # Fetch existing analysis if not doing a new analysis, so we preserve it
            existing_analysis = None
            if not is_analyze_path:
                try:
                    existing_response = table.get_item(
                        Key={
                            "User id": username,
                            "Sort Key": "cv"
                        }
                    )
                    existing_item = existing_response.get("Item") or {}
                    existing_analysis = existing_item.get("analysis")
                except Exception:
                    pass

            # Setup basic structure to save
            db_item = {
                "User id": username,
                "Sort Key": "cv",
                "cv": cv_data,
                "analysis": existing_analysis
            }

            if is_analyze_path:
                db_item["analysis"] = analyze_cv_with_openai(cv_data)

            # Put item in DynamoDB
            table.put_item(Item=db_item)

            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({
                    "success": True,
                    "cv": db_item["cv"],
                    "analysis": db_item["analysis"]
                }, cls=DecimalEncoder)
            }

        else:
            return {
                "statusCode": 405,
                "headers": CORS_HEADERS,
                "body": json.dumps({"error": "Method Not Allowed"}, cls=DecimalEncoder)
            }

    except ValueError as val_err:
        print(f"Validation failure: {val_err}")
        return {
            "statusCode": 401,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": str(val_err)}, cls=DecimalEncoder)
        }
    except Exception as exc:
        print(f"Server error: {exc}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": f"Internal Server Error: {str(exc)}"}, cls=DecimalEncoder)
        }
