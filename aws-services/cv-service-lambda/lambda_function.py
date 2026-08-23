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
