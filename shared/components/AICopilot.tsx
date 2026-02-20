
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Loader2, Bot, ArrowRight, Maximize2, Minimize2, Terminal, Activity, Search, Link2, Navigation, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { useAgentContext } from '../../features/agent-workspace/context/AgentContext';
import { useAuth } from '../../context/AuthContext';

const SYSTEM_INSTRUCTION = `
You are the "PolicyHQ Copilot." Your purpose is to act as an intelligent navigation layer for the Elite One Financial portal.

OPERATING PRINCIPLES:
1. NAVIGATION: You help users find pages. Use the "navigateTo" tool whenever a user asks to see policies, commissions, debts, tickets, or downlines.
2. CONCISE: Be brief and professional. 
3. KNOWLEDGE: You know the app has sections for: 
   - Dashboard/Leaderboard (/)
   - Policies (/policies)
   - Downlines (/downlines)
   - Splits (/splits)
   - Commissions (/commissions)
   - Debt Recovery (/debts)
   - Support Tickets (/tickets)
   - Agency Management (/management) - only for agency admins.

If a user asks for data you don't have, politely explain that you are currently a navigation assistant.
`;

interface ChatMessage {
  role: 'user' | 'model';
  parts: any[];
  displayText?: string;
}

export const AICopilot: React.FC = () => {
  const { currentAgentId, viewingAgentName } = useAgentContext();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusLog, setStatusLog] = useState<string[]>([]);
  
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const addToLog = (msg: string) => {
    setStatusLog(prev => [...prev.slice(-3), `> ${msg}`]);
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, statusLog]);

  // --- TOOL EXECUTION ---
  const executeTool = async (name: string, args: any) => {
    addToLog(`NAVIGATING TO: ${args.path.toUpperCase()}`);
    
    if (name === 'navigateTo') {
      navigate(args.path);
      return { status: 'SUCCESS', target: args.path };
    }

    return { error: 'UNKNOWN_TOOL' };
  };

  const handleCommand = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setStatusLog(['> ANALYZING INTENT...']);
    
    const initialUserMessage: ChatMessage = { 
      role: 'user', 
      parts: [{ text: userText }],
      displayText: userText 
    };
    
    setMessages(prev => [...prev, initialUserMessage]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const localTools: FunctionDeclaration[] = [
        {
          name: 'navigateTo',
          description: 'Navigate to internal portal pages like /policies, /commissions, /debts, /tickets, /downlines, /splits.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              path: { type: Type.STRING, description: 'The absolute path to navigate to (e.g., /policies, /commissions, /).' }
            },
            required: ['path']
          }
        }
      ];

      const config = {
        systemInstruction: SYSTEM_INSTRUCTION + `\nUSER_CONTEXT: ${user?.name}\nAGENT_CONTEXT: ${viewingAgentName} (${currentAgentId})`,
        tools: [{ functionDeclarations: localTools }]
      };

      const history = [...messages, initialUserMessage];
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: history.map(m => ({ role: m.role, parts: m.parts })),
        config
      });

      const modelParts = response.candidates[0].content.parts;
      const fCalls = response.functionCalls;

      if (fCalls && fCalls.length > 0) {
        const results = [];
        for (const call of fCalls) {
          const data = await executeTool(call.name, call.args);
          results.push({
            functionResponse: { id: call.id, name: call.name, response: { result: data } }
          });
        }

        addToLog("SYNTHESIZING VIEW...");

        const midHistory = [
          ...history,
          { role: 'model' as const, parts: modelParts },
          { role: 'user' as const, parts: results }
        ];

        const finalResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: midHistory.map(m => ({ role: m.role, parts: m.parts })),
          config
        });

        setMessages([...midHistory, { 
          role: 'model', 
          parts: finalResponse.candidates[0].content.parts, 
          displayText: finalResponse.text 
        }]);
      } else {
        setMessages([...history, { 
          role: 'model', 
          parts: modelParts, 
          displayText: response.text 
        }]);
      }
    } catch (error) {
      console.error("Copilot Error:", error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        parts: [{ text: "ERR" }], 
        displayText: "CONNECTION_ERROR: The copilot is having trouble reaching the neural network. Please check your internet connection." 
      }]);
    } finally {
      setLoading(false);
      setStatusLog([]);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-slate-900 text-brand-500 rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[100] border border-brand-500/20 group"
      >
        <div className="absolute inset-0 bg-brand-500/10 rounded-2xl animate-ping group-hover:hidden"></div>
        <Terminal className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-8 right-8 z-[100] flex flex-col bg-white rounded-[2rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.4)] border border-slate-200 transition-all duration-500 overflow-hidden ${isMinimized ? 'w-64 h-16' : 'w-[400px] h-[600px]'}`}>
      {/* Header */}
      <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center text-slate-900 shadow-lg">
             <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 leading-none">Navigator V1.2</p>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-sm font-black text-white">HQ Assistant</p>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-[7px] font-black uppercase">
                    Active
                </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
            <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400">
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-slate-400">
                <X className="w-4 h-4" />
            </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F8F9FB] scrollbar-hide" ref={scrollRef}>
            {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <Bot className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 max-w-[250px] leading-relaxed">
                        Ready to assist.<br/>Where can I take you today?
                    </p>
                </div>
            )}
            
            {messages.map((m, i) => (
              m.displayText && (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-[12px] font-bold leading-relaxed shadow-sm ${
                      m.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                  }`}>
                    {m.displayText}
                  </div>
                </div>
              )
            ))}
            
            {loading && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 px-5 py-3.5 rounded-2xl rounded-tl-none flex items-center gap-3 shadow-sm">
                        <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processing...</span>
                    </div>
                </div>
                <div className="pl-4 space-y-1.5">
                    {statusLog.map((log, idx) => (
                        <p key={idx} className="text-[9px] font-mono text-emerald-600 animate-in slide-in-from-left-1 flex items-center gap-2">
                             <div className="w-1 h-1 rounded-full bg-emerald-400"></div>
                             {log}
                        </p>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-white border-t border-slate-100 shrink-0">
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-mono text-xs group-focus-within:text-brand-500 transition-colors">{'>'}</div>
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
                placeholder="Type a destination (e.g., 'policies')..."
                className="w-full pl-8 pr-14 py-4 bg-slate-50 border-none rounded-2xl text-xs font-mono font-black text-slate-800 placeholder:text-slate-300 focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all shadow-inner"
                disabled={loading}
              />
              <button 
                onClick={handleCommand}
                disabled={!input.trim() || loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-slate-900 text-brand-500 rounded-xl hover:bg-black disabled:opacity-20 transition-all active:scale-95 shadow-lg"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-4">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                    Quick Links: <span className="text-slate-400">Policies, Splits, Ledger</span>
                </p>
                <div className="flex items-center gap-1.5">
                    <Navigation className="w-3 h-3 text-slate-300" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nav Engine Active</span>
                </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
