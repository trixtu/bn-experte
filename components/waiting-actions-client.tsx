// app/[locale]/waiting-approval/WaitingActionsClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslations } from "next-intl";

export default function WaitingActionsClient({ locale }: { locale: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const t = useTranslations();

  // verificare status user la endpointul tău (implementare backend necesară)
  const checkStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users/me"); // => { status: "pending" | "active" }
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();

      if (data.status === "active") {
        toast.success(t("WaitingApproval.Responde.aprobat"));
        // redirecționează către dashboardul localizat
        router.push(`/${locale}/dashboard`);
      } else {
        toast(t("WaitingApproval.Responde.waiting"), { icon: "⏳" });
      }
    } catch (err) {
      console.error(err);
      toast.error(t("WaitingApproval.Responde.error"));
    } finally {
      setLoading(false);
    }
  };

  // sign out simplu (apelează API-ul tău de sign-out)
  const signOut = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/sign-out", { method: "POST" });
      if (!res.ok) throw new Error("Sign out failed");
      toast.success("Deconectat");
      router.push(`/${locale}/sign-in`);
    } catch (err) {
      console.error(err);
      toast.error("Eroare la deconectare");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={checkStatus}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Se verifică..." : "Verifică status"}
      </button>

      <button
        onClick={signOut}
        disabled={loading}
        className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
      >
        Ieși din cont
      </button>
    </>
  );
}
