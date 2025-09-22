import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/users";

import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser(); // ar trebui să returneze user sau null
  if (!user.user)
    return NextResponse.json({ status: "anonymous" }, { status: 200 });
  // dacă păstrezi status în DB:
  const dbUser = await prisma.user.findUnique({ where: { id: user.user.id } });
  return NextResponse.json({ status: dbUser?.status ?? "pending" });
}
