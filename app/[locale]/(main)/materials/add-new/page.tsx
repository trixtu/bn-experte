import { getServerSession } from "@/lib/get-session";
import { User } from "@/prisma/lib/generated/prisma";
import { unauthorized } from "next/navigation";
import { FormAddNewMaterial } from "../_components/form-add-new-material";


export default async function AddNewMaterialPage() {
     const session = await getServerSession();
      const user = session?.user as User;
    
      if (!user) unauthorized();

    const materials:any[] = []; 

    return (
        
       <div className="w-full flex items-center justify-center">
            <FormAddNewMaterial user={user} materials={materials} />
        </div>
    );
}