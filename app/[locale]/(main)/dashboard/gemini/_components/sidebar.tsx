"use client";

import { User } from '@/lib/auth';
import { Assistant } from '@/prisma/lib/generated/prisma';
import React from 'react';

interface SidebarProps {
  assistants: Assistant[];
  user: User;
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ assistants, user, activeId, onSelect, onAdd, onDelete, isOpen, onClose }) => {
  return (
    <div className={`
      fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden shrink-0 transition-transform duration-300 ease-in-out
      lg:relative lg:translate-x-0 lg:w-80
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">BN Experte</h1>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <button
          onClick={onAdd}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all font-semibold shadow-sm active:scale-[0.98]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Asistent Nou
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-3 mb-3">Asistenții Tăi</p>
        <div className="space-y-1">
          {assistants.length === 0 ? (
            <div className="px-3 py-8 text-sm text-gray-400 text-center italic">
              Niciun asistent creat.<br/>Adaugă primul tău PDF.
            </div>
          ) : (
            assistants.map((assistant) => (
              <div
                key={assistant.id}
                className={`group flex items-center gap-2 rounded-xl p-3 cursor-pointer transition-all ${
                  activeId === assistant.id
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
                }`}
                onClick={() => onSelect(assistant.id)}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${activeId === assistant.id ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{assistant.name}</p>
                  <div className="flex items-center gap-2 opacity-70">
                    <span className="text-[10px] bg-gray-200/50 text-gray-600 px-1 rounded">{assistant.pageCount || '?'} pag.</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(assistant.id);
                  }}
                  className="opacity-0 lg:group-hover:opacity-100 p-2 text-gray-400 hover:text-red-600 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=ManualGPT" className="w-10 h-10 rounded-full border border-gray-200 bg-white" alt="Avatar" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
            <p className="text-[10px] text-gray-500 uppercase font-medium">Sesiune activă</p>
          </div>
        </div>
      </div>
    </div>
  );
};