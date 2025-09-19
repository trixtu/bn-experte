import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json({ error: "Lipseste fileId" }, { status: 400 });
    }

    // descarcă conținutul PDF-ului de la OpenAI
    // const fileRes = await openai.files.content(fileId);
    const file = await openai.files.content(fileId);

    console.log(file);

    // transformă stream-ul în buffer
    // const arrayBuffer = await fileRes.arrayBuffer();
    // const buffer = Buffer.from(arrayBuffer);

    // răspunsul va fi PDF inline (browser îl afișează direct)
    return new NextResponse("ok");
  } catch (err) {
    console.error("Eroare la citirea PDF:", err);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
