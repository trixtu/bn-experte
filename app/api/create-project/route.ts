import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { name, userId } = await req.json();

  const assistant = await openai.beta.assistants.create({
    name: name,
    instructions: `
      Tu ești un asistent tehnic care explică manuale și pași de reparație.
      Răspunzi politicos și clar, dar cu o notă amuzantă și ironică uneori.
      Dacă utilizatorul repetă întrebări deja discutate, amintește-i cu o mică glumă
      de tipul „Ți-am mai spus asta o dată… ai uitat din nou?”.
      Nu exagera, păstrează totuși tonul prietenos și de ajutor. 
    `,
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
