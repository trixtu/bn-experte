"use server";

import { openai } from "@/lib/openai";

export async function getAsistants() {
  const assistants = await openai.beta.assistants.list({
    order: "desc",
  });

  return assistants;
}

export async function deleteAssistant(assistantId: string) {
  if (!assistantId) throw new Error("Missing assistantId");

  try {
    const assistant = await openai.beta.assistants.retrieve(assistantId);

    const vectorStoreIDS =
      assistant.tool_resources?.file_search?.vector_store_ids;

    if (vectorStoreIDS && vectorStoreIDS.length > 0) {
      for (const vs of vectorStoreIDS) {
        const vectorStore = await openai.vectorStores.retrieve(vs);

        if (vectorStore.metadata && vectorStore.metadata.fileId) {
          const fileId = vectorStore.metadata.fileId;
          await openai.files.delete(fileId);
        }
        await openai.vectorStores.delete(vs);
      }
    }

    await openai.beta.assistants.delete(assistantId);

    // succes ✅
    return { success: true, message: "Assistant deleted" };
  } catch (err: unknown) {
    let message = "Delete failed";

    if (err instanceof Error) {
      message = err.message;
    }

    return { success: false, message };
  }
}

export async function updateAssistantLanguage(id: string, lang: string) {
  let instructions = "";

  switch (lang) {
    case "ro":
      instructions =
        "Răspunde doar pe baza manualelor încărcate ca fișiere. Scrie răspunsurile în limba română.";
      break;
    case "en":
      instructions =
        "Answer only based on the uploaded manuals. Write responses in English.";
      break;
    case "de":
      instructions =
        "Antworte nur auf Basis der hochgeladenen Handbücher. Schreibe die Antworten auf Deutsch.";
      break;
    case "ru":
      instructions =
        "Отвечай только на основе загруженных руководств. Пиши ответы на русском языке.";
      break;
    case "pl":
      instructions =
        "Odpowiadaj wyłącznie na podstawie przesłanych podręczników. Pisz odpowiedzi po polsku.";
      break;
    case "fr":
      instructions =
        "Réponds uniquement à partir des manuels téléchargés. Rédige les réponses en français.";
      break;
    default:
      instructions = "Răspunde doar pe baza manualelor încărcate ca fișiere.";
  }

  await openai.beta.assistants.update(id, {
    instructions,
  });
}
