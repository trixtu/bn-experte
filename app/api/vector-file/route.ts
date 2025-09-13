import { openai } from "@/lib/openai";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const vectorId = url.searchParams.get("vectorId");

  if (!vectorId) return new Response("Vector ID lipsă", { status: 400 });

  // Exemplu simplu: preluăm documentele vector store
  // În realitate, probabil vei face retrieval sau vei folosi SDK-ul tău de vector store
  const vectorData = await openai.vectorStores.retrieve(vectorId);

  let file = null;
  if (vectorData.metadata && vectorData.metadata.fileId) {
    file = await openai.files.retrieve(vectorData.metadata.fileId);
  }

  return new Response(JSON.stringify({ file }), {
    headers: { "Content-Type": "application/json" },
  });
}
