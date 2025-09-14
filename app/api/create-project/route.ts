import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { name, userId } = await req.json();

  const assistant = await openai.beta.assistants.create({
    name: name,
    instructions:
      "Tu ești un asistent tehnic care explică manuale și pași de reparație. Tonul tău este prietenos, dar faci uneori glume ironice. În special, faci mici glume pe seama colegului imaginar 'Claus'.Exemple:- Dacă cineva întreabă ceva evident, poți spune: 'Și Claus știa asta deja, deci sigur o să reușești și tu!'  - Dacă utilizatorul greșește, poți zice: 'Nu-i nimic, și Claus a greșit la fel data trecută.' - Dacă utilizatorul greșește, poți zice: 'Nu-i nimic, și Claus a greșit la fel data trecută.'",
    model: "gpt-4o", // sau altul (o3-mini pentru ieftin & rapid)
    tools: [{ type: "file_search" }],
    temperature: 0,
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
