import { openai } from "@/lib/openai";
import { getErrorMessage, getErrorStatus } from "@/lib/utils";

const STORAGE_ASSISTANT_MODEL = "gpt-4o-mini";
const DEFAULT_CHAT_MODEL = "gpt-5.4-mini";
const CHAT_MODELS = new Set(["gpt-5.4-mini", "gpt-5.4", "gpt-5.5"]);

export async function POST(req: Request) {
  let vectorStoreId: string | undefined;

  try {
    const { name, userId, model, system_instructions } = await req.json();

    if (!name || !userId) {
      return Response.json(
        { error: "Lipsește numele proiectului sau utilizatorul." },
        { status: 400 },
      );
    }

    const selectedModel =
      typeof model === "string" && CHAT_MODELS.has(model)
        ? model
        : DEFAULT_CHAT_MODEL;

    const vectorStore = await openai.vectorStores.create({
      name: `project-${name}`,
      metadata: { userId, projectName: name },
    });
    vectorStoreId = vectorStore.id;

    const assistant = await openai.beta.assistants.create({
      name,
      instructions:
        system_instructions ||
        "Răspunde doar pe baza manualelor încărcate în proiect. Dacă informația nu apare în manuale, spune clar că nu ai găsit-o în documente.",
      model: STORAGE_ASSISTANT_MODEL,
      tools: [{ type: "file_search" }],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStore.id],
        },
      },
      temperature: 0,
      top_p: 1,
      metadata: {
        userId,
        vectorStoreId: vectorStore.id,
        chatModel: selectedModel,
        storageModel: STORAGE_ASSISTANT_MODEL,
      },
    });

    return Response.json({
      name,
      model: selectedModel,
      assistant,
      vectorStore,
    });
  } catch (error) {
    if (vectorStoreId) {
      await openai.vectorStores.delete(vectorStoreId).catch(() => null);
    }

    return Response.json(
      {
        error: getErrorMessage(error, "Proiectul nu a putut fi creat."),
      },
      { status: getErrorStatus(error) || 500 },
    );
  }
}
