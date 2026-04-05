import React from 'react';
import avatarSimulationPic from '../assets/avatarImage.png'; 

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

const Dashboard = () => {
  const theme = {
    background: "#080e1c",
    surface: "#12192a",
    primary: "#5bf4de",
    text: "#e0e5f9",
    textMuted: "#a5abbd",
    outline: "#424858",
  };

  const handleEnterSimulation = () => {
    console.log("Starting Avatar Simulation...");
  };

  return (
    <div className="min-h-screen text-[#e0e5f9] font-inter" style={{ backgroundColor: theme.background }}>
      {/* Main Content */}
      <main className="pt-10 p-6 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Profile & Question Bank */}
          <div className="md:col-span-3 space-y-6">
            {/* Profile Card */}
            <div className="p-6 rounded-[16px] border border-[#424858]/20 flex flex-col items-center text-center" style={{ backgroundColor: theme.surface }}>
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-xl bg-[#1c2a41] flex items-center justify-center border-2 border-[#5bf4de]/20 text-3xl font-black text-[#5bf4de]">
                  AL
                </div>
                <div className="absolute -bottom-2 right-0 bg-[#5bf4de] text-[#080e1c] px-2 py-0.5 rounded text-[9px] font-black">VERIFIED</div>
              </div>
              <h2 className="text-xl font-black">{mockData.user.fullName}</h2>
              <p className="text-[#a5abbd] text-xs mb-6">{mockData.user.profession}</p>
              
              <div className="w-full space-y-2 mb-8">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-[#a5abbd]">Profile Completion</span>
                  <span className="text-[#5bf4de]">82%</span>
                </div>
                <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-[#5bf4de]" style={{ width: '82%' }}></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 w-full pt-4 border-t border-[#424858]/20">
                <div><p className="text-lg font-black text-[#5bf4de]">{mockData.user.stats.interviews}</p><p className="text-[8px] text-[#a5abbd] uppercase">Interviews</p></div>
                <div className="border-x border-[#424858]/20"><p className="text-lg font-black text-[#5bf4de]">04</p><p className="text-[8px] text-[#a5abbd] uppercase">Offers</p></div>
                <div><p className="text-lg font-black text-[#5bf4de]">{mockData.user.stats.score}</p><p className="text-[8px] text-[#a5abbd] uppercase">Avg Score</p></div>
              </div>
            </div>
            
            {/* Question Bank */}
            <div className="p-6 rounded-[16px] border border-[#424858]/20" style={{ backgroundColor: theme.surface }}>
              <h3 className="font-bold text-sm mb-4 uppercase tracking-wider text-[#a5abbd]">Question Bank</h3>
              <div className="space-y-2">
                <button className="w-full text-left p-3 bg-black/30 hover:bg-black/50 rounded-lg flex justify-between items-center transition-all border border-transparent hover:border-[#5bf4de]/30">
                  <span className="text-sm font-semibold">Technical Q's</span>
                  <span className="material-symbols-outlined text-sm text-[#5bf4de]">chevron_right</span>
                </button>
                <button className="w-full text-left p-3 bg-black/30 hover:bg-black/50 rounded-lg flex justify-between items-center transition-all border border-transparent hover:border-[#5bf4de]/30">
                  <span className="text-sm font-semibold">HR & Behavioral</span>
                  <span className="material-symbols-outlined text-sm text-[#5bf4de]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* MIDDLE COLUMN: Analytics & Simulation */}
          <div className="md:col-span-5 space-y-6">
            {/* Performance Analytics */}
            <div className="p-6 rounded-[16px] border border-[#424858]/20" style={{ backgroundColor: theme.surface }}>
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-bold">Performance Analytics</h3>
                <div className="flex bg-black/20 rounded-full p-1">
                  <button className="px-3 py-1 text-[10px] bg-[#2c3951] rounded-full">Weekly</button>
                  <button className="px-3 py-1 text-[10px] text-[#a5abbd]">Monthly</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="text-[10px] text-[#a5abbd] uppercase font-bold mb-1">Readiness Trend</p>
                  <div className="text-2xl font-black text-[#5bf4de] flex items-center gap-2">
                    {mockData.analytics.readiness} 
                    <span className="text-xs bg-[#5bf4de]/10 px-2 py-0.5 rounded">+12.5%</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[#a5abbd] uppercase font-bold mb-1">Market Percentile</p>
                  <div className="text-2xl font-black text-white">{mockData.analytics.percentile}</div>
                </div>
              </div>

              {/* Skill Breakdown Bars */}
              <div className="space-y-4">
                {mockData.analytics.skills.map(skill => (
                  <div key={skill.name}>
                    <div className="flex justify-between text-[10px] mb-1 font-bold uppercase tracking-tighter">
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

            {/* Live Simulation Card with Image & Action Button */}
            <div className="relative rounded-[16px] overflow-hidden aspect-video bg-black border border-[#424858]/20 group">
              {/* Background Image */}
              <img 
                src={avatarSimulationPic} 
                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" 
                alt="Avatar Simulation"
              />
              
              {/* Gradient Overlay for Text Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10"></div>
              
              {/* Content Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-6 text-center">
                <h3 className="text-xl font-black text-white mb-2 shadow-sm">AI Interview Simulation</h3>
                <p className="text-[#e0e5f9] text-[11px] mb-6 max-w-[280px] leading-relaxed opacity-90">
                  Ready to test your skills? Start a real-time session with Ava.
                </p>
                <button 
                  onClick={handleEnterSimulation}
                  className="px-6 py-2.5 bg-[#5bf4de] text-[#080e1c] rounded-full text-[11px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(91,244,222,0.3)] hover:scale-105 active:scale-95 transition-all"
                >
                  Enter Avatar Simulation
                </button>
              </div>

              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2 z-30">
                 <span className="bg-[#5bf4de]/90 text-[#080e1c] text-[9px] font-black px-2 py-1 rounded shadow-lg">LIVE SIMULATION</span>
                 <span className="bg-red-500/90 text-white text-[9px] font-black px-2 py-1 rounded shadow-lg animate-pulse">● REC</span>
              </div>
              
              {/* Label at bottom left */}
              <div className="absolute bottom-4 left-4 z-30 text-left">
                <p className="text-white font-bold text-sm tracking-tight">Ava (AI)</p>
                <p className="text-[#5bf4de] text-[10px] font-bold tracking-widest">FAANG SPECIALIST</p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: CV Intelligence */}
          <div className="md:col-span-4">
             <div className="p-6 rounded-[16px] border border-[#424858]/20 h-full flex flex-col" style={{ backgroundColor: theme.surface }}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold">CV Intelligence</h3>
                  <span className="material-symbols-outlined text-[#5bf4de] opacity-50">description</span>
                </div>

                <div className="bg-black/40 border-l-2 border-[#5bf4de] p-4 rounded-r-lg mb-8">
                  <p className="text-xs italic text-[#e0e5f9] leading-relaxed">
                    "Your CV is missing keyword density for 'Cloud Architecture'. Consider adding specific AWS certifications to the header."
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#5bf4de]"></div>
                    <span className="text-[9px] font-black text-[#5bf4de] uppercase">AI Suggestion</span>
                  </div>
                </div>

                <h4 className="text-[10px] font-black uppercase text-[#a5abbd] mb-4 tracking-widest">Top Suggestions</h4>
                <ul className="space-y-4 flex-1">
                  {mockData.cvSuggestions.map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-xs text-[#e0e5f9] group cursor-pointer">
                      <span className="material-symbols-outlined text-[#5bf4de] text-sm mt-0.5 group-hover:scale-125 transition-transform">check_circle</span>
                      <span className="group-hover:text-white transition-colors">{text}</span>
                    </li>
                  ))}
                </ul>

                <button className="w-full py-3 mt-6 border border-[#5bf4de]/30 rounded-lg text-[#5bf4de] text-[10px] font-black uppercase hover:bg-[#5bf4de]/10 transition-all">
                  Full Resume Audit
                </button>
             </div>
          </div>

        </div>
      </main>

      {/* Floating Action Button */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-[#5bf4de] rounded-full text-[#080e1c] shadow-[0_10px_30px_rgba(91,244,222,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all group">
        <span className="material-symbols-outlined text-2xl font-bold group-hover:rotate-90 transition-transform">add</span>
      </button>
    </div>
  );
};

export default Dashboard;