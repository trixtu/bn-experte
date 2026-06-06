"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatBytes } from "@/hooks/use-file-upload";
import {
  CheckCircle2,
  FilePlus2,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type ProjectManual = {
  id: string;
  manualId: string;
  filename: string;
  originalUrl?: string;
  originalKey?: string;
  status: "in_progress" | "completed" | "cancelled" | "failed";
  createdAt: number;
  usageBytes: number;
};

function StatusIcon({ status }: { status: ProjectManual["status"] }) {
  if (status === "completed") {
    return <CheckCircle2 className="size-4 text-emerald-600" />;
  }

  if (status === "failed" || status === "cancelled") {
    return <XCircle className="size-4 text-red-600" />;
  }

  return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
}

export default function UploadPdf({
  id,
  vectorId,
  manuals,
}: {
  id: string;
  vectorId?: string;
  manuals: ProjectManual[];
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const handleUpload = async () => {
    if (!file) {
      toast.error("Alege un PDF înainte de upload.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", id);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "PDF-ul nu a putut fi încărcat.");
        return;
      }

      toast.success("Manualul a fost indexat.");
      setFile(null);
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("A apărut o eroare la upload.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (manual: ProjectManual) => {
    if (!vectorId) return;

    setDeletingId(manual.id);

    try {
      const res = await fetch("/api/vector-file", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vectorId, fileId: manual.id }),
      });

      if (!res.ok) {
        toast.error("Manualul nu a putut fi șters.");
        return;
      }

      toast.success("Manual șters.");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("A apărut o eroare la ștergere.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full justify-center sm:w-auto">
          <FilePlus2 className="size-4" />
          Manuale
          <span className="rounded bg-primary-foreground/15 px-1.5 py-0.5 text-xs">
            {manuals.length}
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manualele proiectului</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            {manuals.length === 0 ? (
              <div className="rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">
                Nu există manuale încărcate.
              </div>
            ) : (
              manuals.map((manual) => (
                <div
                  key={manual.id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-background p-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-red-50 text-red-600">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0">
                      {manual.originalUrl ? (
                        <a
                          href={manual.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-sm font-medium hover:underline"
                        >
                          {manual.filename}
                        </a>
                      ) : (
                        <p className="truncate text-sm font-medium">
                          {manual.filename}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <StatusIcon status={manual.status} />
                        <span>{manual.status}</span>
                        <span>{formatBytes(manual.usageBytes || 0)}</span>
                        {!manual.originalUrl && (
                          <span className="text-amber-700">
                            reîncarcă pentru PDF
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(manual)}
                    disabled={deletingId === manual.id}
                    aria-label="Șterge manual"
                  >
                    {deletingId === manual.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>

          <label className="block cursor-pointer rounded-md border border-dashed bg-muted/30 p-5 transition-colors hover:bg-muted/50">
            <div className="flex flex-col items-center justify-center gap-2 text-center">
              <UploadCloud className="size-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {file ? file.name : "Încarcă un PDF"}
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF-ul va fi indexat pentru întrebări în proiect.
                </p>
              </div>
            </div>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              hidden
            />
          </label>

          <Button onClick={handleUpload} disabled={loading || !file}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UploadCloud className="size-4" />
            )}
            {loading ? "Se indexează..." : "Încarcă manual"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
