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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  Bot,
  CalendarDays,
  CircleAlert,
  Edit3,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { deleteAssistant, updateProject } from "../actions";

export type ProjectSummary = {
  id: string;
  name: string;
  model: string;
  assistantModel: string;
  instructions: string;
  createdAt: number;
  manualCount: number;
  vectorStoreId?: string;
};

type SortKey = "recent" | "name" | "manuals";

type ProjectDraft = {
  id: string;
  name: string;
  model: string;
  instructions: string;
};

const modelOptions = [
  {
    id: "gpt-5.4-mini",
    label: "Rapid",
    description: "Răspunsuri rapide pentru întrebări uzuale.",
  },
  {
    id: "gpt-5.4",
    label: "Precizie",
    description: "Mai bun pentru manuale dense și răspunsuri lungi.",
  },
  {
    id: "gpt-5.5",
    label: "Expert",
    description: "Maxim de calitate pentru cazuri dificile.",
  },
];

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp * 1000));
}

export default function AllAsistants({
  projects,
  canEdit,
  canDelete,
}: {
  projects: ProjectSummary[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [items, setItems] = useState(projects);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [editingProject, setEditingProject] = useState<ProjectDraft | null>(
    null,
  );
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? items.filter((project) =>
          [project.name, project.model, project.assistantModel]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery),
        )
      : items;

    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "manuals") return b.manualCount - a.manualCount;
      return b.createdAt - a.createdAt;
    });
  }, [items, query, sort]);

  const totalManuals = items.reduce(
    (total, project) => total + project.manualCount,
    0,
  );
  const indexedProjects = items.filter((project) => project.manualCount > 0);

  const handleDelete = async (project: ProjectSummary) => {
    setDeletingId(project.id);

    try {
      const result = await deleteAssistant(project.id);

      if (!result.success) {
        toast.error(result.message || "Proiectul nu a putut fi șters.");
        return;
      }

      setItems((current) => current.filter((item) => item.id !== project.id));
      toast.success("Proiect șters.");
    } catch (error) {
      console.error(error);
      toast.error("A apărut o eroare la ștergere.");
    } finally {
      setDeletingId(null);
    }
  };

  const openEditDialog = (project: ProjectSummary) => {
    setEditingProject({
      id: project.id,
      name: project.name,
      model: project.model,
      instructions: project.instructions,
    });
  };

  const handleUpdate = async () => {
    if (!editingProject || savingEdit) return;

    setSavingEdit(true);

    try {
      const result = await updateProject(editingProject);

      if (!result.success || !result.project) {
        toast.error(result.message || "Proiectul nu a putut fi actualizat.");
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === editingProject.id
            ? {
                ...item,
                name: result.project.name,
                model: result.project.model,
                assistantModel: result.project.assistantModel,
                instructions: result.project.instructions,
              }
            : item,
        ),
      );
      setEditingProject(null);
      toast.success("Proiect actualizat.");
    } catch (error) {
      console.error(error);
      toast.error("A apărut o eroare la actualizare.");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-3 py-4 sm:px-5 lg:px-8">
      <section className="rounded-lg border bg-background px-4 py-4 shadow-xs sm:px-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-md border bg-muted">
              <FolderOpen className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-normal">
                Toate proiectele
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {items.length} proiecte, {totalManuals} manuale indexate
              </p>
            </div>
          </div>

          <Button asChild className="w-full justify-center sm:w-auto">
            <Link href="/dashboard/add-new">
              <Plus className="size-4" />
              Adaugă proiect
            </Link>
          </Button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FolderOpen className="size-3.5" />
              Proiecte
            </div>
            <p className="mt-2 text-2xl font-semibold">{items.length}</p>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="size-3.5" />
              Manuale
            </div>
            <p className="mt-2 text-2xl font-semibold">{totalManuals}</p>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Bot className="size-3.5" />
              Cu documente
            </div>
            <p className="mt-2 text-2xl font-semibold">
              {indexedProjects.length}
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border bg-background p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Caută proiect..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Cele mai recente</SelectItem>
              <SelectItem value="name">Nume A-Z</SelectItem>
              <SelectItem value="manuals">Cele mai multe manuale</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {visibleProjects.length === 0 ? (
        <section className="flex min-h-[360px] items-center justify-center rounded-lg border border-dashed bg-background p-8 text-center">
          <div className="max-w-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-md border bg-muted">
              <FolderOpen className="size-5 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-base font-semibold">
              Nu există proiecte găsite
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Schimbă căutarea sau creează un proiect nou.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/add-new">
                <Plus className="size-4" />
                Adaugă proiect
              </Link>
            </Button>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleProjects.map((project) => (
            <article
              key={project.id}
              className="group flex min-h-56 flex-col justify-between rounded-lg border bg-background p-4 shadow-xs transition-colors hover:border-foreground/20"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted">
                      <FolderOpen className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold">
                        {project.name}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3.5" />
                          {formatDate(project.createdAt)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <FileText className="size-3.5" />
                          {project.manualCount} manuale
                        </span>
                      </div>
                    </div>
                  </div>

                  <Badge variant="secondary" className="shrink-0">
                    {project.model}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-2">
                  <ProjectInfoRow
                    label="Vector store"
                    value={project.vectorStoreId ? "Configurat" : "Lipsește"}
                  />
                  <ProjectInfoRow
                    label="Model assistant"
                    value={project.assistantModel}
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-2 border-t pt-3">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/project/${project.id}`}>
                    Deschide
                    <ArrowUpRight className="size-4" />
                  </Link>
                </Button>

                <div className="flex items-center gap-1">
                  {canEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => openEditDialog(project)}
                      aria-label="Editează proiect"
                    >
                      <Edit3 className="size-4" />
                    </Button>
                  )}

                  {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          disabled={deletingId === project.id}
                          aria-label="Șterge proiect"
                        >
                          {deletingId === project.id ? (
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
                            <AlertDialogTitle>
                              Ștergi proiectul?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Proiectul „{project.name}” și manualele indexate
                              din vector store vor fi șterse.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anulează</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(project)}
                            className={cn(
                              "bg-destructive text-white hover:bg-destructive/90",
                            )}
                          >
                            Șterge
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      <Dialog
        open={Boolean(editingProject)}
        onOpenChange={(open) => {
          if (!open && !savingEdit) setEditingProject(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editează proiect</DialogTitle>
            <DialogDescription>
              Actualizează numele, modelul de răspuns și instrucțiunile de bază.
            </DialogDescription>
          </DialogHeader>

          {editingProject && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="project-name">Nume proiect</Label>
                <Input
                  id="project-name"
                  value={editingProject.name}
                  onChange={(event) =>
                    setEditingProject((current) =>
                      current
                        ? { ...current, name: event.target.value }
                        : current,
                    )
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>Model chat</Label>
                <Select
                  value={editingProject.model}
                  onValueChange={(value) =>
                    setEditingProject((current) =>
                      current ? { ...current, model: value } : current,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Alege modelul" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          <span>{model.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {model.id}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {
                    modelOptions.find(
                      (model) => model.id === editingProject.model,
                    )?.description
                  }
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="project-instructions">Instrucțiuni</Label>
                <Textarea
                  id="project-instructions"
                  value={editingProject.instructions}
                  rows={8}
                  className="resize-none"
                  placeholder="Ex: răspunde tehnic, menționează cauza, verificările și avertizările..."
                  onChange={(event) =>
                    setEditingProject((current) =>
                      current
                        ? { ...current, instructions: event.target.value }
                        : current,
                    )
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={savingEdit}
              onClick={() => setEditingProject(null)}
            >
              Anulează
            </Button>
            <Button
              type="button"
              disabled={savingEdit || !editingProject?.name.trim()}
              onClick={handleUpdate}
            >
              {savingEdit && <Loader2 className="size-4 animate-spin" />}
              Salvează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function ProjectInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
