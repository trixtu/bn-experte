import { redirect } from "@/i18n/routing";
import { getServerSession } from "@/lib/get-session";
import { getLocale } from "next-intl/server";

import { ReactNode } from "react";

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession();
  const user = session?.user;
  const locale = await getLocale();

  if (user) redirect({ href: `/dashboard`, locale });

  return children;
}
