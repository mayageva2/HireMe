import React from 'react';

const Dashboard = ({ user, onStartInterview }) => {
  // Use mock data - fix later!!
  const mockUser = {
    fullName: "Alex Rivera",
    profession: "Senior Product Designer Path",
    stats: { interviews: 12, offers: 4, score: 8.5 }
  };

  return (
    <div className="min-h-screen bg-[#041329] text-[#d6e3ff] font-manrope flex flex-col">
      {/* Header */}
      <header className="bg-[#041329] text-[#46eedd] fixed top-0 w-full z-50 shadow-[0_40px_40px_-15px_rgba(1,14,36,0.06)]">
        <div className="flex justify-between items-center w-full px-6 py-4 mx-auto bg-[#0d1c32] border-b border-[#3b4a47]/10">
          <div className="flex items-center gap-8">
            <span className="text-2xl font-black tracking-tight">HireMe</span>
            <h1 className="text-on-surface text-lg font-semibold">Hello, {mockUser.fullName}</h1>
          </div>
          <div className="flex items-center gap-6 flex-1 justify-end">
            {/* Search Input */}
            <div className="relative w-full max-md:hidden max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input className="w-full bg-[#010e24] border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-[#46eedd] text-on-surface" placeholder="Search resources..." type="text"/>
            </div>
            {/* User Dropdown */}
            <div className="flex items-center gap-3 pl-4 border-l border-[#3b4a47]/20 cursor-pointer hover:bg-[#2c3951] p-1 rounded-lg">
              <img alt="User profile" className="w-8 h-8 rounded-full object-cover" src="https://ui-avatars.com/api/?name=User&background=00d1c1&color=fff"/>
              <span className="text-sm font-bold text-on-surface hidden sm:inline">{mockUser.fullName}</span>
              <span className="material-symbols-outlined text-xs">keyboard_arrow_down</span>
            </div>
          </div>
        </div>

        {/* Horizontal Toolbar */}
        <div className="bg-[#112036] px-6 py-2 flex items-center justify-between border-b border-[#3b4a47]/10 overflow-x-auto">
          <nav className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-[#1c2a41] text-[#46eedd] rounded-lg shadow-[0_0_10px_rgba(74,225,131,0.2)] text-xs font-bold uppercase tracking-wider transition-all">
              <span className="material-symbols-outlined text-lg">dashboard</span>
              Dashboard
            </button>
            {['CV Builder', 'Practice Question', 'AI Simulation'].map(item => (
                <button key={item} className="flex items-center gap-2 px-4 py-2 text-[#bacac6] hover:bg-[#2c3951] hover:text-white rounded-lg transition-all text-xs font-bold uppercase tracking-wider">
                  {item}
                </button>
            ))}
          </nav>
          <button className="px-4 py-2 bg-gradient-to-r from-[#46eedd] to-[#00d1c1] text-[#00201d] font-bold text-[10px] rounded-lg active:scale-95 transition-transform uppercase tracking-tighter">Upgrade to Pro</button>
        </div>
      </header>

      <div className="flex flex-1 pt-[116px] overflow-hidden"> 
        <main className="flex-1 overflow-y-auto bg-[#041329] p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 border-b border-[#3b4a47]/10 pb-6">
              
              {/* Profile Card */}
              <div className="lg:col-span-4 bg-[#1c2a41] rounded-xl p-6 glow-primary border border-[#3b4a47]/10 flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <img alt="Portrait" className="w-32 h-32 rounded-xl object-cover border-2 border-[#46eedd]/20" src="https://ui-avatars.com/api/?size=128&name=User"/>
                  <div className="absolute -bottom-2 -right-2 bg-[#4ae183] text-[#00210c] px-2 py-1 rounded text-[10px] font-bold">VERIFIED</div>
                </div>
                <h2 className="text-xl font-bold text-on-surface">{mockUser.fullName}</h2>
                <p className="text-on-surface-variant text-sm mb-6">{mockUser.profession}</p>
                
                {/* Profile Completion Bar */}
                <div className="w-full space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="text-on-surface-variant">Profile Completion</span>
                    <span className="text-[#4ae183]">82%</span>
                  </div>
                  <div className="h-2 bg-[#27354c] rounded-full overflow-hidden">
                    <div className="h-full bg-[#4ae183]" style={{ width: '82%' }}></div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 w-full mt-8">
                  <div className="text-center"><p className="text-lg font-bold text-primary">{mockUser.stats.interviews}</p><p className="text-[10px] text-on-surface-variant uppercase">Interviews</p></div>
                  <div className="text-center border-x border-[#3b4a47]/20"><p className="text-lg font-bold text-primary">04</p><p className="text-[10px] text-on-surface-variant uppercase">Offers</p></div>
                  <div className="text-center"><p className="text-lg font-bold text-primary">{mockUser.stats.score}</p><p className="text-[10px] text-on-surface-variant uppercase">Avg Score</p></div>
                </div>
              </div>

              {/* Performance Analytics */}
              <div className="lg:col-span-8 bg-[#1c2a41] rounded-xl p-6 border border-[#3b4a47]/10">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-on-surface">Performance Analytics</h3>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-[#2c3951] text-xs rounded-full text-on-surface border border-[#3b4a47]/20">Weekly</button>
                    <button className="px-3 py-1 text-xs rounded-full text-on-surface-variant">Monthly</button>
                  </div>
                </div>
                {/* SVG/Skill Breakdown Containers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-64 border border-[#3b4a47]/20 rounded-lg flex items-center justify-center text-xs text-on-surface-variant">
                  [RESTORING GRAPH & SKILLS...]
                </div>
              </div>
            </div>

            {/* Question Bank and CV Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8 text-xs text-on-surface-variant h-40 border border-[#3b4a47]/20 rounded-lg flex items-center justify-center">
              [RESTORING BOTTOM ROW...]
            </div>
          </div>
        </main>
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-tr from-[#46eedd] to-[#00d1c1] rounded-full shadow-[0_10px_30px_rgba(70,238,221,0.4)] flex items-center justify-center text-[#00201d] hover:scale-110 active:scale-90 transition-transform">
        <span className="material-symbols-outlined text-3xl font-bold">add</span>
      </button>
    </div>
  );
};

export default Dashboard;