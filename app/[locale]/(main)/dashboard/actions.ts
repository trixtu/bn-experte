"use server";

import { openai } from "@/lib/openai";
import { deleteFileToS3 } from "@/app/[locale]/(main)/manuals/awss3.utils";
import { getServerSession } from "@/lib/get-session";
import { revalidatePath } from "next/cache";

const CHAT_MODELS = new Set(["gpt-5.4-mini", "gpt-5.4", "gpt-5.5"]);

function cleanString(value: unknown, maxLength = 4000) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

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
        const deletedFileIds = new Set<string>();

        for await (const vectorFile of openai.vectorStores.files.list(vs, {
          limit: 100,
        })) {
          const originalKey =
            typeof vectorFile.attributes?.originalKey === "string"
              ? vectorFile.attributes.originalKey
              : undefined;

          await openai.vectorStores.files.delete(vectorFile.id, {
            vector_store_id: vs,
          });

          await openai.files.delete(vectorFile.id).catch(() => null);
          if (originalKey) {
            await deleteFileToS3(originalKey, originalKey).catch(() => null);
          }
          deletedFileIds.add(vectorFile.id);
        }

        if (
          vectorStore.metadata &&
          typeof vectorStore.metadata.fileId === "string" &&
          !deletedFileIds.has(vectorStore.metadata.fileId)
        ) {
          const fileId = vectorStore.metadata.fileId;
          await openai.files.delete(fileId).catch(() => null);
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

export async function updateProject({
  id,
  name,
  model,
  instructions,
}: {
  id: string;
  name: string;
  model: string;
  instructions: string;
}) {
  const session = await getServerSession();

  if (!session?.user) {
    return { success: false, message: "Nu ești autentificat." };
  }

  const projectId = cleanString(id, 160);
  const projectName = cleanString(name, 256);
  const selectedModel = cleanString(model, 80);
  const projectInstructions = cleanString(instructions, 12000);

  if (!projectId || !projectName) {
    return { success: false, message: "Numele proiectului este obligatoriu." };
  }

  if (!CHAT_MODELS.has(selectedModel)) {
    return { success: false, message: "Modelul selectat nu este valid." };
  }

  try {
    const assistant = await openai.beta.assistants.retrieve(projectId);
    const ownerId =
      typeof assistant.metadata?.userId === "string"
        ? assistant.metadata.userId
        : undefined;
    const canManage =
      session.user.role === "admin" ||
      session.user.role === "owner" ||
      ownerId === session.user.id;

    if (!canManage) {
      return { success: false, message: "Nu ai drepturi pentru acest proiect." };
    }

    const vectorStoreId =
      assistant.tool_resources?.file_search?.vector_store_ids?.[0] ||
      assistant.metadata?.vectorStoreId;

    const updatedAssistant = await openai.beta.assistants.update(projectId, {
      name: projectName,
      instructions: projectInstructions || assistant.instructions,
      metadata: {
        ...assistant.metadata,
        projectName,
        chatModel: selectedModel,
      },
    });

    if (typeof vectorStoreId === "string" && vectorStoreId.length > 0) {
      const vectorStore = await openai.vectorStores.retrieve(vectorStoreId);

      await openai.vectorStores.update(vectorStoreId, {
        name: `project-${projectName}`,
        metadata: {
          ...vectorStore.metadata,
          projectName,
          assistantId: projectId,
        },
      });
    }

    revalidatePath("/[locale]/dashboard", "page");
    revalidatePath("/[locale]/dashboard/all-projects", "page");
    revalidatePath("/[locale]/dashboard/project/[id]", "page");

    return {
      success: true,
      project: {
        id: updatedAssistant.id,
        name: updatedAssistant.name ?? projectName,
        model: selectedModel,
        assistantModel: updatedAssistant.model,
        instructions: updatedAssistant.instructions ?? projectInstructions,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Update failed";
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
