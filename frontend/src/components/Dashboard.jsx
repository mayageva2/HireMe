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
const INTERVIEW_TIPS = [
  "Use the STAR method (Situation, Task, Action, Result) for behavioral questions. Focus 70% of your answer on your specific actions and the quantifiable results.",
  "When asked a complex problem, think out loud. Interviewers care more about your problem-solving framework and communication style than getting the perfect answer immediately.",
  "Research the company's recent press releases, product launches, or engineering blogs. Referencing these details during the interview demonstrates genuine interest.",
  "Always prepare 2-3 thoughtful questions for the end of the interview. Focus on team culture, engineering challenges, or company growth rather than basic logistics.",
  "Make sure you speak in detail about every project listed on your CV. If you put a skill or technology on your resume, expect to be questioned on it.",
  "Don't rush to answer. It's completely fine to say, 'That's a great question. Let me take 5 seconds to organize my thoughts.' This projects confidence.",
  "When discussing achievements, quantify your impact. Instead of saying 'Improved performance,' say 'Reduced API latency by 35%, improving mobile conversion rates by 4%'.",
  "In system design or operations questions, start with high-level constraints before diving into details. Define the scope and scale of the problem first."
];

const Dashboard = ({ onStartInterview, onLogout, onShowHR, onShowTech, onShowCV, onShowFeedback, isStartingInterview }) => {
  const [realUser, setRealUser] = useState({ 
    fullName: 'Loading...', 
    profession: 'Loading...', 
    initials: '??',
    emailVerified: false,
    userId: null
  });
  const [profileImg, setProfileImg] = useState(null);
  const fileInputRef = useRef(null);
  const [cvData, setCvData] = useState(null);
  const [cvAnalysis, setCvAnalysis] = useState(null);
  const [loadingCv, setLoadingCv] = useState(true);
  const [interviews, setInterviews] = useState([]);
  const [hrProgress, setHrProgress] = useState({ history: {}, performanceScore: 0 });
  const [techProgress, setTechProgress] = useState({ history: {}, activeDifficulty: 'Beginner', performanceScore: 0 });

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
        const emailVerified = attributes['email_verified'] === 'true';
        const email = attributes['email'] || "";
        const userId = attributes['sub'] || email || fullName;

        setRealUser({ 
          fullName: fullName, 
          profession: profession, 
          initials: initials,
          emailVerified: emailVerified,
          userId: userId
        });

        const storedImg = localStorage.getItem(`hireme_profile_image_${userId}`);
        if (storedImg) {
          setProfileImg(storedImg);
        }

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
          const hrRes = await fetch('/api/cv/hr-questions/progress', {
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
          });
          if (hrRes.ok) {
            const hrData = await hrRes.json();
            setHrProgress(hrData);
          }
        } catch (hrErr) {
          console.warn('Could not load HR progress:', hrErr);
        }

        try {
          const techRes = await fetch('/api/cv/tech-questions/progress', {
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
          });
          if (techRes.ok) {
            const techData = await techRes.json();
            setTechProgress(techData);
          }
        } catch (techErr) {
          console.warn('Could not load Tech progress:', techErr);
        }

        try {
          setInterviews(await fetchInterviews());
        } catch (interviewErr) {
          console.warn('Could not load interview history:', interviewErr);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setRealUser({ fullName: "Guest User", profession: "Guest", initials: "GU", userId: "guest" });
        const storedImg = localStorage.getItem(`hireme_profile_image_guest`);
        if (storedImg) {
          setProfileImg(storedImg);
        }
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

  const hrCounts = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    Object.values(hrProgress.history || {}).forEach(val => {
      if (val.status === 'correct') correct++;
      else incorrect++;
    });
    return { correct, incorrect, total: correct + incorrect };
  }, [hrProgress]);

  const techCounts = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    Object.values(techProgress.history || {}).forEach(val => {
      if (val.status === 'correct') correct++;
      else incorrect++;
    });
    return { correct, incorrect, total: correct + incorrect };
  }, [techProgress]);

  const techDiffStats = useMemo(() => {
    const difficulties = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
    const stats = {};
    
    difficulties.forEach(diff => {
      let total = 0;
      let correct = 0;
      
      Object.entries(techProgress.history || {}).forEach(([id, val]) => {
        let itemDiff = val.difficulty;
        if (!itemDiff) {
          if (id.includes('-j')) itemDiff = 'Beginner';
          else if (id.includes('-m')) itemDiff = 'Intermediate';
          else if (id.includes('-s')) itemDiff = 'Advanced';
          else if (id.includes('-l') || id.includes('expert')) itemDiff = 'Expert';
          else itemDiff = 'Beginner';
        }
        
        if (itemDiff === diff) {
          total++;
          if (val.status === 'correct') {
            correct++;
          }
        }
      });
      
      stats[diff] = {
        total,
        correct,
        percentage: total > 0 ? Math.round((correct / total) * 100) : 0
      };
    });
    
    return stats;
  }, [techProgress]);

  const tipOfTheDay = useMemo(() => {
    const day = new Date().getDate();
    return INTERVIEW_TIPS[day % INTERVIEW_TIPS.length];
  }, []);

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
        const base64Str = reader.result;
        setProfileImg(base64Str);
        const currentUserId = realUser?.userId || "guest";
        localStorage.setItem(`hireme_profile_image_${currentUserId}`, base64Str);
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

  const totalReviewed = hrCounts.total + techCounts.total;
  const totalMastered = hrCounts.correct + techCounts.correct;
  const globalEfficiency = totalReviewed > 0 ? Math.round((totalMastered / totalReviewed) * 100) : 0;

  const resolvedPath = useMemo(() => {
    let role = "Candidate";
    let isDefaultTech = false;

    if (realUser.fullName === "Guest User") {
      role = "Guest";
    } else if (realUser.profession && realUser.profession !== "Professional" && realUser.profession !== "Software Engineer" && realUser.profession !== "Loading...") {
      role = realUser.profession;
    } else if (cvData?.experience?.[0]?.role) {
      role = cvData.experience[0].role;
    } else if (cvData?.personalInfo?.summary) {
      const summaryFirstSentence = cvData.personalInfo.summary.split(/[.!?]/)[0] || "";
      if (summaryFirstSentence.length > 0 && summaryFirstSentence.length < 50) {
        role = summaryFirstSentence.trim();
      } else {
        role = "Professional";
      }
    } else {
      role = realUser.profession || "Software Engineer";
      if (role === "Loading...") {
        role = "Software Engineer";
      }
      isDefaultTech = true;
    }

    // Dynamic Industry resolution
    let industry = "General Career";
    const allSkills = Array.isArray(cvData?.skills) 
      ? cvData.skills.map(s => typeof s === 'string' ? s.toLowerCase() : (s?.name || '').toLowerCase())
      : [];

    const techKeywords = ['react', 'node', 'python', 'java', 'c++', 'aws', 'docker', 'javascript', 'css', 'html', 'git', 'software', 'programming', 'developer', 'engineer', 'devops'];
    const financeKeywords = ['accounting', 'finance', 'tax', 'audit', 'ledger', 'invoice', 'billing', 'excel', 'accountant'];

    const hasTechSkills = allSkills.some(s => techKeywords.some(keyword => s.includes(keyword))) || isDefaultTech;
    const hasFinanceSkills = allSkills.some(s => financeKeywords.some(keyword => s.includes(keyword)));

    if (hasTechSkills) {
      industry = "Technology & Software";
    } else if (hasFinanceSkills) {
      industry = "Finance & Accounting";
    } else if (cvData?.experience?.some(exp => exp.company?.toLowerCase().includes("accounting") || exp.role?.toLowerCase().includes("accountant"))) {
      industry = "Finance & Accounting";
    }

    return { role, industry };
  }, [realUser, cvData]);

  const progressScore = useMemo(() => {
    if (realUser.fullName === "Guest User") return 0;
    
    let score = 10; // 10% base for active Cognito account
    if (cvData) {
      score += 30; // 30% for CV Draft
    }
    if (cvAnalysis) {
      score += 20; // 20% for AI CV Review
    }
    // Up to 20% for flashcard practice: 2% per question, max 10 questions = 20%
    score += Math.min(20, totalReviewed * 2);
    // Up to 20% for mock interviews: 10% per interview, max 2 interviews = 20%
    score += Math.min(20, interviews.length * 10);
    
    return score;
  }, [realUser, cvData, cvAnalysis, totalReviewed, interviews]);

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
          <div className="md:col-span-3 space-y-6 md:sticky md:top-24 h-fit">
            <div className="p-6 rounded-[16px] border border-[#424858]/20 flex flex-col items-center text-center" style={{ backgroundColor: theme.surface }}>
              <input type="file" ref={fileInputRef} onChange={handlePhotoChange} className="hidden" accept="image/*" />
              <div className="relative mb-4 group cursor-pointer" onClick={handlePhotoClick}>
                <div className="w-24 h-24 rounded-xl bg-[#1c2a41] flex items-center justify-center border-2 border-[#5bf4de]/20 text-3xl font-black text-[#5bf4de] overflow-hidden transition-all group-hover:border-[#5bf4de]/60">
                  {profileImg ? <img src={profileImg} alt="profile" className="w-full h-full object-cover" /> : realUser.initials}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                    <span className="material-symbols-outlined text-white text-2xl">photo_camera</span>
                  </div>
                </div>
                {realUser.fullName !== "Guest User" ? (
                  <div className="absolute -bottom-2 right-0 bg-[#5bf4de] text-[#080e1c] px-2 py-0.5 rounded text-[9px] font-black">
                    {realUser.emailVerified ? "VERIFIED" : "ACTIVE"}
                  </div>
                ) : (
                  <div className="absolute -bottom-2 right-0 bg-[#a5abbd] text-[#080e1c] px-2 py-0.5 rounded text-[9px] font-black">
                    GUEST
                  </div>
                )}
              </div>
              <h2 className="text-xl font-black">{realUser.fullName}</h2>
              <p className="text-[#a5abbd] text-xs mb-6 uppercase tracking-wider font-bold">
                {resolvedPath.role}
              </p>
              <div className="w-full space-y-2 mb-8">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-[#a5abbd]">progress</span>
                  <span className="text-[#5bf4de]">{progressScore}%</span>
                </div>
                <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-[#5bf4de]" style={{ width: `${progressScore}%` }}></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 w-full pt-4 border-t border-[#424858]/20">
                <div><p className="text-lg font-black text-[#5bf4de]">{interviewStats?.count ?? 0}</p><p className="text-[8px] text-[#a5abbd] uppercase font-bold">Interviews</p></div>
                <div className="border-x border-[#424858]/20">
                  <p className="text-lg font-black text-[#5bf4de]">
                    {String(totalMastered).padStart(2, '0')}
                  </p>
                  <p className="text-[8px] text-[#a5abbd] uppercase font-bold">Mastered</p>
                </div>
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

            <div className="p-6 rounded-[16px] border border-[#424858]/20 bg-gradient-to-br from-[#12192a] to-[#1a2333]" style={{ backgroundColor: theme.surface }}>
              <h4 className="font-bold text-xs uppercase tracking-widest text-[#5bf4de] mb-3">Interview Tip of the Day</h4>
              <p className="text-xs text-[#e0e5f9] leading-relaxed">
                {tipOfTheDay}
              </p>
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

            {/* Flashcard Performance Analytics Card */}
            <div className="p-5 rounded-[16px] border border-[#424858]/20 bg-gradient-to-br from-[#12192a] to-[#162235]" style={{ backgroundColor: theme.surface }}>
              <div className="flex items-center justify-between mb-5 border-b border-[#424858]/10 pb-3">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#a5abbd]">Flashcards Progress</h3>
                  <p className="text-[9px] text-[#5bf4de] font-bold mt-0.5 uppercase tracking-wider">
                    Mastery Overview
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={onShowHR} className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#5bf4de] border border-[#5bf4de]/25 rounded-full hover:bg-[#5bf4de]/10 transition-all">
                    Practice HR
                  </button>
                  <button onClick={onShowTech} className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#5bf4de] border border-[#5bf4de]/25 rounded-full hover:bg-[#5bf4de]/10 transition-all">
                    Practice Tech
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* HR Flashcards circular progress */}
                <div className="flex items-center gap-4 bg-black/20 p-4 rounded-xl border border-[#424858]/10">
                  <div className="relative w-14 h-14 shrink-0">
                    <svg viewBox="0 0 64 64" className="w-full h-full transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="#1c2a41"
                        strokeWidth="4.5"
                        fill="transparent"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="#5bf4de"
                        strokeWidth="4.5"
                        fill="transparent"
                        strokeDasharray="175.9"
                        strokeDashoffset={175.9 - (175.9 * (hrProgress.performanceScore || 0)) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[#5bf4de]">
                      {hrProgress.performanceScore || 0}%
                    </div>
                  </div>
                  <div className="text-left">
                    <h4 className="text-[10px] text-[#a5abbd] uppercase font-bold tracking-wider mb-0.5">HR Behavioral</h4>
                    <p className="text-white text-xs font-semibold">{hrCounts.total} Answered</p>
                    <div className="flex gap-2 mt-0.5 text-[9px] text-[#a5abbd] font-bold">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#5bf4de]"></span>{hrCounts.correct} Mastered</span>
                    </div>
                  </div>
                </div>

                {/* Tech Flashcards circular progress */}
                <div className="flex items-center gap-4 bg-black/20 p-4 rounded-xl border border-[#424858]/10">
                  <div className="relative w-14 h-14 shrink-0">
                    <svg viewBox="0 0 64 64" className="w-full h-full transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="#1c2a41"
                        strokeWidth="4.5"
                        fill="transparent"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="#5bf4de"
                        strokeWidth="4.5"
                        fill="transparent"
                        strokeDasharray="175.9"
                        strokeDashoffset={175.9 - (175.9 * (techProgress.performanceScore || 0)) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[#5bf4de]">
                      {techProgress.performanceScore || 0}%
                    </div>
                  </div>
                  <div className="text-left">
                    <h4 className="text-[10px] text-[#a5abbd] uppercase font-bold tracking-wider mb-0.5">Technical Skills</h4>
                    <p className="text-white text-xs font-semibold">{techCounts.total} Answered</p>
                    <div className="flex gap-2 mt-0.5 text-[9px] text-[#a5abbd] font-bold">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#5bf4de]"></span>{techCounts.correct} Mastered</span>
                    </div>
                  </div>
                </div>
              </div>
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
                <p className="text-[#5bf4de] text-[10px] font-bold tracking-widest">
                  {resolvedPath.industry === "Technology & Software" ? "FAANG SPECIALIST" : 
                   resolvedPath.industry === "Finance & Accounting" ? "FINANCIAL SPECIALIST" : 
                   "CAREER SPECIALIST"}
                </p>
              </div>
            </div>

            <div className="p-6 rounded-[16px] border border-[#424858]/20" style={{ backgroundColor: theme.surface }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-[#a5abbd]">Recent Sessions</h3>
                {interviews.length > 0 && (
                  <button onClick={onShowFeedback} className="text-[10px] font-black uppercase tracking-wider text-[#5bf4de] hover:underline">
                    View all
                  </button>
                )}
              </div>
              {interviews.length > 0 ? (
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
              ) : (
                <div className="flex flex-col items-center text-center py-4 text-[#a5abbd]">
                  <span className="material-symbols-outlined text-3xl mb-2 opacity-25">history</span>
                  <p className="text-xs font-semibold">No recent sessions recorded</p>
                </div>
              )}
            </div>
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