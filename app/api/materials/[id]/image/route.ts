import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

import { s3 } from "@/app/[locale]/(main)/manuals/awss3.utils";
import { getServerSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function decodeStorageKey(key: string) {
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

function getStorageKey(fileName: string, url: string) {
  if (fileName.includes("/")) return decodeStorageKey(fileName);

  try {
    const pathname = decodeStorageKey(
      new URL(url).pathname.replace(/^\/+/, ""),
    );
    if (pathname) return pathname;
  } catch {
    // Keep the legacy fallback below for older material rows.
  }

  return `uploads/${fileName}`;
}

function inferContentType(fileName: string) {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".webp")) return "image/webp";
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  return "application/octet-stream";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  const { id } = await params;
  const materialId = Number(id);

  if (!Number.isInteger(materialId)) {
    return NextResponse.json({ error: "ID material invalid" }, { status: 400 });
  }

  const material = await prisma.material.findUnique({
    where: { id: materialId },
  });

  if (!material) {
    return NextResponse.json({ error: "Material inexistent" }, { status: 404 });
  }

  const storageKey = getStorageKey(material.fileName, material.url);

  try {
    const object = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME ?? "",
        Key: storageKey,
      }),
    );

    if (!object.Body) {
      return NextResponse.json(
        { error: "Imaginea nu are conținut." },
        { status: 404 },
      );
    }

    const bytes = await object.Body.transformToByteArray();
    const body = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;

    return new NextResponse(body, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          material.fileName.split("/").pop() ?? "material",
        )}"`,
        "Content-Type":
          object.ContentType ?? inferContentType(material.fileName),
      },
    });
  } catch (error) {
    console.error("Material image read failed:", {
      materialId,
      storageKey,
      error,
    });

    return NextResponse.json(
      { error: "Imaginea nu a putut fi citită din storage." },
      { status: 404 },
    );
  }
}
