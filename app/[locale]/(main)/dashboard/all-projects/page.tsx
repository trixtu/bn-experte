import { getServerSession } from "@/lib/get-session";
import { unauthorized } from "next/navigation";
import AllAsistants from "./all-assistants";
import { getAsistants } from "../actions";
import { openai } from "@/lib/openai";

export const dynamic = "force-dynamic";

const page = async () => {
  const session = await getServerSession();
  const user = session?.user;

  if (!user) unauthorized();

  const myAssistants = await getAsistants();
  const projects = await Promise.all(
    myAssistants.data.map(async (assistant) => {
      const vectorStoreId =
        assistant.tool_resources?.file_search?.vector_store_ids?.[0] ||
        assistant.metadata?.vectorStoreId;
      let manualCount = 0;

      if (typeof vectorStoreId === "string" && vectorStoreId.length > 0) {
        try {
          const files = await openai.vectorStores.files.list(vectorStoreId, {
            limit: 100,
          });
          manualCount = files.data.length;
        } catch (error) {
          console.error("Failed to load manual count", error);
        }
      }

      return {
        id: assistant.id,
        name: assistant.name ?? "Proiect fără nume",
        model:
          typeof assistant.metadata?.chatModel === "string"
            ? assistant.metadata.chatModel
            : assistant.model,
        assistantModel: assistant.model,
        instructions: assistant.instructions ?? "",
        createdAt: assistant.created_at,
        manualCount,
        vectorStoreId:
          typeof vectorStoreId === "string" ? vectorStoreId : undefined,
      };
    }),
  );

  return (
    <div className="w-full">
      <AllAsistants
        projects={projects}
        canEdit={session.user.role === "admin" || session.user.role === "owner"}
        canDelete={session.user.role === "admin"}
      />
    </div>
  );
};

export default page;
