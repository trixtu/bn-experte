"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Assistant } from "openai/resources/beta/assistants.mjs";
import { useState } from "react";
import { IoFolderOutline } from "react-icons/io5";
import { RiDeleteBin6Line } from "react-icons/ri";
import { deleteAssistant } from "./actions";

export default function AssistantCard({ assistant }: { assistant: Assistant }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Ștergi proiectul "${assistant.name}"?`)) return;

    setLoading(true);
    try {
      await deleteAssistant(assistant.id);
      alert("Proiect șters cu succes!");
      window.location.reload(); // sau folosește revalidare cu mutate
    } catch (err) {
      console.error(err);
      alert("Eroare la ștergere");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link href={`/dashboard/project/${assistant.id}`}>
      <div className="border h-20 px-4 py-2 rounded flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IoFolderOutline className="w-7 h-7" />
          <h1 className="text-2xl">{assistant.name}</h1>
        </div>
        <Button
          variant="outline"
          onClick={(e) => {
            e.preventDefault();
            handleDelete();
          }}
          disabled={loading}
        >
          <RiDeleteBin6Line className="w-6 h-6" />
        </Button>
      </div>
    </Link>
  );
}
