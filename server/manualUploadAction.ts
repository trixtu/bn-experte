// server/manualUploadAction.ts
"use server";

import { getCurrentUser } from "@/server/users";
import { prisma } from "@/lib/prisma";
import {
  deleteFileToS3,
  uploadFileToS3,
} from "@/app/[locale]/(main)/manuals/awss3.utils";

export const manualUploadAction = async (formData: FormData) => {
  const file = formData.get("file") as File;

  if (!(file instanceof File)) {
    throw new Error("No file provided");
  }

  if (file.size > 100 * 1024 * 1024) {
    throw new Error("File size must be less than 100MB");
  }

  const user = await getCurrentUser();

  const fileName = `manual-${file.name}`;
  const url = await uploadFileToS3({
    file,
    prefix: `users/${user.user.id}`,
    fileName,
  });

  if (!url) {
    throw new Error("Failed to upload file");
  }

  const manual = await prisma.manual.create({
    data: {
      url,
      fileName,
      size: file.size,
      type: file.type,
    },
  });

  return manual;
};

export const manualDeleteAction = async (fileId: string) => {
  const user = await getCurrentUser();

  const manual = await prisma.manual.findUnique({
    where: {
      id: fileId,
    },
  });

  if (!manual) throw new Error("Manual not found");

  const prefix = `users/${user.user.id}/${manual.fileName}`;

  await deleteFileToS3(manual.fileName, prefix);

  await prisma.manual.delete({
    where: { id: manual.id },
  });

  return true;
};
