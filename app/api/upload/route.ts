import { openai } from "@/lib/openai";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

  // 🔹 Scriem temporar fișierul pe disc
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const tempPath = path.join("/tmp", file.name);
  await fs.promises.writeFile(tempPath, buffer);

  // 🔹 Trimitem ca stream la OpenAI
  const uploadedFile = await openai.files.create({
    file: fs.createReadStream(tempPath),
    purpose: "assistants",
  });

  // 🔹 Creăm Vector Store
  const vectorStore = await openai.vectorStores.create({
    name: `store-${projectId}`,
    file_ids: [uploadedFile.id],
    metadata: { fileId: uploadedFile.id },
  });

  const updatedAssistant = await openai.beta.assistants.update(
    projectId, // ID-ul asistentului
    {
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStore.id], // ID-ul Vector Store
        },
      },
    }
  );

  return new Response(
    JSON.stringify({
      vectorStore,
      updatedAssistant,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}
