import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export function getR2Endpoint() {
  return process.env.R2_ENDPOINT ?? process.env.AWS_S3_API_URL ?? "";
}

export function getR2BucketName() {
  return process.env.R2_BUCKET_NAME ?? process.env.AWS_S3_BUCKET_NAME ?? "";
}

export const s3 = new S3Client({
  region: "auto",
  endpoint: getR2Endpoint(),
  credentials: {
    accessKeyId:
      process.env.R2_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey:
      process.env.R2_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

export function getPublicFileUrl(key: string) {
  const baseUrl = process.env.R2_URL?.replace(/\/+$/, "");

  if (!baseUrl) return undefined;

  return `${baseUrl}/${key.replace(/^\/+/, "")}`;
}

export async function uploadFileToS3(params: {
  file: File;
  prefix: string;
  fileName?: string;
}) {
  const fileBuffer = await params.file.arrayBuffer();
  const buffer = Buffer.from(fileBuffer);

  const uniqueFileName = `${params.prefix}/${params.fileName}`;

  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: uniqueFileName,
    Body: buffer,
    ContentType: params.file.type,
  });

  try {
    await s3.send(command);

    return getPublicFileUrl(uniqueFileName);
  } catch (error) {
    console.log(error);
  }
}

export async function deleteFileToS3(fileName: string, prefix: string) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: getR2BucketName(), // numele bucket-ului
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
