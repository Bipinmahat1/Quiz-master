import React, { useState, useEffect, useCallback } from 'react';

// Main App Component
export default function App() {
    // --- STATE MANAGEMENT ---
    const [category, setCategory] = useState(null); // 'Math', 'Science', 'General Knowledge'
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null); // The option string the user clicked
    const [isCorrect, setIsCorrect] = useState(null); // true, false, or null
    const [showFeedback, setShowFeedback] = useState(false); // Controls visibility of feedback
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [quizFinished, setQuizFinished] = useState(false);

    // --- API CALL TO GEMINI ---
    const fetchQuiz = useCallback(async (selectedCategory) => {
        setIsLoading(true);
        setError(null);
        setCategory(selectedCategory);

        // Prompt for the Gemini API
        const prompt = `Generate 5 unique, multiple-choice questions for a quiz on the topic of ${selectedCategory}. Provide 4 options for each question. Ensure one option is the correct answer. Do not repeat questions.`;

        // JSON schema for the expected response structure
        const schema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    question: { type: "STRING" },
                    options: {
                        type: "ARRAY",
                        items: { type: "STRING" }
                    },
                    correctAnswer: { type: "STRING" }
                },
                required: ["question", "options", "correctAnswer"]
            }
        };

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // Leave empty, will be handled by the environment
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            const payload = {
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: schema
                }
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API call failed with status: ${response.status}`);
            }

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0) {
                const jsonText = result.candidates[0].content.parts[0].text;
                const parsedQuestions = JSON.parse(jsonText);
                // Shuffle options for each question to ensure randomness
                const shuffledQuestions = parsedQuestions.map(q => ({
                    ...q,
                    options: [...q.options].sort(() => Math.random() - 0.5)
                }));
                setQuestions(shuffledQuestions);
            } else {
                throw new Error("No content received from API.");
            }
        } catch (err) {
            console.error("Error fetching quiz data:", err);
            setError("Failed to generate the quiz. Please try a different category or try again later.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // --- EVENT HANDLERS ---
    const handleAnswerClick = (option) => {
        if (showFeedback) return; // Prevent multiple clicks

        const currentQuestion = questions[currentQuestionIndex];
        setSelectedAnswer(option);
        setShowFeedback(true);

        if (option === currentQuestion.correctAnswer) {
            setIsCorrect(true);
            setScore(prevScore => prevScore + 1);
        } else {
            setIsCorrect(false);
        }

        // Wait for 1.5 seconds before moving to the next question or finishing
        setTimeout(() => {
            setShowFeedback(false);
            setSelectedAnswer(null);
            setIsCorrect(null);

            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prevIndex => prevIndex + 1);
            } else {
                setQuizFinished(true);
            }
        }, 1500);
    };

    const handleTryAgain = () => {
        // Reset all state to initial values
        setCategory(null);
        setQuestions([]);
        setCurrentQuestionIndex(0);
        setScore(0);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setShowFeedback(false);
        setQuizFinished(false);
        setError(null);
    };

    // --- UI RENDERING COMPONENTS ---

    const CategorySelector = () => (
        <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Quiz Master Pro</h1>
            <p className="text-lg text-slate-300 mb-8">Select a category to begin!</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button onClick={() => fetchQuiz('Math')} className="category-btn bg-blue-500 hover:bg-blue-600">Math</button>
                <button onClick={() => fetchQuiz('Science')} className="category-btn bg-green-500 hover:bg-green-600">Science</button>
                <button onClick={() => fetchQuiz('General Knowledge')} className="category-btn bg-purple-500 hover:bg-purple-600">General Knowledge</button>
            </div>
        </div>
    );

    const LoadingSpinner = () => (
        <div className="flex flex-col items-center justify-center text-white">
            <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg">Generating your unique quiz...</p>
        </div>
    );

    const ErrorDisplay = ({ message }) => (
        <div className="text-center text-red-400 bg-red-900/50 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Oops! Something went wrong.</h2>
            <p>{message}</p>
            <button onClick={handleTryAgain} className="mt-6 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded-full transition-transform duration-200 hover:scale-105">
                Try Again
            </button>
        </div>
    );

    const ScoreScreen = () => (
        <div className="text-center text-white">
            <h2 className="text-4xl font-bold mb-4">Quiz Complete!</h2>
            <p className="text-2xl mb-6">Your final score is:</p>
            <p className="text-6xl font-bold text-yellow-400 mb-8">{score} / {questions.length}</p>
            <button onClick={handleTryAgain} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform duration-200 hover:scale-105 shadow-lg">
                Try Again
            </button>
        </div>
    );
    
    const QuizInterface = () => {
        if (quizFinished) return <ScoreScreen />;

        const currentQuestion = questions[currentQuestionIndex];
        if (!currentQuestion) return null; // Should not happen if questions array is populated

        return (
            <div>
                {/* Header: Score and Question Number */}
                <div className="flex justify-between items-center mb-6 text-white">
                    <div className="text-lg">Question <span className="font-bold text-2xl text-yellow-400">{currentQuestionIndex + 1}</span>/{questions.length}</div>
                    <div className="text-lg">Score: <span className="font-bold text-2xl text-yellow-400">{score}</span></div>
                </div>

                {/* Question Text */}
                <div className="bg-slate-900/50 p-6 rounded-lg mb-6 min-h-[120px] flex items-center justify-center">
                    <h2 className="text-2xl md:text-3xl text-center font-semibold text-white">{currentQuestion.question}</h2>
                </div>

                {/* Answer Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentQuestion.options.map((option, index) => {
                        const isSelected = selectedAnswer === option;
                        let buttonClass = "answer-btn bg-slate-700 hover:bg-slate-600"; // Default
                        if (showFeedback && isSelected) {
                            buttonClass = isCorrect ? "answer-btn bg-green-500" : "answer-btn bg-red-500";
                        } else if (showFeedback && option === currentQuestion.correctAnswer) {
                            buttonClass = "answer-btn bg-green-500"; // Also highlight the correct one if user was wrong
                        }

                        return (
                            <button
                                key={index}
                                onClick={() => handleAnswerClick(option)}
                                disabled={showFeedback}
                                className={buttonClass}
                            >
                                {option}
                            </button>
                        );
                    })}
                </div>
                 <button onClick={handleTryAgain} className="mt-8 text-slate-400 hover:text-white transition-colors duration-200">
                    End Quiz & Start Over
                </button>
            </div>
        );
    };


    // --- MAIN RENDER LOGIC ---
    return (
      <main className="main-container">
          <div className="quiz-container">
              {isLoading ? <LoadingSpinner /> :
               error ? <ErrorDisplay message={error} /> :
               !category ? <CategorySelector /> :
               <QuizInterface />
              }
          </div>
          <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

    body {
        margin: 0;
        font-family: 'Inter', sans-serif;
        background-color: #0f172a;
    }

    .main-container {
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 2rem;
        background-color: #0f172a;
    }

    .quiz-container {
        width: 100%;
        max-width: 800px;
        background-color: #1e293b;
        padding: 2.5rem;
        border-radius: 24px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
        color: white;
        border: 1px solid #334155;
        text-align: center;
    }

    h1, h2 {
        margin-bottom: 0.5rem;
    }

    .text-center {
        text-align: center;
    }

    .category-btn {
        background-color: #3b82f6;
        color: white;
        font-weight: bold;
        padding: 1rem 2rem;
        margin: 1rem;
        border-radius: 9999px;
        font-size: 1.2rem;
        border: none;
        cursor: pointer;
        transition: transform 0.2s ease-in-out;
    }

    .category-btn:hover {
        transform: scale(1.05);
        background-color: #2563eb;
    }

    .answer-btn {
        background-color: #334155;
        color: white;
        font-size: 1.1rem;
        padding: 1rem 1.5rem;
        border: none;
        border-radius: 12px;
        margin: 0.5rem;
        cursor: pointer;
        width: 100%;
        max-width: 100%;
        transition: background-color 0.2s, transform 0.2s;
    }

    .answer-btn:hover:not(:disabled) {
        background-color: #475569;
        transform: scale(1.03);
    }

    .answer-btn:disabled {
        cursor: not-allowed;
        opacity: 0.85;
    }

    .bg-green-500 {
        background-color: #22c55e !important;
    }

    .bg-red-500 {
        background-color: #ef4444 !important;
    }

    .score-panel {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1.5rem;
        font-size: 1.2rem;
    }

    .score-panel span {
        font-size: 1.5rem;
        color: #facc15;
        font-weight: bold;
    }

    .question-card {
        background-color: #1e293b;
        padding: 1.5rem;
        border-radius: 16px;
        margin-bottom: 1.5rem;
    }

    .question-card h2 {
        font-size: 1.8rem;
        font-weight: 600;
    }

    .grid-options {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
    }

    .end-quiz-btn {
      margin-top: 2rem;
      padding: 0.75rem 2rem;
      background: linear-gradient(to right, #ec4899, #8b5cf6);
      color: white;
      font-size: 1rem;
      font-weight: 600;
      border: none;
      border-radius: 999px;
      cursor: pointer;
      transition: transform 0.2s ease-in-out;
  }
  
  .end-quiz-btn:hover {
      transform: scale(1.05);
      background: linear-gradient(to right, #db2777, #7c3aed);
  }
  
  .retry-btn {
      margin-top: 2rem;
      padding: 0.75rem 2rem;
      background: linear-gradient(to right, #f97316, #facc15);
      color: #1e293b;
      font-weight: bold;
      font-size: 1rem;
      border: none;
      border-radius: 999px;
      cursor: pointer;
      transition: transform 0.2s ease-in-out;
  }
  
  .retry-btn:hover {
      transform: scale(1.05);
      background: linear-gradient(to right, #ea580c, #eab308);
  }
  

    .loading, .error-box {
        text-align: center;
        padding: 2rem;
    }

    .error-box {
        background-color: #7f1d1d;
        border-radius: 12px;
    }

    .error-box button {
        margin-top: 1rem;
        padding: 0.75rem 1.5rem;
        background-color: #facc15;
        border-radius: 999px;
        font-weight: bold;
        border: none;
        cursor: pointer;
    }
`}</style>
      </main>
  );
}