import { extractTextFromPdf } from "@/app/[locale]/(main)/dashboard/gemini/actions/pdf-loader";
import { prisma } from "@/lib/prisma";


export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const name = formData.get("name") as string;

  const result = await extractTextFromPdf(file);

  const newAssistant = await prisma.assistant.create({
        data: {
            id: crypto.randomUUID(),
            name: name,
            fileName: file.name,
            content: result.text,
            charCount: result.charCount,
            pageCount: result.pageCount,
        }
      });


  return Response.json(newAssistant);
}