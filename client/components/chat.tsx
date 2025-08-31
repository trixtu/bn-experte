"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserButton } from "@clerk/nextjs";
import * as React from "react";

interface Doc {
  pageContent?: string;
  metadata?: {
    loc?: {
      pageNumber?: number;
    };
    source?: string;
  };
}
interface IMessage {
  role: "assistant" | "user";
  content?: string;
  documents?: Doc[];
}

const ChatComponent: React.FC = () => {
  const [message, setMessage] = React.useState<string>("");
  const [messages, setMessages] = React.useState<IMessage[]>([]);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendChatMessage = async () => {
    if (!message.trim()) return;

    const userMessage: IMessage = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);

    setMessage("");

    try {
      const res = await fetch(
        `http://localhost:8000/chat?message=${encodeURIComponent(message)}`
      );
      const data = await res.json();

      const assistantMessage: IMessage = {
        role: "assistant",
        content: data?.answer || data?.message || "No response",
        documents: data?.sources || data?.docs,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error fetching chat:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Eroare la trimiterea mesajului." },
      ]);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-end mb-4 p-2 border-b-2">
        <UserButton />
      </div>
      <div className="flex-1 overflow-y-auto mb-24 p-8">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`mb-4 ${
              msg.role === "user" ? "text-right" : "text-left"
            }`}
          >
            <div
              className={`inline-block p-3 rounded-md ${
                msg.role === "user" ? "bg-blue-200" : "bg-gray-100"
              }`}
            >
              {msg.content?.split("\n").map((line, i) => (
                <p key={i} className="mb-1">
                  {line}
                </p>
              ))}
            </div>

            {msg.documents && msg.documents.length > 0 && (
              <div className="mt-2 text-sm text-gray-600 border-l-2 border-gray-300 pl-2">
                <strong>Sources:</strong>
                {msg.documents.map((doc, i) => (
                  <div key={i} className="mt-1">
                    {doc.metadata?.source && (
                      <span className="font-semibold">
                        {doc.metadata.source}
                      </span>
                    )}
                    {doc.metadata?.loc?.pageNumber !== undefined && (
                      <span> (Page {doc.metadata.loc.pageNumber})</span>
                    )}
                    {doc.pageContent && (
                      <p className="mt-1 text-gray-700 text-sm">
                        {doc.pageContent}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      <div className="fixed bottom-4 w-100 flex gap-3 px-4">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here"
          onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
        />
        <Button onClick={handleSendChatMessage} disabled={!message.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
};

export default ChatComponent;
