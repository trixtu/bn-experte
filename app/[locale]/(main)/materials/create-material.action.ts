"use server";

import { prisma } from "@/lib/prisma";
import { uploadFileToS3 } from "../manuals/awss3.utils";

export async function createMaterialAction(formData: FormData) {
    const name = formData.get("name") as string;
    const artNummer = formData.get("artNummer") as string;
    const file = formData.get("file") as File;

    // Validări suplimentare dacă este necesar
    if (!name || !artNummer || !(file instanceof File)) {
        throw new Error("Toate câmpurile sunt obligatorii");
    }

    if (!file) throw new Error("File is required");
    const fileName = `${Date.now()}-${file.name}`;

    const url = await uploadFileToS3({
        file,
        prefix: "uploads",
        fileName: fileName,
    })
    
    if(!url) {
        throw new Error("Failed to upload file");
    }

    const newMaterial = await prisma.material.create({
        data: {
            name,
            artNummer,
            url: url,
            fileName: fileName, 
        },
    })

    return { success: true, message: "Material creat cu succes!" ,newMaterial };
}