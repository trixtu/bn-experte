"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { getServerSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { uploadFileToS3 } from "../manuals/awss3.utils";

const MAX_IMAGE_SIZE = 6 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function sanitizeFileName(fileName: string) {
  const safeName = fileName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return safeName || "material-image";
}

export async function createMaterialAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    throw new Error("Nu ești autentificat.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const artNummer = String(formData.get("artNummer") ?? "").trim();
  const file = formData.get("file") as File;

  if (!name || !artNummer || !(file instanceof File)) {
    throw new Error("Toate câmpurile sunt obligatorii.");
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Încarcă o imagine JPG, PNG sau WebP.");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Imaginea este prea mare. Limita este 6 MB.");
  }

  const existingMaterial = await prisma.material.findUnique({
    where: { artNummer },
    select: { id: true },
  });

  if (existingMaterial) {
    throw new Error("Art. Nummer există deja.");
  }

  const fileName = `${Date.now()}-${randomUUID()}-${sanitizeFileName(
    file.name,
  )}`;
  const storageKey = `materials/${fileName}`;

  const url = await uploadFileToS3({
    file,
    prefix: "materials",
    fileName,
  });

  if (!url) {
    throw new Error("Imaginea nu a putut fi încărcată.");
  }

  try {
    const newMaterial = await prisma.material.create({
      data: {
        name,
        artNummer,
        url,
        fileName: storageKey,
      },
    });

    revalidatePath("/[locale]/materials", "page");
    revalidatePath("/[locale]/materials/add-new", "page");

    return { success: true, message: "Material creat cu succes!", newMaterial };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new Error("Art. Nummer există deja.");
    }

    throw error;
  }
}
