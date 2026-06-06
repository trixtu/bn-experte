"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@/i18n/routing";
import {
  ArrowUpRight,
  Bot,
  CalendarDays,
  CircleAlert,
  Edit3,
  FileText,
  FolderOpen,
  Library,
  Loader2,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export type ProjectManualItem = {
  id: string;
  manualId: string;
  filename: string;
  originalUrl?: string;
  originalKey?: string;
  status: "in_progress" | "completed" | "cancelled" | "failed";
  createdAt: number;
  usageBytes: number;
  projectId: string;
  projectName: string;
  vectorStoreId: string;
  model: string;
};

type SortKey = "recent" | "name" | "project";

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp * 1000));
}

function getStatusLabel(status: ProjectManualItem["status"]) {
  switch (status) {
    case "completed":
      return "Indexat";
    case "failed":
      return "Eșuat";
    case "cancelled":
      return "Anulat";
    default:
      return "În procesare";
  }
}

export default function ProjectManuals({
  manuals,
}: {
  manuals: ProjectManualItem[];
}) {
  const [items, setItems] = useState(manuals);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [projectFilter, setProjectFilter] = useState("all");
  const [editingManual, setEditingManual] = useState<ProjectManualItem | null>(
    null,
  );
  const [editedName, setEditedName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const projects = useMemo(() => {
    const uniqueProjects = new Map<string, string>();
    items.forEach((manual) => {
      uniqueProjects.set(manual.projectId, manual.projectName);
    });

    return [...uniqueProjects.entries()].sort((a, b) =>
      a[1].localeCompare(b[1]),
    );
  }, [items]);

  const visibleManuals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = items.filter((manual) => {
      const matchesProject =
        projectFilter === "all" || manual.projectId === projectFilter;
      const matchesQuery =
        !normalizedQuery ||
        [manual.filename, manual.projectName, manual.model]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesProject && matchesQuery;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.filename.localeCompare(b.filename);
      if (sort === "project") return a.projectName.localeCompare(b.projectName);
      return b.createdAt - a.createdAt;
    });
  }, [items, projectFilter, query, sort]);

  const completedManuals = items.filter(
    (manual) => manual.status === "completed",
  ).length;

  const openEditDialog = (manual: ProjectManualItem) => {
    setEditingManual(manual);
    setEditedName(manual.filename);
  };

  const handleRename = async () => {
    if (!editingManual) return;

    const nextName = editedName.trim();

    if (nextName.length < 2) {
      toast.error("Numele trebuie să aibă cel puțin 2 caractere.");
      return;
    }

    setSavingId(editingManual.id);

    try {
      const res = await fetch("/api/vector-file", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vectorId: editingManual.vectorStoreId,
          fileId: editingManual.id,
          fileName: nextName,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        toast.error(data?.error || "Manualul nu a putut fi redenumit.");
        return;
      }

      setItems((current) =>
        current.map((manual) =>
          manual.id === editingManual.id &&
          manual.vectorStoreId === editingManual.vectorStoreId
            ? { ...manual, filename: nextName }
            : manual,
        ),
      );
      toast.success("Manual redenumit.");
      setEditingManual(null);
      setEditedName("");
    } catch (error) {
      console.error(error);
      toast.error("A apărut o eroare la redenumire.");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (manual: ProjectManualItem) => {
    setDeletingId(manual.id);

    try {
      const res = await fetch("/api/vector-file", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vectorId: manual.vectorStoreId,
          fileId: manual.id,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        toast.error(data?.error || "Manualul nu a putut fi șters.");
        return;
      }

      setItems((current) =>
        current.filter(
          (item) =>
            item.id !== manual.id || item.vectorStoreId !== manual.vectorStoreId,
        ),
      );
      toast.success("Manual șters.");
    } catch (error) {
      console.error(error);
      toast.error("A apărut o eroare la ștergere.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-3 py-4 sm:px-5 lg:px-8">
      <section className="rounded-lg border bg-background px-4 py-4 shadow-xs sm:px-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-md border bg-muted">
              <Library className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-normal">
                Manuale din proiecte
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                PDF-urile încărcate în proiecte, gata de deschis sau folosit în
                chat.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="size-3.5" />
              Manuale
            </div>
            <p className="mt-2 text-2xl font-semibold">{items.length}</p>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FolderOpen className="size-3.5" />
              Proiecte
            </div>
            <p className="mt-2 text-2xl font-semibold">{projects.length}</p>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Bot className="size-3.5" />
              Indexate
            </div>
            <p className="mt-2 text-2xl font-semibold">{completedManuals}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 rounded-lg border bg-background p-3 shadow-xs lg:grid-cols-[minmax(0,1fr)_220px_190px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Caută manual sau proiect..."
            className="pl-9"
          />
        </div>

        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrează proiect" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate proiectele</SelectItem>
            {projects.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Cele mai recente</SelectItem>
              <SelectItem value="name">Nume A-Z</SelectItem>
              <SelectItem value="project">După proiect</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {visibleManuals.length === 0 ? (
        <section className="flex min-h-[360px] items-center justify-center rounded-lg border border-dashed bg-background p-8 text-center">
          <div className="max-w-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-md border bg-muted">
              <FileText className="size-5 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-base font-semibold">
              Nu există manuale găsite
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Încarcă un PDF din pagina unui proiect sau schimbă filtrele.
            </p>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleManuals.map((manual) => (
            <article
              key={`${manual.projectId}-${manual.id}`}
              className="flex min-h-56 flex-col justify-between rounded-lg border bg-background p-4 shadow-xs transition-colors hover:border-foreground/20"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-red-50 text-red-600">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="line-clamp-2 text-base font-semibold">
                        {manual.filename}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3.5" />
                          {formatDate(manual.createdAt)}
                        </span>
                        <span>{formatBytes(manual.usageBytes)}</span>
                      </div>
                    </div>
                  </div>

                  <Badge variant="secondary" className="shrink-0">
                    {getStatusLabel(manual.status)}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-2">
                  <ManualInfoRow label="Proiect" value={manual.projectName} />
                  <ManualInfoRow label="Model" value={manual.model} />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  {manual.originalUrl ? (
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={manual.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Deschide PDF
                        <ArrowUpRight className="size-4" />
                      </a>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      Reîncarcă PDF
                    </Button>
                  )}

                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/dashboard/project/${manual.projectId}`}>
                      Proiect
                      <FolderOpen className="size-4" />
                    </Link>
                  </Button>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(manual)}
                    aria-label="Editează manual"
                  >
                    <Edit3 className="size-4" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={deletingId === manual.id}
                        aria-label="Șterge manual"
                      >
                        {deletingId === manual.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <div className="flex flex-col gap-2 max-sm:items-center sm:flex-row sm:gap-4">
                        <div
                          className="flex size-9 shrink-0 items-center justify-center rounded-full border"
                          aria-hidden="true"
                        >
                          <CircleAlert className="size-4 opacity-80" />
                        </div>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Ștergi manualul?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Manualul „{manual.filename}” va fi eliminat din
                            proiect, vector store și biblioteca de PDF-uri.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anulează</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(manual)}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          Șterge
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      <Dialog
        open={Boolean(editingManual)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingManual(null);
            setEditedName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editează manualul</DialogTitle>
            <DialogDescription>
              Schimbă numele afișat în proiect și în biblioteca de manuale.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="manual-name">
              Nume manual
            </label>
            <Input
              id="manual-name"
              value={editedName}
              onChange={(event) => setEditedName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleRename();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingManual(null);
                setEditedName("");
              }}
            >
              Anulează
            </Button>
            <Button
              onClick={handleRename}
              disabled={!editingManual || savingId === editingManual.id}
            >
              {savingId === editingManual?.id && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Salvează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function ManualInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
