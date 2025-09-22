import { manualUploadAction } from "@/server/manualUploadAction";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const manual = await manualUploadAction(formData);

    return NextResponse.json(manual);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
