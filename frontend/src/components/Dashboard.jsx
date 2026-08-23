import React, { useState, useRef, useEffect, useMemo } from 'react';
import { fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import avatarSimulationPic from '../assets/avatarImage.png'; 
import cvDraftPic from '../assets/fakeCv.png';
import CVPreviewer from './CVPreviewer';
import { fetchInterviews } from '../interviewsApi';

/** Maps interview scores (oldest first) onto the 200x100 viewBox of the trend chart. */
function buildTrendChart(scores) {
  if (!scores.length) return null;

  const width = 200;
  const top = 12;
  const baseline = 85;

  const points = scores.map((score, index) => {
    const x = scores.length === 1 ? width / 2 : (index / (scores.length - 1)) * width;
    const clamped = Math.max(0, Math.min(10, score));
    const y = baseline - (clamped / 10) * (baseline - top);
    return { x, y };
  });

  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${points[points.length - 1].x.toFixed(1)} 100 L${points[0].x.toFixed(1)} 100 Z`;

  return { line, area, points };
}

function formatSessionDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const CVThumbnail = React.memo(({ cvData, onShowCV }) => {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.3);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          setScale(width / 800);
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 bg-white overflow-hidden select-none group-hover:scale-[1.02] transition-transform duration-500"
      style={{ borderRadius: '12px' }}
    >
      <div style={{
        width: '800px',
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        pointerEvents: 'none',
        height: '842px',
        overflow: 'hidden'
      }}>
        <CVPreviewer 
          theme={cvData.theme} 
          accentColor={cvData.accentColor} 
          data={cvData} 
          onChange={null} 
        />
      </div>
      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
        <button 
          onClick={onShowCV} 
          className="flex items-center gap-2 px-4 py-1.5 bg-[#080e1c] border border-[#5bf4de]/30 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all hover:border-[#5bf4de] text-[#e0e5f9]"
        >
          <span className="material-symbols-outlined text-sm text-[#5bf4de]">search</span>
          Preview Draft
        </button>
      </div>
    </div>
  );
});

const Dashboard = ({ onStartInterview, onLogout, onShowHR, onShowTech, onShowCV, onShowFeedback, isStartingInterview }) => {
  const [realUser, setRealUser] = useState({ 
    fullName: 'Loading...', 
    profession: 'Loading...', 
    initials: '??' 
  });
  const [profileImg, setProfileImg] = useState(null);
  const fileInputRef = useRef(null);
  const [cvData, setCvData] = useState(null);
  const [cvAnalysis, setCvAnalysis] = useState(null);
  const [loadingCv, setLoadingCv] = useState(true);
  const [interviews, setInterviews] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const attributes = await fetchUserAttributes();
        const fullName = attributes['name'] || "User";
        const profession = attributes['custom:profession'] || "Software Engineer";
        const nameParts = fullName.split(' ');
        const initials = nameParts.length >= 2 
          ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
          : fullName.substring(0, 2).toUpperCase();

        setRealUser({ 
          fullName: fullName, 
          profession: profession, 
          initials: initials 
        });

        // Fetch real CV details and AI analysis feedback
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        const res = await fetch('/api/cv', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        if (res.ok) {
          const data = await res.json();
          setCvData(data.cv);
          setCvAnalysis(data.analysis);
        }

        try {
          setInterviews(await fetchInterviews());
        } catch (interviewErr) {
          console.warn('Could not load interview history:', interviewErr);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setRealUser({ fullName: "Guest User", profession: "Guest", initials: "GU" });
      } finally {
        setLoadingCv(false);
      }
    }
    loadData();
  }, []);

  const theme = {
    background: "#080e1c",
    surface: "#12192a",
    primary: "#5bf4de",
    text: "#e0e5f9",
    textMuted: "#a5abbd",
    outline: "#424858",
  };

  const hasDraft = !!cvData;

  // Newest first from the API; the chart wants oldest first.
  const interviewStats = useMemo(() => {
    if (!interviews.length) return null;

    const scores = interviews.map((session) => Number(session.feedback?.overallScore) || 0);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const latest = interviews[0];
    const categories = Array.isArray(latest.feedback?.categories) ? latest.feedback.categories : [];

    return {
      count: interviews.length,
      averageScore: (Math.round(average * 10) / 10).toFixed(1),
      latestScore: (Number(latest.feedback?.overallScore) || 0).toFixed(1),
      skills: categories.map((category) => ({
        name: category.name,
        level: Math.max(0, Math.min(10, Number(category.score) || 0)) * 10,
      })),
      chart: buildTrendChart(scores.slice().reverse()),
    };
  }, [interviews]);

  const handleSuggestionClick = (category) => {
    // Write query parameter to URL history so CVBuilder can catch it on mount
    const newUrl = `${window.location.origin}${window.location.pathname}?highlight=${category}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    if (onShowCV) {
      onShowCV();
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current.click(); 
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImg(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const navItems = [
    { label: 'CV Builder', icon: 'description' },
    { label: 'AI Avatar Simulation', icon: 'smart_toy' },
  ];

  // This is the function that triggers the view change in App.js
  const handleEnterSimulation = () => {
    if (isStartingInterview) return;
    console.log("Starting Avatar Simulation...");
    if (onStartInterview) {
      onStartInterview();
    }
  };

  return (
    <div className="min-h-screen text-[#e0e5f9] font-inter overflow-y-auto" style={{ backgroundColor: theme.background }}>
      <style>{`
        .custom-scroll {
          scrollbar-width: thin;
          scrollbar-color: #5bf4de rgba(255, 255, 255, 0.05);
        }
        .custom-scroll::-webkit-scrollbar {
          width: 6px;
          display: block !important;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05) !important;
          border-radius: 3px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #5bf4de !important;
          border-radius: 3px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: #46eedd !important;
        }
        @keyframes pulse-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .animate-pulse-blink {
          animation: pulse-blink 1.5s infinite ease-in-out;
        }
      `}</style>
      
      <header className="fixed top-0 w-full z-50">
        <div className="border-b border-[#424858]/20 px-6 h-16 flex items-center justify-between" style={{ backgroundColor: theme.background }}>
          <div className="flex items-center gap-8">
            <span className="text-2xl font-black tracking-tighter" style={{ color: theme.primary }}>HireMe</span>
            <div className="h-6 w-[1px] bg-[#424858]/30 hidden md:block"></div>
            <h1 className="text-sm font-bold hidden md:block">
              Hello, {realUser.fullName}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onLogout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-[#a5abbd] hover:text-white hover:bg-[#1c2a41] border border-[#424858]/40 transition-colors"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              Log out
            </button>
            <button className="p-2 text-[#a5abbd] hover:text-white transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div 
              onClick={handlePhotoClick}
              className="w-8 h-8 rounded-full bg-[#1c2a41] border border-[#5bf4de]/20 flex items-center justify-center text-[10px] font-bold text-[#5bf4de] cursor-pointer overflow-hidden transition-all hover:border-[#5bf4de]"
            >
              {profileImg ? <img src={profileImg} alt="header profile" className="w-full h-full object-cover" /> : realUser.initials}
            </div>
          </div>
        </div>

        <div className="px-6 py-2 flex items-center border-b border-[#424858]/20 justify-between" style={{ backgroundColor: theme.surface }}>
          <nav className="flex items-center gap-1">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all" 
                    style={{ backgroundColor: theme.background, color: theme.primary }}>
              <span className="material-symbols-outlined text-lg">dashboard</span>
              Dashboard
            </button>

            {navItems.map((item) => (
              <button 
                key={item.label} 
                onClick={
                  item.label === 'AI Avatar Simulation' 
                    ? handleEnterSimulation 
                    : item.label === 'CV Builder' 
                      ? onShowCV 
                      : undefined
                }
                disabled={item.label === 'AI Avatar Simulation' && isStartingInterview}
                className="flex items-center gap-2 px-4 py-2 text-[#a5abbd] hover:text-white hover:bg-[#080e1c]/50 rounded-lg transition-all text-xs font-bold uppercase tracking-wider whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}

            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 text-[#a5abbd] group-hover:text-white group-hover:bg-[#080e1c]/50 rounded-lg transition-all text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                <span className="material-symbols-outlined text-lg">quiz</span>
                Practice Questions
                <span className="material-symbols-outlined text-xs transition-transform group-hover:rotate-180">expand_more</span>
              </button>

              <div className="absolute top-full left-0 mt-1 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top scale-95 group-hover:scale-100 z-50">
                <div className="p-2 rounded-xl border border-[#424858]/30 shadow-2xl" style={{ backgroundColor: theme.surface }}>
                  <button onClick={onShowTech} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-[#a5abbd] hover:text-[#5bf4de] hover:bg-[#080e1c]/50 rounded-lg transition-all uppercase tracking-wider whitespace-nowrap">
                    <span className="material-symbols-outlined text-sm">code</span>
                    Technical Questions
                  </button>
                  <button onClick={onShowHR} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-[#a5abbd] hover:text-[#5bf4de] hover:bg-[#080e1c]/50 rounded-lg transition-all uppercase tracking-wider whitespace-nowrap">
                    <span className="material-symbols-outlined text-sm">record_voice_over</span>
                    HR Questions
                  </button>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </header>

      <main className="pt-36 p-6 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN */}
          <div className="md:col-span-3 space-y-6">
            <div className="p-6 rounded-[16px] border border-[#424858]/20 flex flex-col items-center text-center" style={{ backgroundColor: theme.surface }}>
              <input type="file" ref={fileInputRef} onChange={handlePhotoChange} className="hidden" accept="image/*" />
              <div className="relative mb-4 group cursor-pointer" onClick={handlePhotoClick}>
                <div className="w-24 h-24 rounded-xl bg-[#1c2a41] flex items-center justify-center border-2 border-[#5bf4de]/20 text-3xl font-black text-[#5bf4de] overflow-hidden transition-all group-hover:border-[#5bf4de]/60">
                  {profileImg ? <img src={profileImg} alt="profile" className="w-full h-full object-cover" /> : realUser.initials}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                    <span className="material-symbols-outlined text-white text-2xl">photo_camera</span>
                  </div>
                </div>
                <div className="absolute -bottom-2 right-0 bg-[#5bf4de] text-[#080e1c] px-2 py-0.5 rounded text-[9px] font-black">VERIFIED</div>
              </div>
              <h2 className="text-xl font-black">{realUser.fullName}</h2>
              <p className="text-[#a5abbd] text-xs mb-6 uppercase tracking-wider font-bold">
                {realUser.profession}
              </p>
              <div className="w-full space-y-2 mb-8">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-[#a5abbd]">progress</span>
                  <span className="text-[#5bf4de]">82%</span>
                </div>
                <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-[#5bf4de]" style={{ width: '82%' }}></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 w-full pt-4 border-t border-[#424858]/20">
                <div><p className="text-lg font-black text-[#5bf4de]">{interviewStats?.count ?? 0}</p><p className="text-[8px] text-[#a5abbd] uppercase font-bold">Interviews</p></div>
                <div className="border-x border-[#424858]/20"><p className="text-lg font-black text-[#5bf4de]">04</p><p className="text-[8px] text-[#a5abbd] uppercase font-bold">Offers</p></div>
                <div><p className="text-lg font-black text-[#5bf4de]">{interviewStats?.averageScore ?? '—'}</p><p className="text-[8px] text-[#a5abbd] uppercase font-bold">Avg Score</p></div>
              </div>
            </div>
            
            <div className="p-6 rounded-[16px] border border-[#424858]/20" style={{ backgroundColor: theme.surface }}>
              <h3 className="font-bold text-sm mb-4 uppercase tracking-wider text-[#a5abbd]">Quick Access</h3>
              <div className="space-y-2">
                <button onClick={onShowTech} className="w-full text-left p-3 bg-black/30 hover:bg-black/50 rounded-lg flex justify-between items-center transition-all border border-transparent hover:border-[#5bf4de]/30">
                  <span className="text-sm font-semibold">Technical Questions</span>
                  <span className="material-symbols-outlined text-sm text-[#5bf4de]">chevron_right</span>
                </button>
                <button onClick={onShowHR} className="w-full text-left p-3 bg-black/30 hover:bg-black/50 rounded-lg flex justify-between items-center transition-all border border-transparent hover:border-[#5bf4de]/30">
                  <span className="text-sm font-semibold">HR Questions</span>
                  <span className="material-symbols-outlined text-sm text-[#5bf4de]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* MIDDLE COLUMN */}
          <div className="md:col-span-5 space-y-6">
            <div className="p-6 rounded-[16px] border border-[#424858]/20" style={{ backgroundColor: theme.surface }}>
              <div className="flex items-center justify-between mb-8 border-b border-[#424858]/10 pb-4">
                <h3 className="font-bold">Performance Analytics</h3>
                {interviewStats && (
                  <button
                    onClick={onShowFeedback}
                    className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#5bf4de] border border-[#5bf4de]/30 rounded-full hover:bg-[#5bf4de]/10 transition-all"
                  >
                    Full Reports
                  </button>
                )}
              </div>

              {interviewStats ? (
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-[10px] text-[#a5abbd] uppercase font-bold">Last Interview Score</p>
                        <h4 className="text-2xl font-black text-[#5bf4de]">{interviewStats.latestScore}<span className="text-xs text-[#a5abbd] font-normal ml-1">/10</span></h4>
                      </div>
                    </div>
                    <div className="w-full aspect-[2/1] mt-auto">
                      <svg viewBox="0 0 200 100" className="w-full h-full">
                        <line x1="0" y1="48.5" x2="200" y2="48.5" stroke="#424858" strokeWidth="1" strokeDasharray="4 4" />
                        {interviewStats.chart && (
                          <>
                            <path d={interviewStats.chart.area} fill="#1b3f3b" opacity="0.5" />
                            <path
                              d={interviewStats.chart.line}
                              stroke="#5bf4de"
                              strokeWidth="3"
                              fill="none"
                              strokeLinecap="round"
                            />
                            {interviewStats.chart.points.map((point, index) => (
                              <circle key={index} cx={point.x} cy={point.y} r="3" fill="#5bf4de" />
                            ))}
                          </>
                        )}
                        <text x="4" y="97" fill="#a5abbd" fontSize="8" fontWeight="bold">
                          {interviewStats.count > 1 ? 'SESSION 1' : ''}
                        </text>
                        <text x="140" y="97" fill="#a5abbd" fontSize="8" fontWeight="bold">LAST SESSION</text>
                      </svg>
                    </div>
                  </div>
                  <div className="hidden lg:block w-[1px] bg-[#424858]/20"></div>
                  <div className="flex-1">
                    <p className="text-[10px] text-[#a5abbd] uppercase font-bold mb-4">Skill Breakdown</p>
                    <div className="space-y-4">
                      {interviewStats.skills.length > 0 ? (
                        interviewStats.skills.map(skill => (
                          <div key={skill.name}>
                            <div className="flex justify-between text-[10px] mb-1 font-bold uppercase">
                              <span className="text-[#a5abbd]">{skill.name}</span>
                              <span className="text-white">{skill.level}%</span>
                            </div>
                            <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                              <div className="h-full bg-[#5bf4de]" style={{ width: `${skill.level}%` }}></div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-[#a5abbd] italic">No skill breakdown for your last session.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center py-8 px-4">
                  <span className="material-symbols-outlined text-4xl text-[#424858] mb-3">insights</span>
                  <p className="text-sm font-bold mb-1.5">No interview data yet</p>
                  <p className="text-xs text-[#a5abbd] leading-relaxed max-w-[300px]">
                    Run an avatar interview and your score, skill breakdown, and coaching feedback will appear here.
                  </p>
                </div>
              )}
            </div>

            <div className="relative rounded-[16px] overflow-hidden aspect-video bg-black border border-[#424858]/20 group">
              <img src={avatarSimulationPic} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" alt="Avatar Simulation" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-6 text-center">
                <h3 className="text-xl font-black text-white mb-2">Practice with Ava</h3>
                <p className="text-[#e0e5f9] text-[11px] mb-6 max-w-[280px] leading-relaxed opacity-90">Ready to test your skills? Start a real-time session with Ava.</p>
                <button
                  onClick={handleEnterSimulation}
                  disabled={isStartingInterview}
                  className="px-6 py-2.5 bg-[#5bf4de] text-[#080e1c] rounded-full text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-wait"
                >
                  {isStartingInterview ? 'Connecting…' : 'Enter Avatar Simulation'}
                </button>
              </div>
              <div className="absolute top-4 left-4 flex gap-2 z-30">
                 <span className="bg-[#5bf4de]/90 text-[#080e1c] text-[9px] font-black px-2 py-1 rounded shadow-lg">LIVE SIMULATION</span>
                 <span className="bg-red-500/90 text-white text-[9px] font-black px-2 py-1 rounded shadow-lg animate-pulse">● REC</span>
              </div>
              <div className="absolute bottom-4 left-4 z-30 text-left">
                <p className="text-white font-bold text-sm tracking-tight">Ava (AI)</p>
                <p className="text-[#5bf4de] text-[10px] font-bold tracking-widest">FAANG SPECIALIST</p>
              </div>
            </div>

            {interviews.length > 0 && (
              <div className="p-6 rounded-[16px] border border-[#424858]/20" style={{ backgroundColor: theme.surface }}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-[#a5abbd]">Recent Sessions</h3>
                  <button onClick={onShowFeedback} className="text-[10px] font-black uppercase tracking-wider text-[#5bf4de] hover:underline">
                    View all
                  </button>
                </div>
                <div className="space-y-2">
                  {interviews.slice(0, 4).map((session) => {
                    const score = Number(session.feedback?.overallScore) || 0;
                    return (
                      <button
                        key={session.id}
                        onClick={onShowFeedback}
                        className="w-full text-left p-3 bg-black/30 hover:bg-black/50 rounded-lg flex items-center justify-between gap-3 transition-all border border-transparent hover:border-[#5bf4de]/30"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{session.role || 'Interview'}</p>
                          <p className="text-[10px] text-[#a5abbd] uppercase tracking-wider font-bold">
                            {formatSessionDate(session.endedAt)}
                            {session.turnCount ? ` · ${session.turnCount} turns` : ''}
                          </p>
                        </div>
                        <span className="text-sm font-black text-[#5bf4de] shrink-0">{score.toFixed(1)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="md:col-span-4 flex flex-col">
            <div className="p-6 rounded-[16px] border border-[#424858]/20 flex flex-col h-full" style={{ backgroundColor: theme.surface }}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold">CV Intelligence</h3>
                  {cvAnalysis && (() => {
                    const scoreVal = parseInt(cvAnalysis.score, 10) || 0;
                    let scoreColor = 'text-[#10b981] bg-[#10b981]/15 border-[#10b981]/25'; // Green
                    let blinkClass = '';
                    if (scoreVal <= 40) {
                      scoreColor = 'text-[#ef4444] bg-[#ef4444]/15 border-[#ef4444]/25'; // Red
                      blinkClass = 'animate-pulse-blink';
                    } else if (scoreVal <= 70) {
                      scoreColor = 'text-[#f97316] bg-[#f97316]/15 border-[#f97316]/25'; // Orange
                    }
                    return (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${scoreColor} ${blinkClass}`}>
                        Score: {cvAnalysis.score}/100
                      </span>
                    );
                  })()}
                </div>
                <button onClick={onShowCV} className="relative flex items-center group cursor-pointer bg-transparent border-none text-[#5bf4de] hover:scale-110 transition-transform outline-none">
                  <span className="material-symbols-outlined">post_add</span>
                </button>
              </div>
              <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-black border border-[#424858]/30 mb-6 group">
                {hasDraft ? (
                  <CVThumbnail cvData={cvData} onShowCV={onShowCV} />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-[#a5abbd]">
                    <span className="material-symbols-outlined text-4xl mb-3 opacity-20">cloud_upload</span>
                    <p className="font-bold text-xs mb-2">Build Your CV Profile</p>
                    <button onClick={onShowCV} className="px-3 py-1 bg-[#46eedd] text-[#080e1c] text-[9px] font-black uppercase rounded tracking-wider">Start Now</button>
                  </div>
                )}
              </div>
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                {cvAnalysis ? (
                  <div className="space-y-6 text-left">
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-[#a5abbd] mb-3 tracking-widest">Key Strengths</h4>
                      <ul className="space-y-2 max-h-48 overflow-y-scroll pr-1 custom-scroll">
                        {Array.isArray(cvAnalysis?.strengths) && cvAnalysis.strengths.length > 0 ? (
                          cvAnalysis.strengths.slice(0, 5).map((str, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-xs text-[#e0e5f9]">
                              <span className="material-symbols-outlined text-[#4ae183] text-sm mt-0.5">check_circle</span>
                              <span>{str}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-xs text-[#a5abbd] italic p-2 bg-black/10 rounded">No strengths records resolved.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-left">
                    <div className="bg-black/30 border-l-2 border-[#a5abbd] p-4 rounded-r-lg">
                      <p className="text-xs italic text-[#a5abbd] leading-relaxed">"No analysis records found. Run AI review in the builder to receive dynamic coaching suggestions here."</p>
                    </div>
                    <button onClick={onShowCV} className="w-full py-2.5 bg-[#46eedd]/10 hover:bg-[#46eedd]/20 text-[#46eedd] border border-[#46eedd]/20 hover:border-[#46eedd]/50 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all">
                      Open CV Builder
                    </button>
                  </div>
                )}
                <button onClick={onShowCV} className="w-full py-3 mt-4 border border-[#5bf4de]/30 rounded-lg text-[#5bf4de] text-[10px] font-black uppercase hover:bg-[#5bf4de]/10 transition-all">Edit Resume</button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Dashboard;