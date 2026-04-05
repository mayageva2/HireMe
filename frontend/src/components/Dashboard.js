import React, { useState, useRef } from 'react';
import avatarSimulationPic from '../assets/avatarImage.png'; 
import cvDraftPic from '../assets/fakeCv.png';

const mockData = {
  user: {
    fullName: "Alex Rivera",
    profession: "Senior Product Designer Path",
    stats: { interviews: 12, offers: 4, score: 8.5 }
  },
  analytics: {
    readiness: "Strong",
    percentile: "Top 15%",
    skills: [
      { name: "UX", level: 92 },
      { name: "Tech", level: 78 },
      { name: "Visual", level: 85 },
      { name: "Research", level: 70 },
      { name: "Comm", level: 95 }
    ]
  },
  cvSuggestions: [
    "Quantify your impact at 'Design Co'",
    "Update 'Skills' to include React 18",
    "Fix alignment in 'Education' section"
  ]
};

const Dashboard = ({ onStartInterview }) => {
  const theme = {
    background: "#080e1c",
    surface: "#12192a",
    primary: "#5bf4de",
    text: "#e0e5f9",
    textMuted: "#a5abbd",
    outline: "#424858",
  };

  const [hasDraft, setHasDraft] = useState(true);
  const [profileImg, setProfileImg] = useState(null);
  const fileInputRef = useRef(null);

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
    console.log("Starting Avatar Simulation...");
    if (onStartInterview) {
      onStartInterview();
    }
  };

  return (
    <div className="min-h-screen text-[#e0e5f9] font-inter" style={{ backgroundColor: theme.background }}>
      
      <header className="fixed top-0 w-full z-50">
        <div className="border-b border-[#424858]/20 px-6 h-16 flex items-center justify-between" style={{ backgroundColor: theme.background }}>
          <div className="flex items-center gap-8">
            <span className="text-2xl font-black tracking-tighter" style={{ color: theme.primary }}>HireMe</span>
            <div className="h-6 w-[1px] bg-[#424858]/30 hidden md:block"></div>
            <h1 className="text-sm font-bold hidden md:block">Hello, {mockData.user.fullName}</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-[#a5abbd] hover:text-white transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div 
              onClick={handlePhotoClick}
              className="w-8 h-8 rounded-full bg-[#1c2a41] border border-[#5bf4de]/20 flex items-center justify-center text-[10px] font-bold text-[#5bf4de] cursor-pointer overflow-hidden transition-all hover:border-[#5bf4de]"
            >
              {profileImg ? <img src={profileImg} alt="header profile" className="w-full h-full object-cover" /> : "AR"}
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
                onClick={item.label === 'AI Avatar Simulation' ? handleEnterSimulation : undefined}
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
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-[#a5abbd] hover:text-[#5bf4de] hover:bg-[#080e1c]/50 rounded-lg transition-all uppercase tracking-wider whitespace-nowrap">
                    <span className="material-symbols-outlined text-sm">code</span>
                    Technical Questions
                  </button>
                  <button onClick={handleEnterSimulation} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-[#a5abbd] hover:text-[#5bf4de] hover:bg-[#080e1c]/50 rounded-lg transition-all uppercase tracking-wider whitespace-nowrap">
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
                  {profileImg ? <img src={profileImg} alt="profile" className="w-full h-full object-cover" /> : "AR"}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                    <span className="material-symbols-outlined text-white text-2xl">photo_camera</span>
                  </div>
                </div>
                <div className="absolute -bottom-2 right-0 bg-[#5bf4de] text-[#080e1c] px-2 py-0.5 rounded text-[9px] font-black">VERIFIED</div>
              </div>
              <h2 className="text-xl font-black">{mockData.user.fullName}</h2>
              <p className="text-[#a5abbd] text-xs mb-6">{mockData.user.profession}</p>
              
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
                <div><p className="text-lg font-black text-[#5bf4de]">{mockData.user.stats.interviews}</p><p className="text-[8px] text-[#a5abbd] uppercase font-bold">Interviews</p></div>
                <div className="border-x border-[#424858]/20"><p className="text-lg font-black text-[#5bf4de]">04</p><p className="text-[8px] text-[#a5abbd] uppercase font-bold">Offers</p></div>
                <div><p className="text-lg font-black text-[#5bf4de]">{mockData.user.stats.score}</p><p className="text-[8px] text-[#a5abbd] uppercase font-bold">Avg Score</p></div>
              </div>
            </div>
            
            <div className="p-6 rounded-[16px] border border-[#424858]/20" style={{ backgroundColor: theme.surface }}>
              <h3 className="font-bold text-sm mb-4 uppercase tracking-wider text-[#a5abbd]">Quick Access</h3>
              <div className="space-y-2">
                <button className="w-full text-left p-3 bg-black/30 hover:bg-black/50 rounded-lg flex justify-between items-center transition-all border border-transparent hover:border-[#5bf4de]/30">
                  <span className="text-sm font-semibold">Technical Questions</span>
                  <span className="material-symbols-outlined text-sm text-[#5bf4de]">chevron_right</span>
                </button>
                <button onClick={handleEnterSimulation} className="w-full text-left p-3 bg-black/30 hover:bg-black/50 rounded-lg flex justify-between items-center transition-all border border-transparent hover:border-[#5bf4de]/30">
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
                <div className="flex bg-black/20 rounded-full p-1">
                  <button className="px-3 py-1 text-[10px] bg-[#2c3951] rounded-full">Weekly</button>
                  <button className="px-3 py-1 text-[10px] text-[#a5abbd]">Monthly</button>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[10px] text-[#a5abbd] uppercase font-bold">Interview Score</p>
                      <h4 className="text-2xl font-black text-[#5bf4de]">8.5<span className="text-xs text-[#a5abbd] font-normal ml-1">/10</span></h4>
                    </div>
                  </div>
                  <div className="w-full aspect-[2/1] mt-auto">
                    <svg viewBox="0 0 200 100" className="w-full h-full">
                      <line x1="0" y1="35" x2="200" y2="35" stroke="#424858" strokeWidth="1" strokeDasharray="4 4" /> 
                      <path d="M0 80 Q 25 70, 50 60 T 100 40 T 150 20 T 200 10 L 200 100 L 0 100 Z" fill="#1b3f3b" opacity="0.5" />
                      <path d="M0 80 Q 25 70, 50 60 T 100 40 T 150 20 T 200 10" stroke="#5bf4de" strokeWidth="3" fill="none" strokeLinecap="round"/>
                      <text x="10" y="95" fill="#a5abbd" fontSize="8" fontWeight="bold">SESSION 1</text>
                      <text x="140" y="95" fill="#a5abbd" fontSize="8" fontWeight="bold">LAST SESSION</text>
                    </svg>
                  </div>
                </div>
                <div className="hidden lg:block w-[1px] bg-[#424858]/20"></div>
                <div className="flex-1">
                  <p className="text-[10px] text-[#a5abbd] uppercase font-bold mb-4">Skill Breakdown</p>
                  <div className="space-y-4">
                    {mockData.analytics.skills.map(skill => (
                      <div key={skill.name}>
                        <div className="flex justify-between text-[10px] mb-1 font-bold uppercase">
                          <span className="text-[#a5abbd]">{skill.name}</span>
                          <span className="text-white">{skill.level}%</span>
                        </div>
                        <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                          <div className="h-full bg-[#5bf4de]" style={{ width: `${skill.level}%` }}></div>
                        </div>
                      </div>
                    ))}
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
                <button onClick={handleEnterSimulation} className="px-6 py-2.5 bg-[#5bf4de] text-[#080e1c] rounded-full text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Enter Avatar Simulation</button>
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
          </div>

          {/* RIGHT COLUMN */}
          <div className="md:col-span-4 flex flex-col">
            <div className="p-6 rounded-[16px] border border-[#424858]/20 flex flex-col h-full" style={{ backgroundColor: theme.surface }}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold">CV Intelligence</h3>
                <div className="relative flex items-center group cursor-pointer">
                  <span className="material-symbols-outlined text-[#5bf4de] group-hover:scale-110 transition-transform">post_add</span>
                </div>
              </div>
              <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-black border border-[#424858]/30 mb-6 group">
                {hasDraft ? (
                  <>
                    <img src={cvDraftPic} className="absolute inset-0 w-full h-full object-cover blur-[1px] opacity-50 group-hover:scale-105 transition-transform duration-700" alt="CV Draft Preview" />
                    <div className="absolute inset-0 bg-black/40 z-10"></div>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <button className="flex items-center gap-2 px-5 py-2 bg-[#080e1c] border border-[#5bf4de]/30 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all hover:border-[#5bf4de]"><span className="material-symbols-outlined text-base text-[#5bf4de]">search</span>Preview Current Draft</button>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-[#a5abbd]"><span className="material-symbols-outlined text-4xl mb-3 opacity-20">cloud_upload</span><p className="font-bold text-xs">Upload Your CV</p></div>
                )}
              </div>
              <div className="space-y-6 flex-1">
                <div className="bg-black/30 border-l-2 border-[#5bf4de] p-4 rounded-r-lg">
                  <p className="text-xs italic text-[#e0e5f9] leading-relaxed">"Your CV is missing keyword density for 'Cloud Architecture'. Consider adding specific AWS certifications."</p>
                  <div className="mt-2 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#5bf4de]"></div><span className="text-[9px] font-black text-[#5bf4de] uppercase">AI Suggestion</span></div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase text-[#a5abbd] mb-4 tracking-widest">Top Suggestions</h4>
                  <ul className="space-y-4">
                    {mockData.cvSuggestions.map((text, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs text-[#e0e5f9] group cursor-pointer"><span className="material-symbols-outlined text-[#5bf4de] text-sm mt-0.5 group-hover:scale-125 transition-transform">check_circle</span><span className="group-hover:text-white transition-colors">{text}</span></li>
                    ))}
                  </ul>
                </div>
                <button className="w-full py-3 mt-auto border border-[#5bf4de]/30 rounded-lg text-[#5bf4de] text-[10px] font-black uppercase hover:bg-[#5bf4de]/10 transition-all">Edit Resume</button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Dashboard;