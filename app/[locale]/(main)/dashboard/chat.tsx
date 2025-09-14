"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Chat({ assistantId }: { assistantId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();

  const t = useTranslations("Chat");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistantId,
          message: input,
          threadId,
          language: locale,
        }),
      });

      const data = await res.json();
      setThreadId(data.threadId);

      // fake typewriter effect
      const answer = data.answer;

      let index = 0;
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const interval = setInterval(() => {
        index++;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: answer.slice(0, index),
          };
          return updated;
        });

        if (index === answer.length) clearInterval(interval);
      }, 5); // viteza efectului: 25ms pe caracter
    } catch (err) {
      console.log(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Eroare la server" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col h-[calc(100vh-180px)] border rounded-lg overflow-hidden">
      {/* Zona mesaje scrollabilă */}
      <ScrollArea className="h-full p-4 pb-20 bg-gray-50" ref={chatRef}>
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`chat lg:max-w-[70%] rounded-2xl px-4 py-2 shadow
            ${
              msg.role === "user"
                ? "bg-blue-500 text-white rounded-br-none"
                : "bg-white text-gray-800 border rounded-bl-none"
            }`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border rounded-2xl rounded-bl-none px-4 py-2 text-sm text-gray-500 shadow flex items-center gap-1">
                {[".", ".", "."].map((dot, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0.3, y: 0 }}
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                    className="w-2 h-2 bg-gray-400 rounded-full"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Ancoră pentru scroll */}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input absolut jos */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t bg-white flex items-center gap-2">
        <Input
          id="chat"
          className="rounded-full h-[42px] shadow-sm border px-4 py-4 focus:outline-none focus:ring-1 focus:ring-blue-400 text-base"
          placeholder={t("input.placeholder")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-blue-500 text-white px-5 py-2 rounded-full disabled:opacity-50"
        >
          {t("buttons.send")}
        </button>
      </div>
    </div>
  );
}
