import { getServerSession } from "@/lib/get-session";
import { unauthorized } from "next/navigation";
import AllAsistants from "./all-assistants";
import { getAsistants } from "../actions";

const page = async () => {
  const session = await getServerSession();
  const user = session?.user;

  if (!user) unauthorized();

  const myAssistants = await getAsistants();

  // return myAssistants.data.length > 0 ? (
  //   <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  //     {myAssistants.data.map((assistant) => (
  //       <AssistantCard key={assistant.id} assistant={assistant} admin={admin} />
  //     ))}
  //   </div>
  // ) : (
  //   <div className="w-full flex items-center justify-center mt-20">
  //     <h1 className="text-3xl"> No Projects</h1>
  //   </div>
  // );
  return (
    <div className="w-full flex  items-center justify-center">
      <AllAsistants assistants={myAssistants.data} />
    </div>
  );
};

export default page;
