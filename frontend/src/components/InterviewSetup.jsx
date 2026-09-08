import React, { useState } from 'react';

const MAX_JD_CHARS = 6000;

const InterviewSetup = ({ defaultRole, isStarting, onBack, onStart }) => {
  const [interviewType, setInterviewType] = useState('hr');
  const [technicalSource, setTechnicalSource] = useState('auto');
  const [jobDescription, setJobDescription] = useState('');

  const trimmed = jobDescription.trim();
  const jdTooLong = trimmed.length > MAX_JD_CHARS;
  const needsJobDescription = interviewType === 'technical' && technicalSource === 'job';
  const canStart = !isStarting && (!needsJobDescription || (trimmed.length > 20 && !jdTooLong));

  const handleStart = () => {
    if (!canStart) return;
    onStart({
      interviewType,
      jobDescription: needsJobDescription ? trimmed.slice(0, MAX_JD_CHARS) : '',
    });
  };

  return (
    // html/body have overflow:hidden, so this page scrolls itself.
    <div className="min-h-screen max-h-screen overflow-y-auto custom-scroll bg-[#080e1c] text-[#e0e5f9] font-inter px-6 py-10">
      <div className="max-w-[640px] mx-auto">
        <button
          type="button"
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-[#5bf4de] text-xs font-bold uppercase tracking-wider hover:underline"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Dashboard
        </button>

        <h1 className="text-2xl font-black mb-2">Start interview</h1>
        <p className="text-sm text-[#a5abbd] mb-8">
          Choose a focused HR or technical interview. Each session asks at least five questions
          and provides a score when you finish.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setInterviewType('hr')}
            className={`text-left p-4 rounded-xl border transition-all ${
              interviewType === 'hr'
                ? 'border-[#5bf4de]/60 bg-[#5bf4de]/10'
                : 'border-[#424858]/30 bg-[#12192a] hover:border-[#5bf4de]/30'
            }`}
          >
            <p className="text-xs font-black uppercase tracking-widest text-[#5bf4de] mb-1">HR interview</p>
            <p className="text-sm text-[#a5abbd] leading-relaxed">
              Behavioral questions selected from the HR question pool.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setInterviewType('technical')}
            className={`text-left p-4 rounded-xl border transition-all ${
              interviewType === 'technical'
                ? 'border-[#5bf4de]/60 bg-[#5bf4de]/10'
                : 'border-[#424858]/30 bg-[#12192a] hover:border-[#5bf4de]/30'
            }`}
          >
            <p className="text-xs font-black uppercase tracking-widest text-[#5bf4de] mb-1">
              Technical interview
            </p>
            <p className="text-sm text-[#a5abbd] leading-relaxed">
              Questions generated for {defaultRole || 'your saved target role'}.
            </p>
          </button>
        </div>

        {interviewType === 'technical' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setTechnicalSource('auto')}
              className={`text-left p-4 rounded-xl border transition-all ${
                technicalSource === 'auto'
                  ? 'border-[#5bf4de]/60 bg-[#5bf4de]/10'
                  : 'border-[#424858]/30 bg-[#12192a] hover:border-[#5bf4de]/30'
              }`}
            >
              <p className="text-xs font-black uppercase tracking-widest mb-1">Auto generate</p>
              <p className="text-sm text-[#a5abbd]">Use your saved target role.</p>
            </button>
            <button
              type="button"
              onClick={() => setTechnicalSource('job')}
              className={`text-left p-4 rounded-xl border transition-all ${
                technicalSource === 'job'
                  ? 'border-[#5bf4de]/60 bg-[#5bf4de]/10'
                  : 'border-[#424858]/30 bg-[#12192a] hover:border-[#5bf4de]/30'
              }`}
            >
              <p className="text-xs font-black uppercase tracking-widest mb-1">Job description</p>
              <p className="text-sm text-[#a5abbd]">Tailor questions to a specific posting.</p>
            </button>
          </div>
        )}

        {needsJobDescription && (
          <div className="mb-6">
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#a5abbd] mb-2">
              Paste job requirements
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={12}
              placeholder="Paste the job description or requirements here…"
              className="w-full px-4 py-3 rounded-xl bg-[#12192a] border border-[#424858]/40 text-sm text-white outline-none focus:border-[#5bf4de]/50 resize-y min-h-[180px]"
            />
            <p className={`mt-2 text-[11px] ${jdTooLong ? 'text-[#f97316]' : 'text-[#a5abbd]'}`}>
              {trimmed.length} / {MAX_JD_CHARS} characters
              {trimmed.length > 0 && trimmed.length <= 20 ? ' — paste a bit more so the avatar has enough to work with.' : ''}
            </p>
          </div>
        )}

        <button
          type="button"
          disabled={!canStart}
          onClick={handleStart}
          className="w-full py-3 rounded-xl bg-[#5bf4de] text-[#080e1c] text-sm font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isStarting ? 'Starting…' : 'Continue to interview'}
        </button>
      </div>
    </div>
  );
};

export default InterviewSetup;
