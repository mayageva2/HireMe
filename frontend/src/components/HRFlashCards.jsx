import React, { useState, useEffect } from 'react';

const HRFlashcards = () => {
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [flipped, setFlipped] = useState(false);

    useEffect(() => {
        fetch('/api/hr-flashcards')
            .then(res => res.json())
            .then(data => {
                setQuestions(data);
                setLoading(false);
            })
            .catch(err => console.error("Error fetching questions:", err));
    }, []);

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

    if (loading) return <div className="text-center mt-10 text-[#5bf4de] animate-pulse">Loading HR Questions...</div>;
    if (questions.length === 0) return <div className="text-center mt-10 text-white">No questions found.</div>;

    const currentQ = questions[currentIndex];

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className="mb-6 text-[#a5abbd] text-sm font-bold uppercase tracking-widest">
                Question {currentIndex + 1} of {questions.length}
            </div>

            <div className="w-full max-w-lg h-80 perspective-1000" onClick={() => setFlipped(!flipped)}>
                <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${flipped ? 'rotate-y-180' : ''}`}>
                    
                    <div className="absolute w-full h-full backface-hidden bg-[#12192a] border border-[#424858]/30 rounded-2xl p-8 flex flex-col justify-center items-center text-center shadow-2xl">
                        <span className="text-[#5bf4de] text-[10px] font-black uppercase tracking-widest mb-4 bg-[#5bf4de]/10 px-3 py-1 rounded-full">
                            {currentQ.category || "General"}
                        </span>
                        <h3 className="text-xl font-bold text-white leading-tight">
                            {currentQ.question}
                        </h3>
                        <p className="mt-8 text-xs text-[#a5abbd] animate-bounce">Click to flip</p>
                    </div>

                    <div className="absolute w-full h-full backface-hidden bg-[#1c2a41] border border-[#5bf4de]/30 rounded-2xl p-8 flex flex-col justify-center items-center text-center rotate-y-180 shadow-2xl shadow-[#5bf4de]/5">
                        <h4 className="text-[#5bf4de] text-xs font-black uppercase mb-4">Recommended Strategy:</h4>
                        <p className="text-[#e0e5f9] text-sm leading-relaxed overflow-y-auto">
                            {currentQ.answer}
                        </p>
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