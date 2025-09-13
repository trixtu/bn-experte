"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useTransition } from "react";
import { updateAssistantLanguage } from "./actions";
import { useParams } from "next/navigation";

export function SelectorLimba() {
  const params = useParams<{ id: string }>();
  const [language, setLanguage] = useState("ro");
  const [isPending, startTransition] = useTransition();

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    startTransition(async () => {
      await updateAssistantLanguage(params.id, value);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={language} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Selectează limba" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ro">🇷🇴 Română</SelectItem>
          <SelectItem value="en">🇬🇧 English</SelectItem>
          <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
          <SelectItem value="ru">🇷🇺 Русский</SelectItem>
          <SelectItem value="pl">🇵🇱 Polski</SelectItem>
          <SelectItem value="fr">🇫🇷 Français</SelectItem>
        </SelectContent>
      </Select>
      {isPending && (
        <span className="text-sm text-gray-500">Se salvează...</span>
      )}
    </div>
  );
}
