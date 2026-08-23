import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

const TechFlashcards = () => {
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [flipped, setFlipped] = useState(false);
    const [difficulty, setDifficulty] = useState('Beginner');
    const [progress, setProgress] = useState({ history: {}, activeDifficulty: 'Beginner', performanceScore: 0 });

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
            const res = await fetch('/api/cv/tech-questions/progress', { headers });
            if (res.ok) {
                const data = await res.json();
                setProgress(data);
                if (data.activeDifficulty) {
                    setDifficulty(data.activeDifficulty);
                }
            }
        } catch (err) {
            console.error('Error fetching progress:', err);
        }
    };

    const fetchQuestions = async (diff) => {
        setLoading(true);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`/api/cv/tech-questions?difficulty=${diff}`, { headers });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    setQuestions(data);
                    setCurrentIndex(0);
                    setFlipped(false);
                } else {
                    setGenerating(true);
                    const genRes = await fetch('/api/cv/tech-questions/generate', {
                        method: 'POST',
                        headers: {
                            ...headers,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ difficulty: diff })
                    });
                    if (genRes.ok) {
                        const genData = await genRes.json();
                        if (genData.questions) {
                            setQuestions(genData.questions);
                            setCurrentIndex(0);
                            setFlipped(false);
                            await fetchProgress();
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching questions:', err);
        } finally {
            setLoading(false);
            setGenerating(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            await fetchProgress();
        };
        init();
    }, []);

    useEffect(() => {
        fetchQuestions(difficulty);
    }, [difficulty]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/cv/tech-questions/generate', {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ difficulty })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.questions) {
                    setQuestions(data.questions);
                    setCurrentIndex(0);
                    setFlipped(false);
                    await fetchProgress();
                }
            } else {
                alert('Failed to generate questions. Please make sure your CV is uploaded.');
            }
        } catch (err) {
            console.error('Error generating questions:', err);
            alert('Error generating questions. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const handleAssess = async (status) => {
        if (!questions.length) return;
        const currentQ = questions[currentIndex];
        
        // Optimistically update local progress UI state
        const updatedHistory = {
            ...progress.history,
            [currentQ.id]: { status, difficulty, updatedAt: new Date().toISOString() }
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
            await fetch('/api/cv/tech-questions/submit', {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    questionId: currentQ.id,
                    status, // 'correct' or 'incorrect'
                    difficulty
                })
            });
        } catch (err) {
            console.error('Error submitting assessment:', err);
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
        const totalAttempts = Object.keys(progress.history).length;
        if (totalAttempts < 3) return 'Practice at least 3 questions to get recommendations.';
        if (score >= 80) {
            if (difficulty === 'Beginner') return 'Outstanding! Ready to step up to Intermediate difficulty.';
            if (difficulty === 'Intermediate') return 'Great job! Ready to practice Advanced level concepts.';
            if (difficulty === 'Advanced') return 'Superb! Try Expert tier scenarios to test deep competency.';
            return 'Master level! Keep polishing or start a mock simulation to practice live.';
        }
        if (score < 50) {
            if (difficulty === 'Expert') return 'Expert is highly advanced. Consider reinforcing Advanced concepts first.';
            if (difficulty === 'Advanced') return 'Advanced involves complex scenarios. Consider practicing Intermediate first.';
            if (difficulty === 'Intermediate') return 'Consider reviewing Beginner terminology and fundamentals.';
            return 'Keep practicing! Review recommended strategies carefully.';
        }
        return 'Solid work. Keep practicing to push your performance score above 80%.';
    };

    const difficultyTiers = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

    return (
        <div className="flex flex-col items-center justify-center p-4 max-w-4xl mx-auto">
            {/* Difficulty Tabs */}
            <div className="flex items-center gap-2 mb-8 bg-[#12192a] border border-[#424858]/30 p-1.5 rounded-full">
                {difficultyTiers.map((tier) => (
                    <button
                        key={tier}
                        onClick={() => setDifficulty(tier)}
                        className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                            difficulty === tier
                                ? 'bg-[#5bf4de] text-[#080e1c] shadow-lg shadow-[#5bf4de]/10'
                                : 'text-[#a5abbd] hover:text-white'
                        }`}
                    >
                        {tier}
                    </button>
                ))}
            </div>

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

            {loading || generating ? (
                <div className="text-center mt-10 text-[#5bf4de] animate-pulse font-bold tracking-wider flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
                    <span>Analyzing CV & Generating Personalized {difficulty} Questions...</span>
                </div>
            ) : questions.length === 0 ? (
                <div className="w-full max-w-lg bg-[#12192a] border border-[#424858]/30 rounded-2xl p-8 text-center shadow-2xl flex flex-col items-center justify-center min-h-[300px]">
                    <span className="material-symbols-outlined text-[#5bf4de] text-5xl mb-4 animate-bounce">
                        psychology
                    </span>
                    <h3 className="text-lg font-bold text-white mb-2">
                        No {difficulty} Questions Cached
                    </h3>
                    <p className="text-sm text-[#a5abbd] mb-6 max-w-sm">
                        Generate personalized technical questions tailored to your CV profile, skills, and target profession.
                    </p>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="px-8 py-3 bg-[#5bf4de] text-[#080e1c] rounded-full font-black uppercase tracking-tighter shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {generating ? 'Generating Technical Questions...' : 'Generate Questions'}
                    </button>
                </div>
            ) : (
                <>
                    <div className="mb-6 text-[#a5abbd] text-sm font-bold uppercase tracking-widest flex items-center justify-between w-full max-w-lg px-2">
                        <span>Question {currentIndex + 1} of {questions.length}</span>
                        <button 
                            onClick={handleGenerate} 
                            disabled={generating}
                            className="text-xs text-[#5bf4de] hover:underline uppercase font-black tracking-wider flex items-center gap-1 disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-xs">sync</span>
                            {generating ? 'Regenerating...' : 'Regenerate'}
                        </button>
                    </div>

                    <div className="w-full max-w-lg h-80 perspective-1000 cursor-pointer" onClick={() => setFlipped(!flipped)}>
                        <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${flipped ? 'rotate-y-180' : ''}`}>
                            {/* Front Side */}
                            <div className="absolute w-full h-full backface-hidden bg-[#12192a] border border-[#424858]/30 rounded-2xl p-8 flex flex-col justify-center items-center text-center shadow-2xl">
                                <span className="text-[#5bf4de] text-[10px] font-black uppercase tracking-widest mb-4 bg-[#5bf4de]/10 px-3 py-1 rounded-full">
                                    {questions[currentIndex].category || "Technical Concept"}
                                </span>
                                <h3 className="text-xl font-bold text-white leading-tight">
                                    {questions[currentIndex].question}
                                </h3>
                                <p className="mt-8 text-xs text-[#a5abbd] animate-bounce">Click to flip & learn strategy</p>
                            </div>

                            {/* Back Side */}
                            <div className="absolute w-full h-full backface-hidden bg-[#1c2a41] border border-[#5bf4de]/30 rounded-2xl p-8 flex flex-col justify-between rotate-y-180 shadow-2xl shadow-[#5bf4de]/5">
                                <div className="flex-1 overflow-y-auto pr-1">
                                    <h4 className="text-[#5bf4de] text-xs font-black uppercase mb-3 text-center border-b border-[#5bf4de]/15 pb-2">
                                        Recommended Strategy & Solution:
                                    </h4>
                                    <p className="text-[#e0e5f9] text-sm leading-relaxed text-left whitespace-pre-wrap font-sans">
                                        {questions[currentIndex].answer}
                                    </p>
                                </div>
                                <div className="mt-4 pt-3 border-t border-[#424858]/30 flex items-center justify-center gap-4 text-xs font-black uppercase tracking-wider text-[#a5abbd]" onClick={(e) => e.stopPropagation()}>
                                    Self-Assess:
                                    <button 
                                        onClick={() => handleAssess('correct')}
                                        className={`px-4 py-1.5 rounded-full border transition-all ${
                                            progress.history[questions[currentIndex].id]?.status === 'correct'
                                                ? 'bg-[#5bf4de]/25 border-[#5bf4de] text-[#5bf4de]'
                                                : 'border-[#424858]/50 text-[#a5abbd] hover:text-[#5bf4de] hover:border-[#5bf4de]'
                                        }`}
                                    >
                                        Got it Right
                                    </button>
                                    <button 
                                        onClick={() => handleAssess('incorrect')}
                                        className={`px-4 py-1.5 rounded-full border transition-all ${
                                            progress.history[questions[currentIndex].id]?.status === 'incorrect'
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
                </>
            )}
        </div>
    );
};

export default TechFlashcards;
