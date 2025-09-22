import ManualsForm from "@/components/manuals-form";
import { prisma } from "@/lib/prisma";
import React from "react";

const ManualsPage = async () => {
  const manuals = await prisma.manual.findMany();

  return <ManualsForm manuals={manuals} />;
};

export default ManualsPage;
