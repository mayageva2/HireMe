import fs from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../.env') })

const DB_PATH = resolve(__dirname, '../dev_cv_db.json')
// Written by the local agent when INTERVIEW_FEEDBACK_SINK=file (DynamoDB in production).
const INTERVIEWS_DB_PATH = resolve(__dirname, '../dev_interviews_db.json')

function getMockTechQuestions(skills = [], role = "Software Engineer", difficulty = "Beginner") {
  const pool = {
    react: {
      Beginner: [
        { id: "mock-react-j1", question: "What is the difference between props and state in React?", answer: "Props are read-only properties passed from parent components to child components to configure them. State is local state managed inside the component itself using hooks (e.g., useState) and can change over time based on user interaction or lifecycle events.", category: "React" },
        { id: "mock-react-j2", question: "What is a React Hook and why do we use them?", answer: "React Hooks are functions that let functional components use state and lifecycle features (e.g., useState, useEffect). They allow logic reuse, make code cleaner, and avoid class component complexities.", category: "React" }
      ],
      Intermediate: [
        { id: "mock-react-m1", question: "What is the difference between React.memo and useMemo?", answer: "React.memo is a higher-order component that memoizes the rendered output of a component to prevent re-renders unless props change. useMemo is a React Hook that memoizes the return value of an expensive calculation function inside a component to avoid recalculating it on every render unless dependencies change.", category: "React" }
      ],
      Advanced: [
        { id: "mock-react-s1", question: "How does React's Reconciliation algorithm work under the hood?", answer: "React uses a virtual DOM to optimize updates. When a component's state changes, a new virtual DOM tree is generated. React diffs this tree with the previous one using a heuristic O(n) algorithm. It assumes that elements of different types generate different trees, and keys are used to uniquely identify elements across renders to prevent unnecessary re-mounting.", category: "React" }
      ],
      Expert: [
        { id: "mock-react-l1", question: "How would you design a migration strategy to move a large, legacy React application to React Server Components (RSC)?", answer: "A successful migration requires a phased approach: 1. Audit components to categorize them into Client vs Server. 2. Establish a server routing layout (e.g., using Next.js App Router). 3. Migrate leaves of the tree first or top-down shell layout. 4. Use 'use client' directives at state/interaction boundary leaves. 5. Measure performance (FCP, LCP) and bundle sizes to validate benefits.", category: "React / RSC" }
      ]
    },
    python: {
      Beginner: [
        { id: "mock-python-j1", question: "What is the difference between lists and tuples in Python?", answer: "Lists are mutable, meaning their elements can be modified after creation, and are defined with brackets []. Tuples are immutable, meaning they cannot be modified after creation, and are defined with parentheses (). Tuples are generally faster and safer for fixed datasets.", category: "Python" }
      ],
      Intermediate: [
        { id: "mock-python-m1", question: "Explain Python decorators and write a simple execution-time logger decorator.", answer: "Decorators are functions that modify the behavior of other functions. They take a function as an argument, wrap it, and return a new function.\nExample:\n```python\nimport time\ndef time_logger(func):\n    def wrapper(*args, **kwargs):\n        start = time.time()\n        result = func(*args, **kwargs)\n        print(f'{func.__name__} took {time.time() - start}s')\n        return result\n    return wrapper\n```", category: "Python" }
      ],
      Advanced: [
        { id: "mock-python-s1", question: "How does Python's Global Interpreter Lock (GIL) affect multi-threaded programs and how do you bypass it?", answer: "The GIL is a mutex that protects access to Python objects, preventing multiple threads from executing Python bytecodes at once. This makes multi-threaded CPU-bound programs single-threaded. To bypass it, you can use: 1. The `multiprocessing` module (runs separate processes). 2. Alternative implementations like Jython or PyPy (some configurations). 3. C-extensions or libraries like NumPy that release the GIL during heavy computations. 4. Asyncio for I/O-bound tasks.", category: "Python" }
      ],
      Expert: [
        { id: "mock-python-l1", question: "How would you design a distributed, fault-tolerant background task processing architecture in Python?", answer: "Use Celery as the task runner, Redis or RabbitMQ as the message broker, and PostgreSQL/DynamoDB for task result storage. Ensure fault tolerance by: 1. Enabling task acknowledgements (`task_acks_late`). 2. Setting dead-letter queues (DLQ) in the broker. 3. Designing tasks to be idempotent. 4. Monitoring with Flower and Prometheus.", category: "Python / Systems" }
      ]
    },
    java: {
      Beginner: [
        { id: "mock-java-j1", question: "What is the difference between an Interface and an Abstract Class in Java?", answer: "An interface defines a contract with abstract methods (and default methods in Java 8+), allowing multiple inheritance. An abstract class is a class that cannot be instantiated but can contain state (instance variables) and constructors, and classes can only extend one abstract class.", category: "Java" }
      ],
      Intermediate: [
        { id: "mock-java-m1", question: "Explain Java's Garbage Collection process and the difference between minor and major GC.", answer: "JVM heap is split into Young (Eden, Survivor) and Old generations. Minor GC runs on the Young generation to quickly collect short-lived objects. Major GC (or Full GC) cleans the Old generation when it fills up, which is much slower and usually pauses application execution threads (Stop-The-World).", category: "Java" }
      ],
      Advanced: [
        { id: "mock-java-s1", question: "Describe the Java Memory Model and how the 'volatile' keyword ensures thread safety.", answer: "The Java Memory Model (JMM) specifies how threads interact through memory. The `volatile` keyword ensures that updates to a variable are immediately written to main memory and read from main memory, preventing local thread caches from holding stale values. It also prevents instruction reordering around the variable.", category: "Java" }
      ],
      Expert: [
        { id: "mock-java-l1", question: "Design a high-throughput, low-latency API service using Spring Boot.", answer: "1. Use Spring WebFlux (reactive non-blocking I/O) if applicable, or optimize MVC with virtual threads (Java 21). 2. Implement connection pooling (HikariCP) and tune database parameters. 3. Implement Redis caching for read-heavy operations. 4. Add rate limiting (Bucket4j) and Circuit Breaker (Resilience4j). 5. Tune JVM GC parameters (e.g., use G1GC or ZGC for low pauses).", category: "Java / Systems" }
      ]
    },
    general: {
      Beginner: [
        { id: "mock-gen-j1", question: "What is the difference between a primary key and a foreign key in a relational database?", answer: "A primary key uniquely identifies each record in a table and cannot be NULL. A foreign key is a column or group of columns in one table that refers to the primary key in another table, establishing a link and maintaining referential integrity between the tables.", category: "Databases" },
        { id: "mock-gen-j2", question: "What is Git and how does `git merge` differ from `git rebase`?", answer: "`git merge` takes all the changes in one branch and merges them into another in a single merge commit, preserving historical commit order and chronology. `git rebase` reapplies your commits on top of another branch, rewriting commit history to create a clean, linear sequence of commits.", category: "Dev Tools" }
      ],
      Intermediate: [
        { id: "mock-gen-m1", question: "What is the difference between SQL and NoSQL databases, and how do you choose?", answer: "SQL databases are relational, table-based, have a predefined schema, and scale vertically (e.g., PostgreSQL, MySQL). They are ideal for complex queries and transactional consistency (ACID). NoSQL databases are non-relational, document- or key-value-based, have dynamic schemas, and scale horizontally (e.g., MongoDB, DynamoDB). They are ideal for unstructured data, high write throughput, and rapid development.", category: "Databases" },
        { id: "mock-gen-m2", question: "What is the purpose of writing unit tests, and how do they differ from integration tests?", answer: "Unit tests verify that a single unit of code (like a function or class) works correctly in isolation, using mocks/stubs for external dependencies. Integration tests verify that different modules or external services (like a database or API) work correctly together. Unit tests are fast and run frequently, while integration tests are slower but provide higher confidence.", category: "Testing" }
      ],
      Advanced: [
        { id: "mock-gen-s1", question: "Explain how database indexing (B-Tree indexes) works and how it affects write vs. read performance.", answer: "A B-Tree index organizes data in a balanced tree structure, enabling binary-like search speeds (O(log N)) for queries. It speeds up SELECT queries significantly. However, it slows down INSERT, UPDATE, and DELETE operations because the database must update the index structures and balance the B-Tree on every modification, in addition to writing the raw data.", category: "Databases" },
        { id: "mock-gen-s2", question: "What is architectural observability, and what are the three pillars of observability?", answer: "Observability is the ability to measure a system's internal state based on its external outputs. The three pillars are:\n1. Logs: Detailed, timestamped records of events (best for debugging root causes).\n2. Metrics: Numeric values measured over intervals (best for alerting and monitoring system health, e.g., CPU, error rates).\n3. Traces: End-to-end paths of requests through distributed services (best for latency bottleneck analysis).", category: "DevOps" }
      ],
      Expert: [
        { id: "mock-gen-l1", question: "How would you design a globally distributed cache system with low latency and eventual consistency?", answer: "1. Use a CDN for static asset caching. 2. Implement Redis clusters in multiple geographic regions. 3. Use write-through or write-around cache invalidation strategies based on read/write patterns. 4. Implement pub/sub or event queue replication (e.g., Kafka) to propagate cache invalidation events globally. 5. Manage synchronization trade-offs (e.g. read-your-writes consistency via session binding, or eventual consistency with short TTLs).", category: "System Design" },
        { id: "mock-gen-l2", question: "How do you manage technical debt in a rapidly growing software engineering team?", answer: "1. Establish clear coding standards and automated linting/CI pipelines. 2. Track technical debt items transparently in the backlog. 3. Allocate a fixed percentage of development capacity (e.g. 15-20%) to maintenance, refactoring, and tooling. 4. Conduct architectural reviews for critical systems. 5. Encourage refactoring as part of feature development ('Boy Scout Rule').", category: "Engineering Leadership" }
      ]
    }
  };

  const matches = [];
  const normalizedSkills = skills.map(s => s.toLowerCase());
  
  if (normalizedSkills.some(s => s.includes('react') || s.includes('javascript') || s.includes('js') || s.includes('node'))) {
    matches.push('react');
  }
  if (normalizedSkills.some(s => s.includes('python') || s.includes('django') || s.includes('flask'))) {
    matches.push('python');
  }
  if (normalizedSkills.some(s => s.includes('java') || s.includes('spring'))) {
    matches.push('java');
  }

  const selectedQuestions = [];
  matches.forEach(m => {
    const list = pool[m]?.[difficulty] || [];
    selectedQuestions.push(...list);
  });

  const generalList = pool.general[difficulty] || [];
  let genIndex = 0;
  while (selectedQuestions.length < 5 && genIndex < generalList.length) {
    selectedQuestions.push(generalList[genIndex]);
    genIndex++;
  }

  if (selectedQuestions.length < 5) {
    const allGen = [...pool.general.Beginner, ...pool.general.Intermediate, ...pool.general.Advanced, ...pool.general.Expert];
    for (const q of allGen) {
      if (selectedQuestions.length >= 5) break;
      if (!selectedQuestions.some(sq => sq.id === q.id)) {
        selectedQuestions.push(q);
      }
    }
  }

  return selectedQuestions.slice(0, 5);
}

