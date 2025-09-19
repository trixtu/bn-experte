import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { name, userId, model } = await req.json();

  const assistant = await openai.beta.assistants.create({
    name: name,
    instructions:
      "Tu ești un asistent tehnic. Răspunzi strict pe baza manualului PDF furnizat. Pentru orice eroare, scoate:1. Denumirea exactă a erorii.2. Cauzele posibile.3. Măsurile de remediere.4. Explică în cuvinte simple ce înseamnă.5. Oferă pași practici de verificare și remediere, cu referință la scheme sau pini dacă există. Răspunde în limba utilizatorului și tradu și titlurile secțiunilor în această limbă.",
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
