import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { getErrorMessage } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json({ error: "Lipseste fileId" }, { status: 400 });
    }

    const metadata = await openai.files.retrieve(fileId);
    const file = await openai.files.content(fileId);
    const arrayBuffer = await file.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${metadata.filename}"`,
      },
    });
  } catch (err) {
    console.error("Eroare la citirea PDF:", err);
    const message = getErrorMessage(err);
    const isOpenAIPurposeError = message.includes(
      "Not allowed to download files of purpose",
    );

    return NextResponse.json(
      {
        error: isOpenAIPurposeError
          ? "Acest PDF a fost încărcat înainte de salvarea copiei originale. Reîncarcă manualul în proiect ca să poată fi deschis."
          : "Eroare server",
        detail: message,
      },
      { status: isOpenAIPurposeError ? 409 : 500 },
    );
  }
}