async function generateTechQuestionsWithOpenAI(cvData, role, difficulty) {
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini'

  if (!apiKey) {
    console.warn('[dev-cv-service] OPENAI_API_KEY is not set. Using local mock generator for tech questions.');
    return null;
  }

  console.log(`[dev-cv-service] Generating tech questions with OpenAI. Model: ${model}, Role: ${role}, Difficulty: ${difficulty}`);

  const systemPrompt = `You are an expert technical interviewer for the role: "${role}" at the "${difficulty}" expertise level.
Generate exactly 5 distinct, high-quality technical questions tailored specifically to the candidate's CV and skills.

Candidate CV:
${JSON.stringify(cvData, null, 2)}

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

Do not include any markdown formatting, backticks (e.g. \`\`\`json), prefix, or suffix. Output only raw JSON.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate 5 technical questions for difficulty: ${difficulty}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty content');
    }

    let cleanContent = content.trim();
    if (cleanContent.startsWith('```')) {
      const firstNewline = cleanContent.indexOf('\n');
      if (firstNewline !== -1) {
        cleanContent = cleanContent.substring(firstNewline + 1);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.substring(0, cleanContent.length - 3);
      }
      cleanContent = cleanContent.trim();
    }

    const parsed = JSON.parse(cleanContent);
    if (!Array.isArray(parsed.questions)) {
      throw new Error('OpenAI response does not contain a questions array');
    }

    return parsed.questions;
  } catch (err) {
    console.error("[dev-cv-service] OpenAI tech question generation failed, using mock questions:", err);
    return null;
  }
}

