// app/[locale]/waiting-approval/page.tsx
import WaitingActionsClient from "@/components/waiting-actions-client";
import { getLocale, getTranslations } from "next-intl/server";

export default async function Page() {
  const locale = await getLocale();
  const t = await getTranslations();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-semibold mb-4">
          {t("WaitingApproval.title")}
        </h1>
        <p className="text-slate-700 mb-6">
          {t("WaitingApproval.description")}
        </p>

        <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-6">
          <li>{t("WaitingApproval.step1")}</li>
          <li>{t("WaitingApproval.step2")}</li>
          <li>{t("WaitingApproval.step3")}</li>
        </ul>

        <div className="flex gap-3">
          {/* Client component se ocupă de sign-out și check status */}
          <WaitingActionsClient locale={locale} />
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          {t("WaitingApproval.note")}
        </p>
      </div>
    </div>
  );
}
