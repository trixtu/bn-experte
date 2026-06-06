import { unauthorized } from "next/navigation";

import { getServerSession } from "@/lib/get-session";
import { FormAddNewMaterial } from "../_components/form-add-new-material";

export default async function AddNewMaterialPage() {
  const session = await getServerSession();
  const user = session?.user;

  if (!user) unauthorized();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
      <FormAddNewMaterial />
    </main>
  );
}
