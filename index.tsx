
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Moon, 
  Sun, 
  History, 
  TrendingUp, 
  AlertCircle, 
  X, 
  Cpu, 
  Zap,
  Award,
  Trash2,
  RotateCcw
} from 'lucide-react';

// --- AI Configuration ---
// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Model schema for structured output
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    confidence: { 
      type: Type.INTEGER, 
      description: "Confidence score from 0 to 100 based on pattern strength." 
    },
    recommended_horses: { 
      type: Type.ARRAY, 
      items: { type: Type.INTEGER }, 
      description: "Exactly 3 recommended horses to bet on." 
    },
    reasoning: { 
      type: Type.STRING, 
      description: "Short explanation of why these horses were chosen (trends, missing, frequency)." 
    }
  },
  required: ["confidence", "recommended_horses", "reasoning"],
};

// --- Types ---

interface Prediction {
  confidence: number;
  recommended_horses: number[];
  reasoning: string;
}

interface HistoryItem {
  id: number;
  horse: number;
  timestamp: Date;
}

// --- Main Component ---

const App = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  // Card tilt ref
  const cardRef = useRef<HTMLDivElement>(null);

  // Toggle Theme
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (darkMode) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  // Initialize Theme
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // --- AI Analysis Logic ---
  const analyzeData = async (currentHistory: HistoryItem[]) => {
    // Immediately start thinking mode
    setLoading(true);
    
    if (currentHistory.length < 3) {
      // Just a small delay to simulate processing if not enough data yet
      setTimeout(() => setLoading(false), 500);
      return; 
    }

    try {
      const recentWinners = currentHistory.slice(0, 20).map(h => h.horse).reverse(); // Last 20 winners
      
      const prompt = `
        Você é um sistema especialista em apostas de corrida de cavalos para o jogo "Evolution Race Track".
        
        DADOS RECENTES (Ordem do mais antigo para o mais recente): 
        [${recentWinners.join(', ')}]
        
        OBJETIVO:
        Identificar a probabilidade dos próximos vencedores.
        Temos interesse ESPECIAL nos cavalos 3, 4, 5 e 6.
        
        LÓGICA DE ANÁLISE:
        1. Frequência: Quais cavalos estão saindo muito?
        2. Ausência: Existe algum cavalo (especialmente 3,4,5,6) que não sai há muito tempo (teoria do atraso)?
        3. Padrões: Sequências repetidas (ex: 1-3-1).
        
        REGRAS:
        - Indique 3 cavalos.
        - A confiança deve ser baseada estatisticamente.
        - Se a confiança for < 75%, seja honesto.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
          temperature: 0.2, // Low temperature for more analytical/consistent results
        }
      });

      const result = JSON.parse(response.text) as Prediction;
      
      // Filter logic: Only show modal if confidence >= 75
      if (result.confidence >= 75) {
        setPrediction(result);
        setShowModal(true);
      } else {
        console.log("Confiança baixa:", result.confidence);
        setPrediction(null);
        setShowModal(false);
      }

    } catch (error) {
      console.error("Erro na análise da IA:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle User Input (Adding a winner)
  const handleAddWinner = (horseNumber: number) => {
    const newItem: HistoryItem = {
      id: Date.now(),
      horse: horseNumber,
      timestamp: new Date(),
    };
    
    const newHistory = [newItem, ...history];
    setHistory(newHistory);
    
    // Trigger AI analysis automatically immediately
    analyzeData(newHistory);
  };

  // Handle Undo (Remove last entry)
  const handleUndo = () => {
    if (history.length === 0) return;
    const newHistory = history.slice(1); // Removes the first element (newest)
    setHistory(newHistory);
    
    // Re-analyze if there is still data, otherwise stop loading
    if (newHistory.length >= 3) {
      analyzeData(newHistory);
    } else {
      setLoading(false);
      setPrediction(null);
    }
  };

  // Handle Clear All
  const handleClearHistory = () => {
    if (window.confirm("Tem certeza que deseja apagar todo o histórico?")) {
      setHistory([]);
      setPrediction(null);
      setShowModal(false);
      setLoading(false);
    }
  };

  // Handle 3D Tilt Effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -10; // Max 10deg rotation
    const rotateY = ((x - centerX) / centerX) * 10;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setPrediction(null);
  };

  // Horse Colors for UI - UPDATED MAPPING
  // 1-Vermelho, 2-Branco, 3-Azul, 4-Amarelo, 5-Verde, 6-Preto
  const getHorseStyles = (num: number) => {
    switch (num) {
      case 1:
        return 'bg-red-600 text-white border-red-700'; // Vermelho
      case 2:
        return 'bg-white text-black border-gray-300'; // Branco
      case 3:
        return 'bg-blue-600 text-white border-blue-700'; // Azul
      case 4:
        return 'bg-yellow-400 text-black border-yellow-500'; // Amarelo
      case 5:
        return 'bg-green-600 text-white border-green-700'; // Verde
      case 6:
        return 'bg-black text-white border-gray-700 ring-1 ring-white/20'; // Preto
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className={`min-h-screen flex flex-col relative overflow-hidden ${darkMode ? 'dark' : ''}`}>
      
      {/* --- Video Background --- */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute w-full h-full object-cover"
          src="https://cdn.pixabay.com/video/2019/11/15/29078-374013301_large.mp4"
        />
        {/* Overlay to ensure readability of content over video */}
        <div className="absolute inset-0 bg-gray-100/90 dark:bg-gray-900/85 backdrop-blur-sm transition-colors duration-500" />
      </div>

      {/* --- Header --- */}
      <header className="p-4 flex justify-between items-center glass-panel z-10 sticky top-0 border-b border-white/10 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-neon-purple to-neon-blue rounded-lg flex items-center justify-center shadow-lg shadow-neon-purple/30">
            <Cpu className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-neon-purple to-neon-blue uppercase">
            AI RACE TRACK
          </h1>
        </div>
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md"
        >
          {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-800" />}
        </button>
      </header>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 w-full max-w-2xl mx-auto relative z-10">
        
        {/* Status Indicator */}
        <div className="mb-8 flex flex-col items-center justify-center h-12">
          {loading ? (
            <div className="flex items-center gap-2 text-neon-blue animate-pulse bg-black/20 px-4 py-2 rounded-full backdrop-blur-md">
              <Cpu className="w-5 h-5 animate-spin-slow" />
              <span className="text-sm font-mono uppercase tracking-widest font-bold">Analisando Padrões...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 bg-white/30 dark:bg-black/30 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
              <Zap className="w-5 h-5" />
              <span className="text-sm font-mono uppercase tracking-widest font-bold">Aguardando Entrada</span>
            </div>
          )}
        </div>

        {/* Central Input Grid (The "Square") - WITH FLOAT ANIMATION */}
        <div className="animate-float w-full bg-white/60 dark:bg-black/50 rounded-3xl p-6 shadow-2xl border border-white/40 dark:border-white/10 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/5">
          <h2 className="text-center text-gray-600 dark:text-gray-300 mb-6 text-sm font-bold uppercase tracking-widest">
            Insira o Vencedor
          </h2>
          
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <button
                key={num}
                onClick={() => handleAddWinner(num)}
                disabled={loading}
                className={`
                  aspect-square rounded-2xl text-3xl font-black transition-all duration-200
                  shadow-lg hover:shadow-neon-purple/50 hover:scale-105 active:scale-95
                  flex items-center justify-center border-b-4
                  ${getHorseStyles(num)}
                  ${loading ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                `}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* History Strip */}
        <div className="w-full mt-8 bg-white/30 dark:bg-black/30 p-4 rounded-2xl backdrop-blur-md border border-white/10">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <History className="w-4 h-4" />
              <span className="text-xs uppercase font-extrabold tracking-wider">Histórico</span>
            </div>
            <div className="flex gap-2">
               <button 
                onClick={handleUndo}
                disabled={history.length === 0 || loading}
                className="p-1.5 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors disabled:opacity-30 text-gray-600 dark:text-gray-300"
                title="Desfazer último"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button 
                onClick={handleClearHistory}
                disabled={history.length === 0 || loading}
                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-30 text-red-600 dark:text-red-400"
                title="Apagar tudo"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 mask-linear">
            {history.length === 0 && <span className="text-xs text-gray-500 italic w-full text-center py-2">Aguardando dados...</span>}
            {history.map((item, idx) => (
              <div 
                key={item.id} 
                className={`
                  min-w-[40px] h-[40px] rounded-xl flex items-center justify-center font-bold text-sm shadow-md border-b-2
                  ${getHorseStyles(item.horse)}
                  ${idx === 0 ? 'ring-2 ring-offset-2 ring-neon-green dark:ring-offset-gray-900 scale-110' : 'opacity-80 scale-95'}
                `}
              >
                {item.horse}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* --- 3D Prediction Modal Overlay --- */}
      {showModal && prediction && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg transition-opacity duration-300"
          onClick={closeModal}
        >
          <div className="perspective-container w-full max-w-sm animate-in fade-in zoom-in duration-500">
            <div 
              ref={cardRef}
              className="card-3d relative w-full bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border-2 border-neon-green shadow-[0_0_100px_rgba(0,255,157,0.4)]"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Background Effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 dark:from-gray-800 dark:via-gray-900 dark:to-black z-0"></div>
              <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] z-0"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-green to-transparent"></div>
              
              {/* Content */}
              <div className="relative z-10 p-8 flex flex-col items-center text-center">
                
                {/* Header: Close & Title */}
                <button 
                  onClick={() => {
                    closeModal();
                  }}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/5 hover:bg-red-500 hover:text-white transition-colors group dark:text-white text-gray-800"
                  aria-label="Fechar oportunidade"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-20 h-20 rounded-full bg-gradient-to-b from-neon-green to-emerald-800 flex items-center justify-center shadow-lg shadow-green-500/30 mb-4 animate-float ring-4 ring-neon-green/20">
                  <Award className="w-10 h-10 text-white" />
                </div>

                <h2 className="text-3xl font-black uppercase tracking-tighter italic mb-1 text-gray-800 dark:text-white drop-shadow-sm">
                  OPORTUNIDADE
                </h2>
                <div className="inline-flex items-center gap-2 bg-neon-green/10 px-3 py-1 rounded-full border border-neon-green/30 mb-6">
                  <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse"></div>
                  <p className="text-xs font-mono text-neon-green font-bold uppercase tracking-widest">
                    Confiança: {prediction.confidence}%
                  </p>
                </div>

                {/* Recommended Horses Grid */}
                <div className="grid grid-cols-3 gap-4 w-full mb-6">
                  {prediction.recommended_horses.map((horse) => (
                    <div key={horse} className="flex flex-col items-center group">
                      <div className={`
                        w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black shadow-xl
                        transform transition-transform group-hover:scale-110 duration-200
                        ${getHorseStyles(horse)}
                        ring-2 ring-white/40 border-b-4
                      `}>
                        {horse}
                      </div>
                      <span className="text-[10px] mt-2 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Cavalo {horse}</span>
                    </div>
                  ))}
                </div>

                {/* Reasoning / Analysis */}
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 w-full mb-4 text-left border border-gray-200 dark:border-white/10 shadow-inner">
                  <div className="flex items-center gap-2 mb-2 text-neon-purple">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-extrabold uppercase tracking-wider">Análise Lógica</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                    {prediction.reasoning}
                  </p>
                </div>

                {/* Footer Instruction */}
                <div className="text-center mt-2 border-t border-gray-200 dark:border-white/10 pt-4 w-full">
                  <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1 font-semibold uppercase">
                    <AlertCircle className="w-3 h-3" />
                    Toque fora para dispensar
                  </p>
                  <p className="text-[9px] text-gray-400/70 mt-1">
                    Novo alerta apenas em alta probabilidade
                  </p>
                </div>
                
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
