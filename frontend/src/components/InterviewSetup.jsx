import React, { useState } from 'react';

const MAX_JD_CHARS = 6000;

const InterviewSetup = ({ defaultRole, isStarting, onBack, onStart }) => {
  const [mode, setMode] = useState('generic');
  const [jobDescription, setJobDescription] = useState('');

  const trimmed = jobDescription.trim();
  const jdTooLong = trimmed.length > MAX_JD_CHARS;
  const canStart = !isStarting && (mode === 'generic' || (trimmed.length > 20 && !jdTooLong));

  const handleStart = () => {
    if (!canStart) return;
    onStart({
      jobDescription: mode === 'job' ? trimmed.slice(0, MAX_JD_CHARS) : '',
    });
  };

  return (
    <div className="min-h-screen bg-[#080e1c] text-[#e0e5f9] font-inter px-6 py-10">
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
          Generic uses your target role ({defaultRole || 'your profession'}). Job description
          mode asks technical questions from the posting you paste.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setMode('generic')}
            className={`text-left p-4 rounded-xl border transition-all ${
              mode === 'generic'
                ? 'border-[#5bf4de]/60 bg-[#5bf4de]/10'
                : 'border-[#424858]/30 bg-[#12192a] hover:border-[#5bf4de]/30'
            }`}
          >
            <p className="text-xs font-black uppercase tracking-widest text-[#5bf4de] mb-1">Generic</p>
            <p className="text-sm text-[#a5abbd] leading-relaxed">
              Standard interview for your saved target role.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setMode('job')}
            className={`text-left p-4 rounded-xl border transition-all ${
              mode === 'job'
                ? 'border-[#5bf4de]/60 bg-[#5bf4de]/10'
                : 'border-[#424858]/30 bg-[#12192a] hover:border-[#5bf4de]/30'
            }`}
          >
            <p className="text-xs font-black uppercase tracking-widest text-[#5bf4de] mb-1">
              Job description
            </p>
            <p className="text-sm text-[#a5abbd] leading-relaxed">
              Paste a posting. Technical questions follow that JD.
            </p>
          </button>
        </div>

        {mode === 'job' && (
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
