
import { prisma } from "@/lib/prisma";
import AllMaterials from "./all-materials";

const MaterialsPage = async () => {
  const materials = await prisma.material.findMany();

  return (
    <div className="w-full flex  items-center justify-center">
      <AllMaterials materials={materials} />
    </div>
  );
};

export default MaterialsPage;