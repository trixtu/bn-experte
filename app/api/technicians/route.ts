import { getServerSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type TechnicianManualInput = {
  projectId?: string;
  projectName?: string;
  vectorStoreId?: string;
  manualId?: string;
  manualName?: string;
};

function cleanString(value: unknown, maxLength = 4000) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function cleanOptionalString(value: unknown, maxLength = 4000) {
  const cleaned = cleanString(value, maxLength);
  return cleaned.length > 0 ? cleaned : null;
}

function parseBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function parseManuals(value: unknown) {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const manuals = value
    .filter((item): item is TechnicianManualInput => {
      if (!item || typeof item !== "object") return false;

      return (
        typeof item.projectId === "string" &&
        typeof item.projectName === "string" &&
        typeof item.vectorStoreId === "string" &&
        typeof item.manualId === "string" &&
        typeof item.manualName === "string"
      );
    })
    .map((item) => ({
      projectId: cleanString(item.projectId, 160),
      projectName: cleanString(item.projectName, 260),
      vectorStoreId: cleanString(item.vectorStoreId, 160),
      manualId: cleanString(item.manualId, 160),
      manualName: cleanString(item.manualName, 260),
    }))
    .filter((item) => {
      if (
        !item.projectId ||
        !item.projectName ||
        !item.vectorStoreId ||
        !item.manualId ||
        !item.manualName
      ) {
        return false;
      }

      const key = `${item.projectId}:${item.manualId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return manuals;
}

function parseTechnicianPayload(body: Record<string, unknown>) {
  const name = cleanString(body.name, 160);
  const domain = cleanString(body.domain, 120);
  const instructions = cleanString(body.instructions, 10_000);

  if (!name || !domain || !instructions) {
    return {
      error: "Numele, domeniul și instrucțiunile sunt obligatorii.",
    };
  }

  return {
    data: {
      name,
      domain,
      brands: cleanOptionalString(body.brands, 600),
      productTypes: cleanOptionalString(body.productTypes, 600),
      instructions,
      responseStyle: cleanString(body.responseStyle, 120) || "diagnostic",
      webEnabled: parseBoolean(body.webEnabled, true),
      experienceEnabled: parseBoolean(body.experienceEnabled, true),
      active: parseBoolean(body.active, true),
      manuals: parseManuals(body.manuals),
    },
  };
}

async function canManageTechnician(
  user: { id: string; role?: string },
  technicianId: string,
) {
  if (user.role === "admin" || user.role === "owner") return true;

  const technician = await prisma.aiTechnician.findUnique({
    where: { id: technicianId },
    select: { createdById: true },
  });

  return technician?.createdById === user.id;
}

export async function GET(req: Request) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const activeOnly = url.searchParams.get("activeOnly") === "true";

  const technicians = await prisma.aiTechnician.findMany({
    where: {
      ...(activeOnly ? { active: true } : {}),
      ...(projectId
        ? {
            OR: [
              { manuals: { some: { projectId } } },
              { manuals: { none: {} } },
            ],
          }
        : {}),
    },
    include: { manuals: true },
    orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ technicians });
}

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = parseTechnicianPayload(body);

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const technician = await prisma.aiTechnician.create({
    data: {
      name: parsed.data.name,
      domain: parsed.data.domain,
      brands: parsed.data.brands,
      productTypes: parsed.data.productTypes,
      instructions: parsed.data.instructions,
      responseStyle: parsed.data.responseStyle,
      webEnabled: parsed.data.webEnabled,
      experienceEnabled: parsed.data.experienceEnabled,
      active: parsed.data.active,
      createdById: session.user.id,
      manuals: {
        create: parsed.data.manuals,
      },
    },
    include: { manuals: true },
  });

  return NextResponse.json({ technician });
}

export async function PATCH(req: Request) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const id = cleanString(body.id, 160);

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const canManage = await canManageTechnician(session.user, id);

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = parseTechnicianPayload(body);

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const technician = await prisma.$transaction(async (tx) => {
    await tx.aiTechnicianManual.deleteMany({
      where: { technicianId: id },
    });

    await tx.aiTechnician.update({
      where: { id },
      data: {
        name: parsed.data.name,
        domain: parsed.data.domain,
        brands: parsed.data.brands,
        productTypes: parsed.data.productTypes,
        instructions: parsed.data.instructions,
        responseStyle: parsed.data.responseStyle,
        webEnabled: parsed.data.webEnabled,
        experienceEnabled: parsed.data.experienceEnabled,
        active: parsed.data.active,
      },
    });

    if (parsed.data.manuals.length > 0) {
      await tx.aiTechnicianManual.createMany({
        data: parsed.data.manuals.map((manual) => ({
          ...manual,
          technicianId: id,
        })),
        skipDuplicates: true,
      });
    }

    return tx.aiTechnician.findUniqueOrThrow({
      where: { id },
      include: { manuals: true },
    });
  });

  return NextResponse.json({ technician });
}

export async function DELETE(req: Request) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const canManage = await canManageTechnician(session.user, id);

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.aiTechnician.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
