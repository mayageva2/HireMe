import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

const HRFlashcards = () => {
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [flipped, setFlipped] = useState(false);
    const [progress, setProgress] = useState({ history: {}, performanceScore: 0 });

    const getAuthHeaders = async () => {
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();
            return token ? { Authorization: `Bearer ${token}` } : {};
        } catch (err) {
            console.warn('Could not resolve auth session:', err);
            return {};
        }
    };

    const fetchProgress = async () => {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/cv/hr-questions/progress', { headers });
            if (res.ok) {
                const data = await res.json();
                setProgress({
                    history: {},
                    performanceScore: 0,
                    ...data
                });
            }
        } catch (err) {
            console.error('Error fetching progress:', err);
        }
    };

    useEffect(() => {
        const URL =
            import.meta.env.VITE_HR_FLASHCARDS_URL ||
            'https://id3damfismgqoirfaedeymaqfi0yueim.lambda-url.us-east-1.on.aws/';

        const loadData = async () => {
            try {
                const res = await fetch(URL);
                const data = await res.json();
                setQuestions(data);
                await fetchProgress();
            } catch (err) {
                console.error("Error fetching questions:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const handleAssess = async (status) => {
        if (!questions.length) return;
        const currentQ = questions[currentIndex];
        
        // Optimistically update local progress UI state
        const updatedHistory = {
            ...(progress?.history || {}),
            [currentQ.id]: { status, updatedAt: new Date().toISOString() }
        };
        const historyVals = Object.values(updatedHistory);
        const correctCount = historyVals.filter(h => h.status === 'correct').length;
        const score = historyVals.length > 0 ? Math.round((correctCount / historyVals.length) * 100) : 0;
        
        setProgress(prev => ({
            ...prev,
            history: updatedHistory,
            performanceScore: score
        }));

        try {
            const headers = await getAuthHeaders();
            await fetch('/api/cv/hr-questions/submit', {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    questionId: currentQ.id,
                    status // 'correct' or 'incorrect'
                })
            });
        } catch (err) {
            console.error('Error submitting HR assessment:', err);
        }
    };

    const nextQuestion = () => {
        setFlipped(false); 
        setTimeout(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % questions.length);
        }, 150); 
    };

    const prevQuestion = () => {
        setFlipped(false);
        setTimeout(() => {
            setCurrentIndex((prevIndex) => (prevIndex - 1 + questions.length) % questions.length);
        }, 150);
    };

    const getRecommendation = () => {
        const score = progress.performanceScore;
        const totalAttempts = Object.keys(progress?.history || {}).length;
        if (totalAttempts < 3) return 'Practice at least 3 behavioral questions to get recommendations.';
        if (score >= 80) {
            return 'Excellent behavioral strategy! You are ready to handle typical HR screening questions.';
        }
        if (score < 50) {
            return 'Behavioral communication needs polish. Try structuring responses with the STAR method (Situation, Task, Action, Result).';
        }
        return 'Good progress. Try to elaborate more on your achievements and team cooperation.';
    };

    if (loading) return <div className="text-center mt-10 text-[#5bf4de] animate-pulse font-bold tracking-wider">Loading HR Questions...</div>;
    if (questions.length === 0) return <div className="text-center mt-10 text-white">No questions found.</div>;

    const currentQ = questions[currentIndex];

    return (
        <div className="flex flex-col items-center justify-center p-4 max-w-4xl mx-auto">
            {/* Performance Analytics Dashboard bar */}
            <div className="w-full max-w-lg mb-8 bg-[#12192a] border border-[#424858]/20 p-4 rounded-xl flex items-center justify-between gap-6 shadow-md">
                <div className="flex-1">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1.5">
                        <span className="text-[#a5abbd]">Performance Score</span>
                        <span className="text-[#5bf4de]">{progress.performanceScore}%</span>
                    </div>
                    <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-[#5bf4de] transition-all duration-500" 
                            style={{ width: `${progress.performanceScore}%` }}
                        ></div>
                    </div>
                </div>
                <div className="text-[10px] font-bold text-[#a5abbd] max-w-[200px] border-l border-[#424858]/30 pl-4 leading-relaxed">
                    {getRecommendation()}
                </div>
            </div>

            <div className="mb-6 text-[#a5abbd] text-sm font-bold uppercase tracking-widest">
                Question {currentIndex + 1} of {questions.length}
            </div>

            <div className="w-full max-w-lg h-80 perspective-1000 cursor-pointer" onClick={() => setFlipped(!flipped)}>
                <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${flipped ? 'rotate-y-180' : ''}`}>
                    {/* Front Side */}
                    <div className="absolute w-full h-full backface-hidden bg-[#12192a] border border-[#424858]/30 rounded-2xl p-8 flex flex-col justify-center items-center text-center shadow-2xl">
                        <span className="text-[#5bf4de] text-[10px] font-black uppercase tracking-widest mb-4 bg-[#5bf4de]/10 px-3 py-1 rounded-full">
                            {currentQ.category || "General"}
                        </span>
                        <h3 className="text-xl font-bold text-white leading-tight">
                            {currentQ.question}
                        </h3>
                        <p className="mt-8 text-xs text-[#a5abbd] animate-bounce">Click to flip & learn strategy</p>
                    </div>

                    {/* Back Side */}
                    <div className="absolute w-full h-full backface-hidden bg-[#1c2a41] border border-[#5bf4de]/30 rounded-2xl p-8 flex flex-col justify-between rotate-y-180 shadow-2xl shadow-[#5bf4de]/5">
                        <div className="flex-1 overflow-y-auto pr-1">
                            <h4 className="text-[#5bf4de] text-xs font-black uppercase mb-3 text-center border-b border-[#5bf4de]/15 pb-2">
                                Recommended Strategy:
                            </h4>
                            <p className="text-[#e0e5f9] text-sm leading-relaxed text-left whitespace-pre-wrap font-sans">
                                {currentQ.answer}
                            </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-[#424858]/30 flex items-center justify-center gap-4 text-xs font-black uppercase tracking-wider text-[#a5abbd]" onClick={(e) => e.stopPropagation()}>
                            Self-Assess:
                            <button 
                                onClick={() => handleAssess('correct')}
                                className={`px-4 py-1.5 rounded-full border transition-all ${
                                    progress.history[currentQ.id]?.status === 'correct'
                                        ? 'bg-[#5bf4de]/25 border-[#5bf4de] text-[#5bf4de]'
                                        : 'border-[#424858]/50 text-[#a5abbd] hover:text-[#5bf4de] hover:border-[#5bf4de]'
                                }`}
                            >
                                Got it Right
                            </button>
                            <button 
                                onClick={() => handleAssess('incorrect')}
                                className={`px-4 py-1.5 rounded-full border transition-all ${
                                    progress.history[currentQ.id]?.status === 'incorrect'
                                        ? 'bg-red-500/20 border-red-500 text-red-400'
                                        : 'border-[#424858]/50 text-[#a5abbd] hover:text-red-400 hover:border-red-500'
                                }`}
                            >
                                Needs Practice
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-8 mt-10">
                <button 
                    onClick={prevQuestion}
                    className="flex items-center justify-center w-12 h-12 rounded-full border border-[#424858]/40 text-[#a5abbd] hover:text-[#5bf4de] hover:border-[#5bf4de] transition-all"
                >
                    <span className="material-symbols-outlined text-3xl">chevron_left</span>
                </button>

                <button 
                    onClick={nextQuestion}
                    className="px-10 py-3 bg-[#5bf4de] text-[#080e1c] rounded-full font-black uppercase tracking-tighter shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                    Next Question
                </button>

                <button 
                    onClick={nextQuestion}
                    className="flex items-center justify-center w-12 h-12 rounded-full border border-[#424858]/40 text-[#a5abbd] hover:text-[#5bf4de] hover:border-[#5bf4de] transition-all"
                >
                    <span className="material-symbols-outlined text-3xl">chevron_right</span>
                </button>
            </div>
        </div>
    );
};

export default HRFlashcards;