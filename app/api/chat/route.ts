import { openai } from "@/lib/openai";

export async function POST(req: Request) {
  const { assistantId, message, threadId } = await req.json();

  // 1. Dacă nu există threadId, creăm unul nou
  let thread_id = threadId;
  if (!thread_id) {
    const thread = await openai.beta.threads.create();
    thread_id = thread.id;
  }

  // 2. Adăugăm mesajul în thread
  await openai.beta.threads.messages.create(thread_id, {
    role: "user",
    content: message,
  });

  // 3. Rulăm asistentul
  const run = await openai.beta.threads.runs.create(thread_id, {
    assistant_id: assistantId, // înlocuiește cu al tău
  });

  // 4. Așteptăm finalizarea run-ului
  let runStatus = await openai.beta.threads.runs.retrieve(run.id, {
    thread_id,
  });

  while (runStatus.status === "in_progress" || runStatus.status === "queued") {
    await new Promise((res) => setTimeout(res, 1000));
    runStatus = await openai.beta.threads.runs.retrieve(run.id, {
      thread_id,
    });
  }

  // 5. Obținem mesajele asistentului
  const messages = await openai.beta.threads.messages.list(thread_id);

  const lastMessage = messages.data[0];
  let answer = "Nu am găsit niciun răspuns.";

  if (lastMessage?.content && lastMessage.content.length > 0) {
    const textBlock = lastMessage.content.find(
      (block) => block.type === "text"
    ) as { type: "text"; text: { value: string } } | undefined;

    if (textBlock) {
      answer = textBlock.text.value;
    }
  }
  return new Response(
    JSON.stringify({
      threadId: thread_id,
      answer,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
