import { openai } from "@/lib/openai";
import AssistantCard from "../assistant-card";
import { getServerSession } from "@/lib/get-session";
import { unauthorized } from "next/navigation";

const page = async () => {
  const session = await getServerSession();
  const user = session?.user;

  if (!user) unauthorized();

  const myAssistants = await openai.beta.assistants.list({
    order: "desc",
    limit: 20,
  });

  return myAssistants.data.length > 0 ? (
    <div className="grid grid-cols-3 gap-4">
      {myAssistants.data.map((assistant) => (
        <AssistantCard key={assistant.id} assistant={assistant} />
      ))}
    </div>
  ) : (
    <div className="w-full flex items-center justify-center mt-20">
      <h1 className="text-3xl"> No Projects</h1>
    </div>
  );
};

export default page;
