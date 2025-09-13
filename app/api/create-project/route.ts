import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { name, userId } = await req.json();

  const assistant = await openai.beta.assistants.create({
    name: name,
    instructions:
      "Răspunde doar pe baza manualelor încărcate ca fișiere. Scrie răspunsurile în limba română.",
    model: "gpt-4o-mini", // sau altul (o3-mini pentru ieftin & rapid)
    tools: [{ type: "file_search" }],
    temperature: 0.01,
    top_p: 1,
    metadata: { userId: userId },
  });

  return new Response(
    JSON.stringify({
      name,
      assistant,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
