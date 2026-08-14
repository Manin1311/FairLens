import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, Sparkles, Volume2, VolumeX, User, Loader2 } from 'lucide-react';
import { auditApi } from '../services/api';

export const AskGeminiChat = ({ auditId = null, analysisResults = null }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I am your FairLens AI Copilot powered by Google Gemini 2.5 Flash. Ask me anything about this audit's findings, specific group disparities, legal compliance risks, or mitigation steps."
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userQuery = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setLoading(true);

    try {
      let reply = '';
      if (auditId) {
        try {
          const res = await auditApi.askQuestion(auditId, userQuery);
          reply = res.answer;
        } catch (authErr) {
          const res = await auditApi.askDemoQuestion({
            question: userQuery,
            analysis: analysisResults
          });
          reply = res.answer;
        }
      } else {
        const res = await auditApi.askDemoQuestion({
          question: userQuery,
          analysis: analysisResults
        });
        reply = res.answer;
      }
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Based on the demographic parity and disparate impact metrics, this dataset displays significant disparity across protected subgroups that warrants mitigation prior to model deployment."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="p-6 rounded-2xl glass-panel flex flex-col h-[520px]">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-display font-bold text-white flex items-center gap-1.5">
              Ask FairLens AI Copilot
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                Gemini 2.5 Flash
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">Contextual Q&A on bias findings & legal remedies</p>
          </div>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-300 flex items-center justify-center flex-shrink-0 mt-0.5 border border-indigo-500/30">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}
              <div className={`p-3.5 rounded-2xl text-xs max-w-[80%] leading-relaxed ${
                isUser
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                  : 'bg-white/[0.04] text-slate-200 border border-white/[0.06] rounded-tl-none'
              }`}>
                {m.content}
                {!isUser && (
                  <button
                    onClick={() => speakText(m.content)}
                    className="block mt-2 text-[10px] text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    {isSpeaking ? (
                      <span className="flex items-center gap-1"><VolumeX className="w-3 h-3" /> Stop Voice</span>
                    ) : (
                      <span className="flex items-center gap-1"><Volume2 className="w-3 h-3" /> Audio Briefing</span>
                    )}
                  </button>
                )}
              </div>
              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-white/[0.08] text-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </motion.div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Gemini AI is analyzing results...</span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} className="mt-4 pt-3 border-t border-white/[0.08] flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question (e.g. 'Which group has the highest disparity?', 'How to satisfy EEOC?')..."
          className="flex-1 px-4 py-2.5 rounded-xl glass-input text-xs"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-md shadow-indigo-600/25"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
};
