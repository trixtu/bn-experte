import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

export default async function Home() {
  const t = await getTranslations("HomePage");

  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="mx-auto max-w-3xl text-center">
        <div className="flex items-center justify-center">
          <Image
            src="/BN-Tortechnik-Logo.svg" // direct din public
            alt="B&N Tortechnik Logo"
            width={220} // sau dimensiunea dorită
            height={120}
          />
        </div>

        <p className="text-muted-foreground mt-3 text-base text-balance sm:text-lg">
          {t("description")}
        </p>
        <div className="mx-auto mt-6 flex max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/dashboard">{t("buttons.dashboard")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sign-in">{t("buttons.sign-in")}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
