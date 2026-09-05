import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchInterviews } from '../interviewsApi';

const theme = {
  background: '#080e1c',
  surface: '#12192a',
  primary: '#5bf4de',
  text: '#e0e5f9',
  textMuted: '#a5abbd',
};

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20;

const RATING_STYLES = {
  strong: 'text-[#4ae183] bg-[#4ae183]/15 border-[#4ae183]/25',
  ok: 'text-[#f97316] bg-[#f97316]/15 border-[#f97316]/25',
  weak: 'text-[#ef4444] bg-[#ef4444]/15 border-[#ef4444]/25',
};

function scoreColor(score) {
  if (score >= 7.5) return '#4ae183';
  if (score >= 5) return '#f97316';
  return '#ef4444';
}

function formatDate(iso) {
  if (!iso) return 'Unknown date';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds) {
  if (!seconds) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function interviewTypeLabel(value) {
  if (value === 'technical') return 'Technical';
  if (value === 'hr') return 'HR';
  return 'Mixed';
}

function ScoreRing({ score }) {
  const clamped = Math.max(0, Math.min(10, Number(score) || 0));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = (clamped / 10) * circumference;
  const color = scoreColor(clamped);

  return (
    <div className="relative w-[132px] h-[132px] shrink-0">
      <svg viewBox="0 0 132 132" className="w-full h-full -rotate-90">
        <circle cx="66" cy="66" r={radius} stroke="rgba(0,0,0,0.4)" strokeWidth="10" fill="none" />
        <circle
          cx="66"
          cy="66"
          r={radius}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black" style={{ color }}>
          {clamped.toFixed(1)}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#a5abbd]">out of 10</span>
      </div>
    </div>
  );
}

function Card({ title, icon, children }) {
  return (
    <div className="p-6 rounded-[16px] border border-[#424858]/20" style={{ backgroundColor: theme.surface }}>
      <h3 className="flex items-center gap-2 font-bold text-sm mb-4 uppercase tracking-wider text-[#a5abbd]">
        {icon && <span className="material-symbols-outlined text-base text-[#5bf4de]">{icon}</span>}
        {title}
      </h3>
      {children}
    </div>
  );
}

function AnalyzingState({ attempt, onBack }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6">
      <div className="w-14 h-14 rounded-full border-2 border-[#5bf4de]/30 border-t-[#5bf4de] animate-spin mb-6" />
      <h2 className="text-xl font-black mb-2">Analyzing your interview…</h2>
      <p className="text-sm text-[#a5abbd] max-w-[420px] leading-relaxed">
        Your answers are being reviewed. This usually takes about 10 to 30 seconds after the interview ends.
      </p>
      {attempt > 8 && (
        <p className="text-xs text-[#a5abbd]/70 mt-4 max-w-[420px]">
          Still working. Sessions with fewer than two answers are not scored.
        </p>
      )}
      <button
        onClick={onBack}
        className="mt-8 px-5 py-2 border border-[#424858]/50 rounded-lg text-[10px] font-black uppercase tracking-widest text-[#a5abbd] hover:text-white transition-colors"
      >
        Back to Dashboard
      </button>
    </div>
  );
}

function EmptyState({ message, onBack }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6">
      <span className="material-symbols-outlined text-5xl text-[#424858] mb-4">assignment</span>
      <h2 className="text-xl font-black mb-2">No interview feedback yet</h2>
      <p className="text-sm text-[#a5abbd] max-w-[440px] leading-relaxed">{message}</p>
      <button
        onClick={onBack}
        className="mt-8 px-5 py-2 bg-[#5bf4de] text-[#080e1c] rounded-lg text-[10px] font-black uppercase tracking-widest"
      >
        Back to Dashboard
      </button>
    </div>
  );
}

