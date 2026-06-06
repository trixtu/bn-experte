import { getServerSession } from "@/lib/get-session";
import { openai } from "@/lib/openai";
import { unauthorized } from "next/navigation";
import ProjectManuals, { type ProjectManualItem } from "./project-manuals";
import { getPublicFileUrl } from "./awss3.utils";

export const dynamic = "force-dynamic";

const ManualsPage = async () => {
  const session = await getServerSession();

  if (!session?.user) unauthorized();

  const assistants = await openai.beta.assistants.list({
    order: "desc",
    limit: 100,
  });

  const manuals = (
    await Promise.all(
      assistants.data.map(async (assistant) => {
        const vectorStoreId =
          assistant.tool_resources?.file_search?.vector_store_ids?.[0] ||
          assistant.metadata?.vectorStoreId;

        if (typeof vectorStoreId !== "string" || !vectorStoreId) {
          return [];
        }

        try {
          const vectorFiles = await openai.vectorStores.files.list(
            vectorStoreId,
            {
              limit: 100,
            },
          );

          return Promise.all(
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
                projectId: assistant.id,
                projectName: assistant.name ?? "Proiect fără nume",
                vectorStoreId,
                model:
                  typeof assistant.metadata?.chatModel === "string"
                    ? assistant.metadata.chatModel
                    : assistant.model,
              } satisfies ProjectManualItem;
            }),
          );
        } catch (error) {
          console.error("Failed to load project manuals", error);
          return [];
        }
      }),
    )
  ).flat();

  return <ProjectManuals manuals={manuals} />;
};

export default ManualsPage;
