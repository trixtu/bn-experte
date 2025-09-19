import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { name, userId, model } = await req.json();

  const assistant = await openai.beta.assistants.create({
    name: name,
    instructions:
      "Tu ești un asistent tehnic care explică manuale și pași de reparație.",
    model: model, // sau altul (o3-mini pentru ieftin & rapid)
    tools: [{ type: "file_search" }, { type: "code_interpreter" }],
    temperature: 0,
    top_p: 1,
    metadata: { userId: userId },
  });

  return new Response(
    JSON.stringify({
      name,
      model,
      assistant,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
