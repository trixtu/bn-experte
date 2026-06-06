import { openai } from "@/lib/openai";
import { NextRequest, NextResponse } from "next/server";
import {
  deleteFileToS3,
  uploadFileToS3,
} from "@/app/[locale]/(main)/manuals/awss3.utils";

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getOrCreateProjectVectorStore(projectId: string) {
  const assistant = await openai.beta.assistants.retrieve(projectId);
  const existingVectorStoreId =
    assistant.tool_resources?.file_search?.vector_store_ids?.[0] ||
    assistant.metadata?.vectorStoreId;

  if (existingVectorStoreId) {
    return {
      assistant,
      vectorStoreId: existingVectorStoreId,
    };
  }

  const vectorStore = await openai.vectorStores.create({
    name: `project-${assistant.name ?? projectId}`,
    metadata: {
      assistantId: projectId,
      projectName: assistant.name ?? projectId,
    },
  });

  const updatedAssistant = await openai.beta.assistants.update(projectId, {
    tools: [{ type: "file_search" }],
    tool_resources: {
      file_search: {
        vector_store_ids: [vectorStore.id],
      },
    },
    metadata: {
      ...assistant.metadata,
      vectorStoreId: vectorStore.id,
    },
  });

  return {
    assistant: updatedAssistant,
    vectorStoreId: vectorStore.id,
  };
}

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

  const { vectorStoreId } = await getOrCreateProjectVectorStore(projectId);
  const storedFileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
  const originalKey = `projects/${projectId}/${storedFileName}`;
  const originalUrl = await uploadFileToS3({
    file,
    prefix: `projects/${projectId}`,
    fileName: storedFileName,
  });

  if (!originalUrl) {
    return NextResponse.json(
      { error: "PDF-ul original nu a putut fi salvat pentru descărcare." },
      { status: 500 },
    );
  }

  const uploadedFile = await openai.files.create({
    file,
    purpose: "assistants",
  });

  const vectorStoreFile = await openai.vectorStores.files.createAndPoll(
    vectorStoreId,
    {
      file_id: uploadedFile.id,
      attributes: {
        manualId: uploadedFile.id,
        projectId,
        fileName: file.name,
        originalUrl,
        originalKey,
      },
    },
    { pollIntervalMs: 1000 },
  );

  if (vectorStoreFile.status === "failed") {
    await openai.files.delete(uploadedFile.id).catch(() => null);
    await deleteFileToS3(originalKey, originalKey).catch(() => null);

    return NextResponse.json(
      {
        error:
          vectorStoreFile.last_error?.message ||
          "PDF-ul nu a putut fi indexat.",
      },
      { status: 422 },
    );
  }

  const updatedAssistant = await openai.beta.assistants.retrieve(projectId);

  return NextResponse.json({
    success: true,
    file: uploadedFile,
    manual: {
      id: uploadedFile.id,
      fileName: file.name,
      originalUrl,
      originalKey,
      status: vectorStoreFile.status,
      vectorStoreFileId: vectorStoreFile.id,
    },
    vectorStoreId,
    updatedAssistant,
  });
}