function FeedbackReport({ session }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const feedback = session.feedback || {};
  const categories = Array.isArray(feedback.categories) ? feedback.categories : [];
  const strengths = Array.isArray(feedback.strengths) ? feedback.strengths : [];
  const improvements = Array.isArray(feedback.improvements) ? feedback.improvements : [];
  const questions = Array.isArray(feedback.questionFeedback) ? feedback.questionFeedback : [];
  const nextSteps = Array.isArray(feedback.nextSteps) ? feedback.nextSteps : [];
  const transcript = Array.isArray(session.transcript) ? session.transcript : [];
  const duration = formatDuration(session.durationSeconds);
  const interviewLabel = interviewTypeLabel(session.interviewType);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-[16px] border border-[#424858]/20" style={{ backgroundColor: theme.surface }}>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ScoreRing score={feedback.overallScore} />
          <div className="flex-1 text-center sm:text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#a5abbd] mb-1">
              {interviewLabel} · {session.role || 'Interview'} · {formatDate(session.endedAt)}
              {duration ? ` · ${duration}` : ''}
            </p>
            <h2 className="text-xl font-black mb-3">Interview Feedback</h2>
            <p className="text-sm text-[#e0e5f9]/90 leading-relaxed">{feedback.summary}</p>
            {feedback.isMockFallback && (
              <p className="mt-3 text-[11px] text-[#f97316]">
                Detailed AI analysis was unavailable for this session, so scores are estimated.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categories.length > 0 && (
          <Card title="Skill Breakdown" icon="bar_chart">
            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category.name}>
                  <div className="flex justify-between text-[10px] mb-1 font-bold uppercase">
                    <span className="text-[#a5abbd]">{category.name}</span>
                    <span className="text-white">{category.score}/10</span>
                  </div>
                  <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(Number(category.score) || 0) * 10}%`,
                        backgroundColor: scoreColor(Number(category.score) || 0),
                      }}
                    />
                  </div>
                  {category.note && <p className="text-[11px] text-[#a5abbd] mt-1.5">{category.note}</p>}
                </div>
              ))}
            </div>
          </Card>
        )}

        {strengths.length > 0 && (
          <Card title="What You Did Well" icon="check_circle">
            <ul className="space-y-3">
              {strengths.map((item, index) => (
                <li key={index} className="flex items-start gap-2.5 text-sm text-[#e0e5f9]">
                  <span className="material-symbols-outlined text-[#4ae183] text-base mt-0.5">check</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {improvements.length > 0 && (
        <Card title="What To Improve" icon="trending_up">
          <div className="space-y-4">
            {improvements.map((item, index) => (
              <div key={index} className="bg-black/30 border-l-2 border-[#f97316] p-4 rounded-r-lg">
                <p className="text-sm font-bold text-[#e0e5f9] mb-1.5">{item.issue}</p>
                <p className="text-sm text-[#a5abbd] leading-relaxed">{item.fix}</p>
                {item.example && (
                  <p className="mt-2.5 text-[13px] italic text-[#5bf4de]/80 leading-relaxed">"{item.example}"</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {questions.length > 0 && (
        <Card title="Answer By Answer" icon="forum">
          <div className="space-y-4">
            {questions.map((item, index) => (
              <div key={index} className="p-4 bg-black/20 rounded-lg border border-[#424858]/20">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm font-bold text-[#e0e5f9] leading-snug">{item.question}</p>
                  <span
                    className={`shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      RATING_STYLES[item.rating] || RATING_STYLES.ok
                    }`}
                  >
                    {item.rating}
                  </span>
                </div>
                <p className="text-[13px] text-[#a5abbd] leading-relaxed">{item.answerSummary}</p>
                {item.betterAnswer && (
                  <p className="mt-2 text-[13px] text-[#5bf4de]/80 leading-relaxed">
                    <span className="font-bold uppercase text-[9px] tracking-widest mr-1.5">Stronger</span>
                    {item.betterAnswer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {nextSteps.length > 0 && (
        <Card title="Practise Next" icon="flag">
          <ol className="space-y-2.5">
            {nextSteps.map((item, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-[#e0e5f9]">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#5bf4de]/15 text-[#5bf4de] text-[10px] font-black flex items-center justify-center mt-0.5">
                  {index + 1}
                </span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {transcript.length > 0 && (
        <div className="rounded-[16px] border border-[#424858]/20 overflow-hidden" style={{ backgroundColor: theme.surface }}>
          <button
            onClick={() => setShowTranscript((prev) => !prev)}
            className="w-full flex items-center justify-between p-6 text-left"
          >
            <h3 className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider text-[#a5abbd]">
              <span className="material-symbols-outlined text-base text-[#5bf4de]">description</span>
              Full Transcript ({transcript.length} turns)
            </h3>
            <span
              className={`material-symbols-outlined text-[#5bf4de] transition-transform ${
                showTranscript ? 'rotate-180' : ''
              }`}
            >
              expand_more
            </span>
          </button>
          {showTranscript && (
            <div className="px-6 pb-6 space-y-3 max-h-[420px] overflow-y-auto custom-scroll">
              {transcript.map((turn, index) => (
                <div key={index} className="text-sm leading-relaxed">
                  <span
                    className={`font-black text-[10px] uppercase tracking-widest mr-2 ${
                      turn.role === 'assistant' ? 'text-[#5bf4de]' : 'text-[#a5abbd]'
                    }`}
                  >
                    {turn.role === 'assistant' ? 'Interviewer' : 'You'}
                  </span>
                  <span className="text-[#e0e5f9]/90">{turn.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const InterviewFeedback = ({ roomName, onBack, onLogout }) => {
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  // Only wait for a fresh report when we just came out of an interview.
  const [isWaitingForFresh, setIsWaitingForFresh] = useState(Boolean(roomName));
  const [freshMissing, setFreshMissing] = useState(false);
  const [freshEstimated, setFreshEstimated] = useState(false);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    const interviews = await fetchInterviews({ full: true });
    setSessions(interviews);
    return interviews;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const finish = (interviews, freshId) => {
      setSelectedId((current) => freshId ?? current ?? interviews[0]?.id ?? null);
      setIsWaitingForFresh(false);
      setIsLoading(false);
    };

    const poll = async (currentAttempt) => {
      try {
        const interviews = await load();
        if (cancelled) return;

        const fresh = roomName ? interviews.find((item) => item.room === roomName) : null;
        // The agent saves an estimate as soon as the call ends, then replaces it with
        // the graded report, so keep waiting until the graded one lands.
        if (!roomName || (fresh && !fresh.feedback?.isMockFallback)) {
          finish(interviews, fresh?.id);
          return;
        }

        if (currentAttempt >= MAX_POLL_ATTEMPTS) {
          setFreshMissing(!fresh);
          setFreshEstimated(Boolean(fresh));
          finish(interviews, fresh?.id);
          return;
        }

        setAttempt(currentAttempt + 1);
        timerRef.current = setTimeout(() => poll(currentAttempt + 1), POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load interview feedback:', err);
        setError(err.message || String(err));
        setIsWaitingForFresh(false);
        setIsLoading(false);
      }
    };

    poll(0);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [load, roomName]);

  const selected = sessions.find((item) => item.id === selectedId) || sessions[0] || null;

  return (
    <div
      className="min-h-screen max-h-screen overflow-y-auto custom-scroll text-[#e0e5f9] font-inter"
      style={{ backgroundColor: theme.background }}
    >
      <header
        className="sticky top-0 z-40 border-b border-[#424858]/20 px-6 h-16 flex items-center justify-between"
        style={{ backgroundColor: theme.background }}
      >
        <div className="flex items-center gap-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#5bf4de] text-xs font-bold uppercase tracking-wider hover:underline"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Dashboard
          </button>
          <div className="h-6 w-[1px] bg-[#424858]/30 hidden md:block" />
          <h1 className="text-sm font-bold hidden md:block">Interview Feedback</h1>
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-[#a5abbd] hover:text-white hover:bg-[#1c2a41] border border-[#424858]/40 transition-colors"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Log out
          </button>
        )}
      </header>

      <main className="p-6 max-w-[1200px] mx-auto">
        {error ? (
          <EmptyState
            message={`Could not load your feedback: ${error}`}
            onBack={onBack}
          />
        ) : isWaitingForFresh ? (
          <AnalyzingState attempt={attempt} onBack={onBack} />
        ) : isLoading ? (
          <div className="py-24 text-center text-sm text-[#a5abbd]">Loading your feedback…</div>
        ) : !selected ? (
          <EmptyState
            message={
              roomName
                ? 'That session was too short to score, or the analysis is still running. Try a longer interview with at least two answers.'
                : 'Complete an avatar interview and your feedback report will appear here.'
            }
            onBack={onBack}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
            <div className="space-y-6">
              {freshMissing && (
                <div className="p-4 rounded-xl border border-[#f97316]/30 bg-[#f97316]/10 text-sm text-[#f97316] leading-relaxed">
                  No report was produced for the session you just finished. Scoring needs at least two answers,
                  so your previous feedback is shown below.
                </div>
              )}
              {freshEstimated && (
                <div className="p-4 rounded-xl border border-[#f97316]/30 bg-[#f97316]/10 text-sm text-[#f97316] leading-relaxed">
                  Detailed scoring for this session did not finish in time, so the estimated report below is
                  based on your transcript. Reload in a moment to see if the full report arrived.
                </div>
              )}
              <FeedbackReport session={selected} />
            </div>

            <aside className="space-y-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-[#a5abbd] px-1">Past Sessions</h3>
              {sessions.map((session) => {
                const isActive = session.id === selected.id;
                const score = Number(session.feedback?.overallScore) || 0;
                const interviewLabel = interviewTypeLabel(session.interviewType);
                return (
                  <button
                    key={session.id}
                    onClick={() => setSelectedId(session.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isActive
                        ? 'border-[#5bf4de]/50 bg-[#5bf4de]/5'
                        : 'border-[#424858]/20 hover:border-[#5bf4de]/30'
                    }`}
                    style={{ backgroundColor: isActive ? undefined : theme.surface }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold truncate pr-2">{session.role || 'Interview'}</span>
                      <span className="text-sm font-black shrink-0" style={{ color: scoreColor(score) }}>
                        {score.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-[#a5abbd]">
                      {interviewLabel} · {formatDate(session.endedAt)}
                    </p>
                  </button>
                );
              })}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

export default InterviewFeedback;
