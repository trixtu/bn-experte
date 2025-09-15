import { openai } from "@/lib/openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const file = formData.get("file") as File;
  const projectId = formData.get("projectId") as string;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!projectId) {
    return NextResponse.json({ error: "No projectId" }, { status: 400 });
  }

  // ✅ Trimitem direct File către OpenAI
  const uploadedFile = await openai.files.create({
    file, // <-- direct, fără fs
    purpose: "assistants",
  });

  // ✅ Creăm Vector Store
  const vectorStore = await openai.vectorStores.create({
    name: `store-${projectId}`,
    file_ids: [uploadedFile.id],
    metadata: { fileId: uploadedFile.id },
  });

  // ✅ Actualizăm asistentul
  const updatedAssistant = await openai.beta.assistants.update(projectId, {
    tool_resources: {
      file_search: {
        vector_store_ids: [vectorStore.id],
      },
    },
  });

  return NextResponse.json({
    vectorStore,
    updatedAssistant,
  });
}
