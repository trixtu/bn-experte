"use client";

import { Assistant } from '@/prisma/lib/generated/prisma';
import { Message } from '@/types';
import React, { useState, useRef, useEffect } from 'react';
import { askAssistant } from '../actions/grok-service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ChatAreaProps {
  assistant: Assistant | null;
  onOpenMenu: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ assistant, onOpenMenu }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // const locale = useLocale();

  useEffect(() => {
    setMessages([]);
  }, [assistant?.id]);

 useEffect(() => {
    // Scroll smooth la fiecare update de mesaj (important pentru streaming)
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !assistant || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const response = await askAssistant(assistant.content, history, input, useThinking);

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: response,
        timestamp: Date.now(),
        isThinking: useThinking
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: "Eroare: Nu am putut genera răspunsul. Manualul este foarte mare sau cheia API este invalidă.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!assistant) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50">
        <button 
          onClick={onOpenMenu}
          className="lg:hidden absolute top-4 left-4 p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
        <div className="w-20 h-20 md:w-24 md:h-24 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
          <svg className="w-10 h-10 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2 px-4">Bun venit la ManualGPT</h2>
        <p className="text-sm md:text-base text-gray-500 max-w-xs px-4">Selectează un manual din meniu sau creează unul nou pentru a începe.</p>
        <button 
          onClick={onOpenMenu}
          className="mt-8 px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 lg:hidden"
        >
          Deschide Manualele
        </button>
      </div>
    );
  }

  return (
  <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-white/90 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={onOpenMenu}
            className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
          <div className="min-w-0">
            <h2 className="text-sm md:text-lg font-bold text-gray-900 truncate leading-tight">{assistant.name}</h2>
            <div className="flex items-center gap-2">
              <span className="text-[9px] md:text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                {assistant.pageCount} pag.
              </span>
              <p className="text-[9px] md:text-[10px] text-gray-400 truncate  xs:block">char count: {assistant.charCount}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
           <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-tighter hidden sm:inline">Deep Thinking</span>
            <div className="relative">
              <input 
                type="checkbox" 
                checked={useThinking} 
                onChange={(e) => setUseThinking(e.target.checked)}
                className="sr-only peer" 
              />
              <div className="w-9 md:w-11 h-5 md:h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 md:after:h-5 after:w-4 md:after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
          </label>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-4 md:space-y-6 bg-gray-50/30"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-3 px-6">
            <div className="p-3 bg-white rounded-full shadow-sm">
              <svg className="w-6 h-6 opacity-30 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-xs md:text-sm font-medium">Întreabă orice din cele {assistant.pageCount} pagini ale manualului.</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
          >
            <div className={`max-w-[90%] md:max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${
              message.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
            }`}>
              {message.isThinking && (
                 <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-amber-50 rounded text-[9px] font-bold text-amber-700 uppercase tracking-tight">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Deep Thinking
                 </div>
              )}
              <p className="text-xs md:text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
              <p className={`text-[8px] md:text-[9px] mt-1 opacity-50 font-medium ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1.5 items-center">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-75"></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-4 md:p-6 bg-white border-t border-gray-100">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-2 md:gap-3">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Întreabă ceva..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 md:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:opacity-50 text-base"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 md:px-6 py-2.5 md:py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-blue-400 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center shrink-0 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span className="hidden sm:inline ml-2 font-semibold text-sm">Trimite</span>
          </Button>
        </form>
      </div>
    </div>
  );
};