const getMockPolishedText = (text) => {
  if (!text || text.trim().length === 0) return "Developed and optimized scalable web applications.";
  const trimmed = text.trim();
  let mock = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  if (!mock.endsWith('.')) mock += '.';
  if (!mock.toLowerCase().includes('led') && !mock.toLowerCase().includes('engineered') && !mock.toLowerCase().includes('implemented') && !mock.toLowerCase().includes('optimized')) {
    mock = "Engineered and optimized: " + mock;
  }
  return mock + " (AI Polish Fallback)";
};

const getMockImportFallback = (text) => {
  return {
    personalInfo: {
      fullName: "Maya Geva",
      email: "maya@example.com",
      phone: "050-1234567",
      linkedin: "linkedin.com/in/mayageva",
      github: "github.com/mayageva",
      summary: "Software engineering student with hands-on experience in full-stack web development."
    },
    skills: ["React", "Node.js", "Python", "C++", "AWS"],
    experience: [
      {
        company: "Amdocs",
        role: "Software Developer Intern",
        startDate: "2025-06",
        endDate: "Present",
        description: "Implemented high-performance Node.js APIs and enhanced React UI responsiveness. Collaborated on cloud deployment setups."
      }
    ],
    education: [
      {
        institution: "MTA College",
        degree: "B.Sc. Computer Science",
        startYear: "2023",
        endYear: "2026",
        description: "Focus on Algorithms, Full-Stack Web Development, and AI components."
      }
    ],
    projects: [
      {
        title: "HireMe Platform",
        description: "Designed an AI mock interview application using React and OpenAI integrations.",
        technologies: ["React", "Vite", "Node.js", "OpenAI"]
      }
    ],
    languages: [
      { language: "Hebrew", level: "Native" },
      { language: "English", level: "Fluent" }
    ],
    customSections: []
  };
};

