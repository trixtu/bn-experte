
import { getServerSession } from "@/lib/get-session";
import App from "./_components/app";
import { getAssistantsFromDb } from "./actions/assistant-actions";
import { unauthorized } from "next/navigation";



const page = async () => {
  const session = await getServerSession();
  const user = session?.user;

  if (!user) unauthorized();
  if (user?.role !== "member" && user?.role !== "admin") unauthorized();

  // if (user?.role === "") unauthorized();

  const assistants = await getAssistantsFromDb() || []; 

  return <App assistants={assistants} user={user} />

}

export default page