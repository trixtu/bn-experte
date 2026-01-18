"use client";

import { Assistant } from "@/prisma/lib/generated/prisma";
import { useState } from "react";
import { Sidebar } from "./sidebar";
import { AssistantModal } from "./assistant-modal";
import { ChatArea } from "./chat-area";
import { toast } from 'sonner';
import { deleteAssistantFromDb } from "../actions/assistant-actions";
import { User } from "@/lib/auth";

interface AppProps {
  assistants?: Assistant[];
  user: User;
}

const App: React.FC<AppProps> = ({ assistants: initialAssistants,user }) => {
    const [assistants, setAssistants] = useState<Assistant[]>(initialAssistants || []);
    const [activeAssistantId, setActiveAssistantId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);


  const handleAssistantCreated = (newAssistant: Assistant) => {
    setAssistants(prev => [newAssistant, ...prev]);
    setActiveAssistantId(newAssistant.id);
  };

  const handleDeleteAssistant = async (id: string) => {
    // 1. Confirmarea utilizatorului
    if (!confirm('Ești sigur că vrei să ștergi acest asistent?')) return;

    try {
      // 2. Ștergerea din Baza de Date (Server)
      await deleteAssistantFromDb(id);

      // 3. Actualizarea Stării (UI) - doar după ce serverul a confirmat
      setAssistants(prev => prev.filter(a => a.id !== id));
      
      if (activeAssistantId === id) {
        setActiveAssistantId(null);
      }

      toast.success("Asistent șters cu succes");
    } catch (error) {
      toast.error("Eroare la ștergere. Te rugăm să încerci din nou.");
      console.error(error);
    }
  };

  const handleSelectAssistant = (id: string) => {
    setActiveAssistantId(id);
    setIsSidebarOpen(false); // Close sidebar on mobile after selection
  };

  const activeAssistant = assistants.find(a => a.id === activeAssistantId) || null;

  return (
   <div className="flex h-[calc(100vh-70px)] w-full bg-gray-50 overflow-hidden text-gray-900 relative">
        {/* Mobile Overlay */}
        {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <Sidebar
        assistants={assistants}
        user={user}
        activeId={activeAssistantId}
        onSelect={handleSelectAssistant}
        onAdd={() => setIsModalOpen(true)}
        onDelete={handleDeleteAssistant}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
        <main className="flex-1 flex flex-col h-full min-w-0">
            <ChatArea 
                assistant={activeAssistant} 
                onOpenMenu={() => setIsSidebarOpen(true)} 
            />
        </main>

      {isModalOpen && (
        <AssistantModal
          onClose={() => setIsModalOpen(false)}
          onCreated={handleAssistantCreated}
        />
      )}
    </div>
  );
};

export default App;