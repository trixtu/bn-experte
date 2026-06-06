
import { prisma } from "@/lib/prisma";
import AllMaterials from "./all-materials";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { ImageIcon, PackagePlus } from "lucide-react";

const MaterialsPage = async () => {
  const materials = await prisma.material.findMany({
    orderBy: { id: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 lg:px-8">
      <section className="flex flex-col gap-4 rounded-md border bg-background p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md border bg-muted">
            <ImageIcon className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Materials</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Imagini tehnice, coduri articol și materiale pentru echipă.
            </p>
          </div>
        </div>

        <Button asChild>
          <Link href="/materials/add-new">
            <PackagePlus className="size-4" />
            Adaugă material
          </Link>
        </Button>
      </section>

      <AllMaterials materials={materials} />
    </main>
  );
};

export default MaterialsPage;
