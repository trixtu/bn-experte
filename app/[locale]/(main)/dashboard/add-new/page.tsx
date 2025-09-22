import React from "react";
import { FormAddNewProject } from "./_components/form-add-new-project";
import { getServerSession } from "@/lib/get-session";
import { unauthorized } from "next/navigation";
import { openai } from "@/lib/openai";
import { User } from "@/prisma/lib/generated/prisma";

const AddnewPage = async () => {
  const list = await openai.models.list();

  const models = list.data;

  const session = await getServerSession();
  const user = session?.user as User;

  if (!user) unauthorized();

  return (
    <div className="w-full flex items-center justify-center">
      <FormAddNewProject user={user} models={models} />
    </div>
  );
};

export default AddnewPage;
