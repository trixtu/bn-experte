import React from "react";
import { FormAddNewProject } from "./_components/form-add-new-project";
import { getServerSession } from "@/lib/get-session";
import { unauthorized } from "next/navigation";
import { getTranslations } from "next-intl/server";

const AddnewPage = async () => {
  const session = await getServerSession();
  const user = session?.user;

  if (!user) unauthorized();
  return (
    <div className="w-full flex items-center justify-center">
      <FormAddNewProject user={user} />
    </div>
  );
};

export default AddnewPage;
