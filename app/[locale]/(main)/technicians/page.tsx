import { getServerSession } from "@/lib/get-session";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { unauthorized } from "next/navigation";
import TechniciansClient, {
  type ManualOption,
  type TechnicianItem,
} from "./technicians-client";

export const dynamic = "force-dynamic";

export default async function TechniciansPage() {
  const session = await getServerSession();

  if (!session?.user) unauthorized();

  const [technicians, manualOptions] = await Promise.all([
    prisma.aiTechnician.findMany({
      include: { manuals: true },
      orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
    }),
    loadManualOptions(),
  ]);

  const items: TechnicianItem[] = technicians.map((technician) => ({
    id: technician.id,
    name: technician.name,
    domain: technician.domain,
    brands: technician.brands,
    productTypes: technician.productTypes,
    instructions: technician.instructions,
    responseStyle: technician.responseStyle,
    webEnabled: technician.webEnabled,
    experienceEnabled: technician.experienceEnabled,
    active: technician.active,
    createdAt: technician.createdAt.toISOString(),
    updatedAt: technician.updatedAt.toISOString(),
    canManage:
      session.user.role === "admin" ||
      session.user.role === "owner" ||
      technician.createdById === session.user.id,
    manuals: technician.manuals.map((manual) => ({
      id: manual.id,
      projectId: manual.projectId,
      projectName: manual.projectName,
      vectorStoreId: manual.vectorStoreId,
      manualId: manual.manualId,
      manualName: manual.manualName,
    })),
  }));

  return (
    <TechniciansClient
      initialTechnicians={items}
      manualOptions={manualOptions}
    />
  );
}

async function loadManualOptions() {
  try {
    const assistants = await openai.beta.assistants.list({
      order: "desc",
      limit: 100,
    });

    const options = (
      await Promise.all(
        assistants.data.map(async (assistant) => {
          const vectorStoreId =
            assistant.tool_resources?.file_search?.vector_store_ids?.[0] ||
            assistant.metadata?.vectorStoreId;

          if (typeof vectorStoreId !== "string" || !vectorStoreId) {
            return [];
          }

          const vectorFiles = await openai.vectorStores.files.list(
            vectorStoreId,
            {
              limit: 100,
            },
          );

          return Promise.all(
            vectorFiles.data.map(async (vectorFile) => {
              const fileName =
                typeof vectorFile.attributes?.fileName === "string"
                  ? vectorFile.attributes.fileName
                  : (await openai.files.retrieve(vectorFile.id)).filename;

              return {
                projectId: assistant.id,
                projectName: assistant.name ?? "Proiect fără nume",
                vectorStoreId,
                manualId:
                  typeof vectorFile.attributes?.manualId === "string"
                    ? vectorFile.attributes.manualId
                    : vectorFile.id,
                manualName: fileName,
              } satisfies ManualOption;
            }),
          );
        }),
      )
    ).flat();

    return options.sort((a, b) =>
      `${a.projectName} ${a.manualName}`.localeCompare(
        `${b.projectName} ${b.manualName}`,
      ),
    );
  } catch (error) {
    console.error("Failed to load manual options for technicians", error);
    return [];
  }
}
