"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  BrainCircuit,
  CalendarDays,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export type ExperienceItem = {
  id: string;
  technicianId: string | null;
  technicianName: string | null;
  technicianDomain: string | null;
  projectId: string | null;
  manualId: string | null;
  manualName: string | null;
  title: string;
  question: string;
  answer: string;
  symptoms: string | null;
  cause: string | null;
  solution: string | null;
  tags: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  canDelete: boolean;
};

export default function ExperienceLibrary({
  initialExperiences,
}: {
  initialExperiences: ExperienceItem[];
}) {
  const [experiences, setExperiences] = useState(initialExperiences);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const visibleExperiences = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return experiences;

    return experiences.filter((experience) =>
      [
        experience.title,
        experience.question,
        experience.answer,
        experience.symptoms,
        experience.cause,
        experience.solution,
        experience.tags,
        experience.manualName,
        experience.technicianName,
        experience.technicianDomain,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [experiences, query]);

  const deleteExperience = async (experience: ExperienceItem) => {
    setDeletingId(experience.id);

    try {
      const res = await fetch(`/api/technician-experience?id=${experience.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.error || "Experiența nu a putut fi ștearsă.");
      }

      setExperiences((current) =>
        current.filter((item) => item.id !== experience.id),
      );
      toast.success("Experiență ștearsă.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Experiența nu a putut fi ștearsă.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-3 py-4 sm:px-5 lg:px-8">
      <section className="rounded-lg border bg-background px-4 py-4 shadow-xs sm:px-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-md border bg-muted">
              <BrainCircuit className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-normal sm:text-2xl">
                Experiență tehnician
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Cazuri salvate din chat, folosite automat ca memorie practică la
                întrebări similare.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="w-fit">
            {experiences.length} cazuri
          </Badge>
        </div>
      </section>

      <section className="rounded-lg border bg-background p-3 shadow-xs">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Caută după cod, produs, simptom sau soluție..."
            className="pl-9"
          />
        </div>
      </section>

      {visibleExperiences.length === 0 ? (
        <section className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed bg-background p-8 text-center">
          <div className="max-w-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-md border bg-muted">
              <AlertCircle className="size-5 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-base font-semibold">
              Nu există experiențe găsite
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Salvează un răspuns bun din chat ca să construiești memoria
              tehnicianului.
            </p>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {visibleExperiences.map((experience) => (
            <article
              key={experience.id}
              className="rounded-lg border bg-background p-4 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold">
                    {experience.title}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" />
                      {formatDate(experience.updatedAt)}
                    </span>
                    {experience.manualName && (
                      <Badge variant="outline">{experience.manualName}</Badge>
                    )}
                    {experience.technicianName && (
                      <Badge variant="secondary">
                        {experience.technicianName}
                      </Badge>
                    )}
                  </div>
                </div>
                {experience.canDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={deletingId === experience.id}
                    onClick={() => deleteExperience(experience)}
                    aria-label="Șterge experiență"
                  >
                    <Trash2
                      className={cn(
                        "size-4",
                        deletingId === experience.id && "animate-pulse",
                      )}
                    />
                  </Button>
                )}
              </div>

              <div className="mt-4 grid gap-3 text-sm">
                <InfoBlock label="Simptom / întrebare" value={experience.question} />
                {experience.cause && (
                  <InfoBlock label="Cauză" value={experience.cause} />
                )}
                {experience.solution && (
                  <InfoBlock label="Soluție" value={experience.solution} />
                )}
                {experience.tags && (
                  <div className="flex flex-wrap gap-1.5">
                    {experience.tags.split(",").map((tag) => (
                      <Badge key={tag.trim()} variant="secondary">
                        {tag.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/35 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 line-clamp-5 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
