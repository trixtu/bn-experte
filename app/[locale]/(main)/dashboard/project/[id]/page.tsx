import { openai } from "@/lib/openai";
import { notFound } from "next/navigation";
import React from "react";
import { Bot, FileText, FolderOpen } from "lucide-react";
import UploadPdf from "../../add-new/_components/upload-pdf";
import Chat from "../../chat";
import { getPublicFileUrl } from "@/app/[locale]/(main)/manuals/awss3.utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ProjectManual = {
  id: string;
  manualId: string;
  filename: string;
  originalUrl?: string;
  originalKey?: string;
  status: "in_progress" | "completed" | "cancelled" | "failed";
  createdAt: number;
  usageBytes: number;
};

type ProjectTechnician = {
  id: string;
  name: string;
  domain: string;
  brands?: string;
  productTypes?: string;
  responseStyle: string;
  webEnabled: boolean;
  experienceEnabled: boolean;
  manualIds: string[];
};

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  let assistant;
  try {
    assistant = await openai.beta.assistants.retrieve(id);
  } catch (e) {
    console.log(e);
    return notFound();
  }

  const vectorStoreId =
    assistant.tool_resources?.file_search?.vector_store_ids?.[0] ||
    assistant.metadata?.vectorStoreId;
  const chatModel =
    typeof assistant.metadata?.chatModel === "string"
      ? assistant.metadata.chatModel
      : assistant.model;

  let manuals: ProjectManual[] = [];
  let technicians: ProjectTechnician[] = [];

  if (vectorStoreId) {
    try {
      const vectorFiles = await openai.vectorStores.files.list(vectorStoreId, {
        limit: 100,
      });

      manuals = await Promise.all(
        vectorFiles.data.map(async (vectorFile) => {
          const file = await openai.files.retrieve(vectorFile.id);
          const originalKey =
            typeof vectorFile.attributes?.originalKey === "string"
              ? vectorFile.attributes.originalKey
              : undefined;

          return {
            id: file.id,
            manualId:
              typeof vectorFile.attributes?.manualId === "string"
                ? vectorFile.attributes.manualId
                : file.id,
            filename:
              typeof vectorFile.attributes?.fileName === "string"
                ? vectorFile.attributes.fileName
                : file.filename,
            originalUrl:
              originalKey
                ? getPublicFileUrl(originalKey)
                : typeof vectorFile.attributes?.originalUrl === "string"
                  ? vectorFile.attributes.originalUrl
                  : undefined,
            originalKey,
            status: vectorFile.status,
            createdAt: vectorFile.created_at,
            usageBytes: vectorFile.usage_bytes,
          };
        }),
      );
    } catch (error) {
      console.error("Failed to load project manuals", error);
    }
  }

  try {
    const aiTechnicians = await prisma.aiTechnician.findMany({
      where: {
        active: true,
        OR: [{ manuals: { some: { projectId: id } } }, { manuals: { none: {} } }],
      },
      include: { manuals: true },
      orderBy: [{ domain: "asc" }, { name: "asc" }],
    });

    technicians = aiTechnicians.map((technician) => ({
      id: technician.id,
      name: technician.name,
      domain: technician.domain,
      brands: technician.brands ?? undefined,
      productTypes: technician.productTypes ?? undefined,
      responseStyle: technician.responseStyle,
      webEnabled: technician.webEnabled,
      experienceEnabled: technician.experienceEnabled,
      manualIds: technician.manuals
        .filter((manual) => manual.projectId === id)
        .map((manual) => manual.manualId),
    }));
  } catch (error) {
    console.error("Failed to load AI technicians", error);
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-3 py-4 sm:px-5 lg:px-8">
      <section className="rounded-lg border bg-background px-4 py-4 shadow-xs sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-md border bg-muted">
              <FolderOpen className="size-5 text-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-normal">
                {assistant.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Bot className="size-3.5" />
                  {chatModel}
                </span>
                <span className="inline-flex items-center gap-1">
                  <FileText className="size-3.5" />
                  {manuals.length} manuale
                </span>
              </div>
            </div>
          </div>

          <UploadPdf
            id={id}
            manuals={manuals}
            vectorId={vectorStoreId}
          />
        </div>
      </section>

      <Chat assistantId={assistant.id} manuals={manuals} technicians={technicians} />
    </main>
  );
};

export default page;
