import { openai } from "@/lib/openai";

export async function POST(req: Request) {
  const { assistantId, message, threadId, language } = await req.json();

  // 1. Dacă nu există threadId, creăm unul nou
  let thread_id = threadId;
  if (!thread_id) {
    const thread = await openai.beta.threads.create();
    thread_id = thread.id;
  }

  let localizedMessage: string;

  switch (language) {
    case "ro":
      localizedMessage = `Răspunde **în limba română**. Întrebare: ${message}`;
      break;
    case "en":
      localizedMessage = `Answer **in English**. Question:${message}`;
      break;
    case "de":
      localizedMessage = `Antworte **auf Deutsch**. Frage:${message}`;
      break;
    case "fr":
      localizedMessage = `Réponds **en français**. Question :${message}`;
      break;
    case "ru":
      localizedMessage = `Ответь **на русском языке**. Вопрос:${message}`;
      break;
    case "pl":
      localizedMessage = `Odpowiedz **po polsku**. Pytanie:${message}`;
      break;
    default:
      localizedMessage = `Răspunde **în limba română**.Întrebare: ${message}`;
      break;
  }
  // 2️⃣ Trimite mesajul utilizatorului
  await openai.beta.threads.messages.create(thread_id, {
    role: "user",
    content: localizedMessage,
  });

  const stream = await openai.beta.threads.runs.create(thread_id, {
    assistant_id: assistantId,
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        // Event „thread.message.delta” are fragmente din mesaj
        if (
          event.event === "thread.message.delta" &&
          event.data?.delta?.content
        ) {
          // event.data.delta.content este un array de blocuri
          for (const blk of event.data.delta.content) {
            if (blk.type === "text") {
              controller.enqueue(encoder.encode(blk.text?.value));
            }
          }
        }
        // Dacă mesajul a fost complet generat
        if (event.event === "thread.message.completed") {
          controller.close();
          break;
        }
      }
    },
  });

  // // 3. Rulăm asistentul
  // const run = await openai.beta.threads.runs.create(thread_id, {
  //   assistant_id: assistantId,
  // });

  // // 4. Așteptăm finalizarea run-ului
  // let runStatus = await openai.beta.threads.runs.retrieve(run.id, {
  //   thread_id,
  // });

  // while (runStatus.status === "in_progress" || runStatus.status === "queued") {
  //   await new Promise((res) => setTimeout(res, 1000));
  //   runStatus = await openai.beta.threads.runs.retrieve(run.id, {
  //     thread_id,
  //   });
  // }

  // // 5. Obținem mesajele asistentului
  // const messages = await openai.beta.threads.messages.list(thread_id);

  // const lastMessage = messages.data[0];
  // let answer = "Nu am găsit niciun răspuns.";

  // if (lastMessage?.content && lastMessage.content.length > 0) {
  //   const textBlock = lastMessage.content.find(
  //     (block) => block.type === "text"
  //   ) as { type: "text"; text: { value: string } } | undefined;

  //   if (textBlock) {
  //     answer = textBlock.text.value;
  //   }
  // }

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
