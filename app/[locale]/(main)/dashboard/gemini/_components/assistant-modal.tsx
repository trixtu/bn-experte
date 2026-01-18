"use client";

import { Assistant } from '@/prisma/lib/generated/prisma';
import React, { useState } from 'react';
import { extractTextFromPdf } from '../actions/pdf-loader';
import { saveAssistantToDb } from '../actions/assistant-actions';


interface AssistantModalProps {
  onClose: () => void;
  onCreated: (assistant: Assistant) => void;
}

export const AssistantModal: React.FC<AssistantModalProps> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      if (!name) setName(e.target.files[0].name.replace('.pdf', ''));
    }
  };

  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!file || !name) {
  //     setError('Te rugăm să introduci un nume și să alegi un fișier PDF.');
  //     return;
  //   }

  //   setLoading(true);
  //   setError('');

  //   try {
  //     const result = await extractTextFromPdf(file);

  //     const assistantData = {
  //       id: crypto.randomUUID(),
  //       name,
  //       fileName: file.name,
  //       content: result.text,
  //       charCount: result.charCount,
  //       pageCount: result.pageCount,
  //     };

  //     const savedAssistant = await saveAssistantToDb(assistantData);
      
  //     onCreated(savedAssistant as unknown as Assistant);
  //     onClose();
  //   } catch (err) {
  //     setError('Eroare la procesarea fișierului PDF. Asigură-te că nu este parolat.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!file || !name) {
    setError("Te rugăm să introduci un nume și să alegi un fișier PDF.");
    return;
  }

  setLoading(true);
  setError("");

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);

    const response = await fetch("/api/manuals/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("UPLOAD_FAILED");
    }

    const savedAssistant = await response.json();

    onCreated(savedAssistant as Assistant);
    onClose();
  } catch (err) {
    console.error(err);
    setError(
      "Eroare la încărcarea fișierului PDF. Asigură-te că nu este parolat și că dimensiunea este acceptată."
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Creează Asistent Nou</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nume Asistent</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="ex: Manual de Biologie"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Încarcă PDF</label>
            <div className="relative group">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg group-hover:border-blue-500 flex flex-col items-center justify-center transition-colors">
                <svg className="w-8 h-8 text-gray-400 group-hover:text-blue-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm text-gray-600 text-center px-4">
                  {file ? file.name : "Apasă sau trage un PDF aici"}
                </span>
              </div>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors font-medium flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Se procesează paginile...
                </>
              ) : "Creează"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};