async function analyzeCvWithOpenAI(cvData) {
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini'

  console.log(`[dev-cv-service] Initiating CV analysis. Model: ${model}`);

  // Dynamic fallback generator
  const getMockAnalysisFallback = (data) => {
    const fullName = data?.personalInfo?.fullName || "Candidate";
    const skillsCount = data?.skills?.length || 0;
    const experienceCount = data?.experience?.length || 0;
    const projectsCount = data?.projects?.length || 0;

    const strengths = [];
    const suggestions = [];
    let score = 70;

    if (data?.personalInfo?.summary) {
      strengths.push("Professional summary provides a concise overview of your background.");
    } else {
      strengths.push("Contact information is clearly structured.");
    }

    if (skillsCount > 0) {
      strengths.push(`Lists relevant core technologies (including ${data.skills.slice(0, 2).join(', ')}).`);
    }

    if (projectsCount > 0) {
      strengths.push("Showcases personal projects demonstrating hands-on experience.");
    }

    if (experienceCount === 0) {
      score -= 10;
      suggestions.push({
        category: "experience",
        issue: "No work experience section listed.",
        focus: "Add any past internships, freelance work, or junior roles to demonstrate practical background."
      });
    } else {
      score += 5;
      suggestions.push({
        category: "experience",
        issue: "Experience descriptions could be more impact-oriented.",
        fix: "Quantify your achievements with action verbs (e.g. 'Reduced loading time by 20%' or 'Managed 3 client releases')."
      });
    }

    if (skillsCount < 3) {
      score -= 5;
      suggestions.push({
        category: "skills",
        issue: "Skills list is quite sparse.",
        fix: "Expand your skills list to cover full-stack libraries, cloud platforms, and developer tools you have used."
      });
    } else {
      score += 5;
    }

    if (projectsCount === 0) {
      score -= 10;
      suggestions.push({
        category: "projects",
        issue: "No project examples listed to validate your skills.",
        fix: "Add 1-2 major academic or personal projects. List the technologies used in each project."
      });
    } else {
      score += 5;
      suggestions.push({
        category: "projects",
        issue: "Technologies are not specified per project.",
        fix: "Ensure you clearly tag or describe the technologies (e.g. React, Node.js) used in each project description."
      });
    }

    if (!data?.personalInfo?.linkedin && !data?.personalInfo?.github) {
      score -= 5;
      suggestions.push({
        category: "personal",
        issue: "Missing professional links (LinkedIn or GitHub).",
        fix: "Add your LinkedIn URL and GitHub profile to make it easier for recruiters to review your work."
      });
    }

    score = Math.max(50, Math.min(95, score));

    return {
      score,
      strengths,
      suggestions,
      analyzedAt: new Date().toISOString(),
      isMockFallback: true
    };
  };

  if (!apiKey) {
    console.warn('[dev-cv-service] OPENAI_API_KEY is not set. Using local mock analysis fallback.');
    return getMockAnalysisFallback(cvData);
  }

  const systemPrompt = `You are an expert technical recruiter and CV reviewer. Your job is to analyze the candidate's structured CV JSON and provide constructive feedback in a strict JSON format.

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

Do not output any markdown formatting, backticks, prefix, or suffix. Output only the raw JSON.`;

  const userPrompt = `Here is the structured CV JSON to analyze:\n${JSON.stringify(cvData, null, 2)}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI Fallback Triggered. Original Error Status:", response.status, "Body:", errorText);
      console.warn(`[dev-cv-service] OpenAI returned error ${response.status}: ${errorText}. Falling back to local mock analysis.`);
      return getMockAnalysisFallback(cvData);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response');
    }

    const parsed = JSON.parse(content);
    const score = typeof parsed.score === 'number' ? parsed.score : 70;
    const strengths = Array.isArray(parsed.strengths) ? parsed.strengths : [];
    const rawSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];

    const validCategories = ['personal', 'education', 'experience', 'skills', 'projects'];
    const suggestions = rawSuggestions.map(s => {
      let category = (s.category || '').toLowerCase().trim();
      if (!validCategories.includes(category)) {
        category = 'experience';
      }
      return {
        category,
        issue: s.issue || 'Improvement needed',
        fix: s.fix || 'Update details'
      };
    });

    return {
      score,
      strengths,
      suggestions,
      analyzedAt: new Date().toISOString(),
      isMockFallback: false
    };
  } catch (err) {
    console.error("OpenAI Fallback Triggered. Original Error:", err);
    console.warn(`[dev-cv-service] Exception occurred during OpenAI analysis: ${err.message}. Falling back to local mock analysis.`);
    return getMockAnalysisFallback(cvData);
  }
}

// Helper to extract the Cognito username (local-part of email) from Cognito ID or Access token payload
function extractUsername(req) {
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.replace(/^Bearer\s+/, '').trim()
  if (!token) return 'local-user'
  try {
    const parts = token.split('.')
    if (parts.length === 3) {
      const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8')
      const payload = JSON.parse(payloadJson)
      
      // ID Token check
      const email = payload.email || ''
      if (email && email.includes('@')) {
        return email.split('@')[0]
      }
      // Access Token check
      return payload.username || payload['cognito:username'] || payload.sub || 'local-user'
    }
  } catch (err) {
    console.error('Failed to parse dev auth token:', err)
  }
  return 'local-user'
}

function loadDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}), 'utf8')
  }
  try {
    const content = fs.readFileSync(DB_PATH, 'utf8')
    return JSON.parse(content || '{}')
  } catch (err) {
    console.error('Failed to read local dev CV DB:', err)
    return {}
  }
}

function loadInterviews(username, includeTranscript) {
  if (!fs.existsSync(INTERVIEWS_DB_PATH)) return []
  let db = {}
  try {
    db = JSON.parse(fs.readFileSync(INTERVIEWS_DB_PATH, 'utf8') || '{}')
  } catch (err) {
    console.error('Failed to read local dev interviews DB:', err)
    return []
  }

  const sessions = Array.isArray(db[username]) ? db[username] : []
  return sessions
    .slice()
    .reverse()
    .slice(0, 20)
    .map((session) => ({
      id: session.sortKey,
      room: session.room,
      role: session.role,
      candidateName: session.candidateName,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      durationSeconds: session.durationSeconds,
      turnCount: session.turnCount,
      feedback: session.feedback,
      ...(includeTranscript ? { transcript: session.transcript } : {}),
    }))
}

function saveDatabase(db) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8')
  } catch (err) {
    console.error('Failed to save local dev CV DB:', err)
  }
}

function readJsonBody(req) {
  return new Promise((resolveBody, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => {
      try {
        resolveBody(data ? JSON.parse(data) : {})
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

export function devCvServicePlugin() {
  return {
    name: 'dev-cv-service',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Only handle requests targeting /api/cv
        if (!req.url?.startsWith('/api/cv')) {
          next()
          return
        }

        const username = extractUsername(req)
        const isAnalyze = req.url.startsWith('/api/cv/analyze')
        const isPolish = req.url.startsWith('/api/cv/polish')
        const isImport = req.url.startsWith('/api/cv/import')
        const isInterviews = req.url.startsWith('/api/cv/interviews')
        const isTechQuestions = req.url.includes('/tech-questions')
        const isHrQuestionsProgress = req.url.includes('/hr-questions')
 
        try {
          if (isHrQuestionsProgress) {
            if (req.method === 'GET' && req.url.includes('/progress')) {
              const db = loadDatabase()
              const userData = db[username] || {}
              const progress = userData.hrProgress || { history: {}, performanceScore: 0 }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(progress))
              return
            }

            if (req.method === 'POST' && req.url.includes('/submit')) {
              const body = await readJsonBody(req)
              const { questionId, status } = body
              const db = loadDatabase()
              if (!db[username]) {
                db[username] = { cv: null, analysis: null }
              }
              if (!db[username].hrProgress) {
                db[username].hrProgress = { history: {}, performanceScore: 0 }
              }
              db[username].hrProgress.history = db[username].hrProgress.history || {}
              db[username].hrProgress.history[questionId] = {
                status,
                updatedAt: new Date().toISOString()
              }

              const historyVals = Object.values(db[username].hrProgress.history)
              const correctCount = historyVals.filter(h => h.status === 'correct').length
              const totalCount = historyVals.length
              db[username].hrProgress.performanceScore = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

              saveDatabase(db)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, progress: db[username].hrProgress }))
              return
            }
          }

          if (isTechQuestions) {
            if (req.method === 'GET' && req.url.includes('/progress')) {
              const db = loadDatabase()
              const userData = db[username] || {}
              const progress = userData.techProgress || { history: {}, activeDifficulty: 'Beginner', performanceScore: 0 }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(progress))
              return
            }

            if (req.method === 'POST' && req.url.includes('/submit')) {
              const body = await readJsonBody(req)
              const { questionId, status, difficulty } = body
              const db = loadDatabase()
              if (!db[username]) {
                db[username] = { cv: null, analysis: null }
              }
              if (!db[username].techProgress) {
                db[username].techProgress = { history: {}, activeDifficulty: 'Beginner', performanceScore: 0 }
              }
              db[username].techProgress.history = db[username].techProgress.history || {}
              db[username].techProgress.history[questionId] = {
                status,
                difficulty: difficulty || db[username].techProgress.activeDifficulty || 'Beginner',
                updatedAt: new Date().toISOString()
              }

              const historyVals = Object.values(db[username].techProgress.history)
              const correctCount = historyVals.filter(h => h.status === 'correct').length
              const totalCount = historyVals.length
              db[username].techProgress.performanceScore = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

              saveDatabase(db)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, progress: db[username].techProgress }))
              return
            }

            if (req.method === 'POST' && req.url.includes('/generate')) {
              const body = await readJsonBody(req)
              const difficulty = body.difficulty || 'Beginner'
              const db = loadDatabase()
              if (!db[username]) {
                db[username] = { cv: null, analysis: null }
              }
              const cvData = db[username].cv || {}
              const skills = cvData.skills || []
              const role = cvData.personalInfo?.summary?.split('.')[0] || cvData.personalInfo?.fullName || 'Software Engineer'

              let questions;
              if (Object.keys(cvData).length === 0) {
                console.warn('[dev-cv-service] User CV is missing. Falling back to default role-agnostic questions.');
                questions = getMockTechQuestions([], 'Software Engineer', difficulty);
              } else {
                questions = await generateTechQuestionsWithOpenAI(cvData, role, difficulty);
                if (!questions) {
                  questions = getMockTechQuestions(skills, role, difficulty);
                }
              }

              db[username].techQuestions = db[username].techQuestions || {}
              db[username].techQuestions[difficulty] = questions

              if (!db[username].techProgress) {
                db[username].techProgress = { history: {}, activeDifficulty: 'Beginner', performanceScore: 0 }
              }
              db[username].techProgress.activeDifficulty = difficulty

              saveDatabase(db)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, questions }))
              return
            }

            if (req.method === 'GET') {
              const parsedUrl = new URL(req.url, 'http://localhost')
              const difficulty = parsedUrl.searchParams.get('difficulty') || 'Beginner'
              const db = loadDatabase()
              const userData = db[username] || {}
              const questions = userData.techQuestions?.[difficulty] || []
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(questions))
              return
            }
          }

          if (req.method === 'GET' && isInterviews) {
            const includeTranscript = /[?&]full=1/.test(req.url)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ interviews: loadInterviews(username, includeTranscript) }))
            return
          }

          if (req.method === 'GET') {
            const db = loadDatabase()
            const userData = db[username] || { cv: null, analysis: null }
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(userData))
            return
          }

          if (req.method === 'POST' && isImport) {
            const body = await readJsonBody(req)
            const cvText = body.text || ''
            
            const apiKey = process.env.OPENAI_API_KEY
            const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini'
            
            console.log(`[dev-cv-service] Parsing CV text with OpenAI. Model: ${model}`);
            
            let parsedCv = null;
            
            if (!apiKey) {
              console.warn('[dev-cv-service] OPENAI_API_KEY is not set for parsing. Using local mock fallback.');
              parsedCv = getMockImportFallback(cvText);
            } else {
              try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                  },
                  body: JSON.stringify({
                    model,
                    messages: [
                      {
                        role: 'system',
                        content: `You are an AI assistant that parses unstructured resume text and converts it into our exact CV JSON schema.
You must output a JSON object conforming exactly to this structure:
{
  "personalInfo": {
    "fullName": "Candidate's full name",
    "email": "Candidate's email",
    "phone": "Candidate's phone number",
    "linkedin": "LinkedIn URL",
    "github": "GitHub URL",
    "summary": "Professional profile summary"
  },
  "skills": ["Skill 1", "Skill 2", ...],
  "experience": [
    {
      "company": "Company Name",
      "role": "Role / Title",
      "startDate": "Start Date",
      "endDate": "End Date or Present",
      "description": "Details about responsibilities and achievements"
    },
    ...
  ],
  "education": [
    {
      "institution": "School / University Name",
      "degree": "Degree / Focus",
      "startYear": "Start Year",
      "endYear": "End Year",
      "description": "Details about relevant coursework or achievements"
    },
    ...
  ],
  "projects": [
    {
      "title": "Project Title",
      "description": "Project details",
      "technologies": ["Tech 1", "Tech 2", ...]
    },
    ...
  ]
}

Ensure all fields map correctly from the unstructured text. If some information is not present, use an empty string or empty array.
Do not output any markdown formatting, backticks, prefix, or suffix. Output only the raw JSON.`
                      },
                      {
                        role: 'user',
                        content: cvText
                      }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.2
                  })
                });

                if (!response.ok) {
                  const errorText = await response.text();
                  console.error("OpenAI Parse Fallback Triggered. Original Error Status:", response.status, "Body:", errorText);
                  console.warn(`[dev-cv-service] OpenAI returned error ${response.status}: ${errorText}. Falling back to mock import.`);
                  parsedCv = getMockImportFallback(cvText);
                } else {
                  const data = await response.json();
                  const content = data.choices?.[0]?.message?.content?.trim();
                  if (!content) {
                    throw new Error('OpenAI returned an empty response');
                  }
                  parsedCv = JSON.parse(content);
                }
              } catch (err) {
                console.error("OpenAI Parse Fallback Triggered. Original Error:", err);
                console.warn(`[dev-cv-service] Exception during OpenAI parsing: ${err.message}. Falling back to mock import.`);
                parsedCv = getMockImportFallback(cvText);
              }
            }
            
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ cv: parsedCv }));
            return;
          }

          if (req.method === 'POST' && isPolish) {
            const body = await readJsonBody(req)
            const textToPolish = body.text || ''
            
            const apiKey = process.env.OPENAI_API_KEY
            const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini'
            
            console.log(`[dev-cv-service] Polishing text. Model: ${model}`);
            
            let polishedText = '';
            
            if (!apiKey) {
              console.warn('[dev-cv-service] OPENAI_API_KEY is not set for polishing. Using local mock fallback.');
              polishedText = getMockPolishedText(textToPolish);
            } else {
              try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                  },
                  body: JSON.stringify({
                    model,
                    messages: [
                      {
                        role: 'system',
                        content: 'You are an expert resume writer. Rewrite the following bullet point or description to be highly professional, impactful, action-oriented, and tailored for a modern tech resume. Keep it concise, similar in length, and preserve the original meaning. Return ONLY the polished text with no extra conversational commentary.'
                      },
                      {
                        role: 'user',
                        content: textToPolish
                      }
                    ],
                    temperature: 0.3
                  })
                });

                if (!response.ok) {
                  const errorText = await response.text();
                  console.error("OpenAI Polish Fallback Triggered. Original Error Status:", response.status, "Body:", errorText);
                  console.warn(`[dev-cv-service] OpenAI returned error ${response.status}: ${errorText}. Falling back to mock polish.`);
                  polishedText = getMockPolishedText(textToPolish);
                } else {
                  const data = await response.json();
                  const content = data.choices?.[0]?.message?.content?.trim();
                  if (!content) {
                    throw new Error('OpenAI returned an empty response');
                  }
                  polishedText = content;
                }
              } catch (err) {
                console.error("OpenAI Polish Fallback Triggered. Original Error:", err);
                console.warn(`[dev-cv-service] Exception during OpenAI polish: ${err.message}. Falling back to mock polish.`);
                polishedText = getMockPolishedText(textToPolish);
              }
            }
            
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ polished: polishedText }));
            return;
          }
 
          if (req.method === 'POST') {
            const body = await readJsonBody(req)
            const db = loadDatabase()

            if (!db[username]) {
              db[username] = { cv: null, analysis: null }
            }

            // Save CV Data
            db[username].cv = body

            let analysisResult = db[username].analysis

            if (isAnalyze) {
              analysisResult = await analyzeCvWithOpenAI(body)
              db[username].analysis = analysisResult
            }

            saveDatabase(db)

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ 
              success: true, 
              cv: db[username].cv,
              analysis: analysisResult 
            }))
            return
          }

          // Unhandled method
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method Not Allowed' }))

        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message || String(err) }))
        }
      })
    }
  }
}
