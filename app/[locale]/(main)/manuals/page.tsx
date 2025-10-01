import ManualsForm from "@/components/manuals-form";
import { prisma } from "@/lib/prisma";
import React from "react";

const ManualsPage = async () => {
  const manuals = await prisma.manual.findMany();

  return (
    <div className="w-full flex  items-center justify-center">
      <ManualsForm manuals={manuals} />
    </div>
  );
};

export default ManualsPage;
