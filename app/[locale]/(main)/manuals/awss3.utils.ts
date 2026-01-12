import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.AWS_S3_API_URL ?? "",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

export async function uploadFileToS3(params: {
  file: File;
  prefix: string;
  fileName?: string;
}) {
  const fileBuffer = await params.file.arrayBuffer();
  const buffer = Buffer.from(fileBuffer);

  const uniqueFileName = `${params.prefix}/${params.fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME ?? "",
    Key: uniqueFileName,
    Body: buffer,
    ContentType: params.file.type,
  });

  try {
    await s3.send(command);

    return `${process.env.R2_URL}/${uniqueFileName}`;
  } catch (error) {
    console.log(error);
  }
}

export async function deleteFileToS3(fileName: string, prefix: string) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME ?? "", // numele bucket-ului
      Key: prefix, // cheia / path-ul fișierulu
    });

    await s3.send(command);

    console.log(`File deleted successfully: ${fileName}`);
    return true;
  } catch (err) {
    console.error("Failed to delete file:", err);
    throw new Error("Delete failed");
  }
}
