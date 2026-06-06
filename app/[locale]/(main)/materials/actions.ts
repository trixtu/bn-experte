"use server";

import { revalidatePath } from "next/cache";

import { getServerSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { deleteFileToS3 } from "../manuals/awss3.utils";

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
    // Keep the legacy fallback below for old rows.
  }

  return `uploads/${fileName}`;
}

export async function deleteMaterial(materialId: number) {
  if (!materialId) throw new Error("Missing materialId");

  try {
    const session = await getServerSession();

    if (!session?.user) {
      throw new Error("Nu ești autentificat.");
    }

    const material = await prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      return { success: true, message: "Materialul era deja șters." };
    }

    await prisma.material.delete({
      where: { id: materialId },
    });

    const storageKey = getStorageKey(material.fileName, material.url);

    try {
      await deleteFileToS3(storageKey, storageKey);
    } catch (error) {
      console.error("Material deleted from DB, R2 delete failed:", error);
    }

    revalidatePath("/[locale]/materials", "page");

    return { success: true, message: "Material șters." };
  } catch (err: unknown) {
    let message = "Ștergerea a eșuat.";

    if (err instanceof Error) {
      message = err.message;
    }

    return { success: false, message };
  }
}
