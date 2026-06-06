import { getServerSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const MAX_TEXT_LENGTH = 12_000;

function cleanString(value: unknown, maxLength = MAX_TEXT_LENGTH) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function nullableString(value: unknown, maxLength = MAX_TEXT_LENGTH) {
  const cleaned = cleanString(value, maxLength);
  return cleaned.length > 0 ? cleaned : null;
}

export async function GET(req: Request) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const projectId = url.searchParams.get("projectId")?.trim();
  const technicianId = url.searchParams.get("technicianId")?.trim();

  const textFilters = query
    ? [
        { title: { contains: query, mode: "insensitive" as const } },
        { question: { contains: query, mode: "insensitive" as const } },
        { answer: { contains: query, mode: "insensitive" as const } },
        { symptoms: { contains: query, mode: "insensitive" as const } },
        { cause: { contains: query, mode: "insensitive" as const } },
        { solution: { contains: query, mode: "insensitive" as const } },
        { tags: { contains: query, mode: "insensitive" as const } },
      ]
    : [];

  const experiences = await prisma.technicianExperience.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(technicianId ? { technicianId } : {}),
      ...(textFilters.length > 0 ? { OR: textFilters } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ experiences });
}

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const title = cleanString(body.title, 180);
  const question = cleanString(body.question);
  const answer = cleanString(body.answer);
  const technicianId = nullableString(body.technicianId, 160);

  if (!title || !question || !answer) {
    return NextResponse.json(
      { error: "Titlul, întrebarea și răspunsul sunt obligatorii." },
      { status: 400 },
    );
  }

  if (technicianId) {
    const technician = await prisma.aiTechnician.findUnique({
      where: { id: technicianId },
      select: { id: true },
    });

    if (!technician) {
      return NextResponse.json(
        { error: "Technicianul selectat nu există." },
        { status: 400 },
      );
    }
  }

  const experience = await prisma.technicianExperience.create({
    data: {
      technicianId,
      projectId: nullableString(body.projectId, 120),
      manualId: nullableString(body.manualId, 120),
      manualName: nullableString(body.manualName, 260),
      title,
      question,
      answer,
      symptoms: nullableString(body.symptoms),
      cause: nullableString(body.cause),
      solution: nullableString(body.solution),
      tags: nullableString(body.tags, 600),
      source: nullableString(body.source, 80) ?? "chat",
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ experience });
}

export async function DELETE(req: Request) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const existing = await prisma.technicianExperience.findUnique({
    where: { id },
    select: { createdById: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canDelete =
    session.user.role === "admin" ||
    session.user.role === "owner" ||
    existing.createdById === session.user.id;

  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.technicianExperience.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
