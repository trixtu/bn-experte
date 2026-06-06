import { openai } from "@/lib/openai";
import {
  deleteFileToS3,
  getPublicFileUrl,
} from "@/app/[locale]/(main)/manuals/awss3.utils";
import { getErrorMessage, getErrorStatus } from "@/lib/utils";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const vectorId = url.searchParams.get("vectorId");

  if (!vectorId) return new Response("Vector ID lipsă", { status: 400 });

  const vectorStore = await openai.vectorStores.retrieve(vectorId);
  const vectorFiles = await openai.vectorStores.files.list(vectorId, {
    limit: 100,
  });

  const files = await Promise.all(
    vectorFiles.data.map(async (vectorFile) => {
      const openaiFile = await openai.files.retrieve(vectorFile.id);
      const fileName =
        typeof vectorFile.attributes?.fileName === "string"
          ? vectorFile.attributes.fileName
          : openaiFile.filename;
      const originalKey =
        typeof vectorFile.attributes?.originalKey === "string"
          ? vectorFile.attributes.originalKey
          : undefined;

      return {
        id: openaiFile.id,
        manualId:
          typeof vectorFile.attributes?.manualId === "string"
            ? vectorFile.attributes.manualId
            : openaiFile.id,
        vectorStoreFileId: vectorFile.id,
        filename: fileName,
        originalUrl:
          originalKey
            ? getPublicFileUrl(originalKey)
            : typeof vectorFile.attributes?.originalUrl === "string"
              ? vectorFile.attributes.originalUrl
              : undefined,
        originalKey,
        status: vectorFile.status,
        createdAt: vectorFile.created_at,
        usageBytes: vectorFile.usage_bytes,
      };
    }),
  );

  return new Response(JSON.stringify({ vectorStore, files }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function DELETE(req: Request) {
  const { vectorId, fileId } = await req.json();

  if (!vectorId || !fileId) {
    return new Response(JSON.stringify({ error: "Date lipsă" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const vectorFile = await openai.vectorStores.files
    .retrieve(fileId, { vector_store_id: vectorId })
    .catch(() => null);
  const originalKey =
    typeof vectorFile?.attributes?.originalKey === "string"
      ? vectorFile.attributes.originalKey
      : undefined;

  await openai.vectorStores.files.delete(fileId, {
    vector_store_id: vectorId,
  });
  await openai.files.delete(fileId);

  if (originalKey) {
    await deleteFileToS3(originalKey, originalKey).catch(() => null);
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function PATCH(req: Request) {
  try {
    const { vectorId, fileId, fileName } = await req.json();

    if (!vectorId || !fileId || typeof fileName !== "string") {
      return Response.json({ error: "Date lipsă" }, { status: 400 });
    }

    const trimmedFileName = fileName.trim();

    if (trimmedFileName.length < 2) {
      return Response.json(
        { error: "Numele manualului trebuie să aibă cel puțin 2 caractere." },
        { status: 400 },
      );
    }

    const vectorFile = await openai.vectorStores.files.retrieve(fileId, {
      vector_store_id: vectorId,
    });

    const updated = await openai.vectorStores.files.update(fileId, {
      vector_store_id: vectorId,
      attributes: {
        ...(vectorFile.attributes ?? {}),
        fileName: trimmedFileName,
      },
    });

    return Response.json({
      success: true,
      file: {
        id: updated.id,
        filename: trimmedFileName,
        attributes: updated.attributes,
      },
    });
  } catch (error) {
    return Response.json(
      { error: getErrorMessage(error, "Manualul nu a putut fi actualizat.") },
      { status: getErrorStatus(error) || 500 },
    );
  }
}
