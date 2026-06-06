import React from "react";
import { FormAddNewProject } from "./_components/form-add-new-project";
import { getServerSession } from "@/lib/get-session";
import { unauthorized } from "next/navigation";
import { User } from "@/prisma/lib/generated/prisma";

export const dynamic = "force-dynamic";

const AddnewPage = async () => {
  const session = await getServerSession();
  const user = session?.user as User;

  if (!user) unauthorized();

  return (
    <div className="flex w-full justify-center px-3 py-6 sm:px-6 lg:px-8">
      <FormAddNewProject user={user} />
    </div>
  );
};

export default AddnewPage;
