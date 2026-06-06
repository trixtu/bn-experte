"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  ImageIcon,
  Loader2,
  Package,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import type { Material } from "@/prisma/lib/generated/prisma";
import { deleteMaterial } from "./actions";

function cleanFileName(fileName: string) {
  const baseName = decodeURIComponent(fileName.split("/").pop() ?? fileName);
  return baseName.replace(/^\d+-[a-f0-9-]+-/i, "");
}

function materialImageUrl(materialId: number) {
  return `/api/materials/${materialId}/image`;
}

export default function AllMaterials({ materials }: { materials: Material[] }) {
  const [items, setItems] = useState(materials);
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const filteredMaterials = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return items;

    return items.filter((material) => {
      const searchable = [
        material.name,
        material.artNummer,
        material.fileName,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [items, query]);

  const copyArtNumber = async (material: Material) => {
    try {
      await navigator.clipboard.writeText(material.artNummer);
      setCopiedId(material.id);
      toast.success("Art. Nummer copiat.");
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      toast.error("Nu am putut copia Art. Nummer.");
    }
  };

  const handleDelete = async (material: Material) => {
    setDeletingId(material.id);

    try {
      const result = await deleteMaterial(material.id);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setItems((current) => current.filter((item) => item.id !== material.id));
      toast.success(result.message);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Materialul nu a putut fi șters.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-md border bg-background p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">Bibliotecă materiale</h2>
              <Badge variant="secondary">{items.length} materiale</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Caută după nume, cod articol sau numele fișierului.
            </p>
          </div>

          <div className="relative w-full lg:w-[360px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Caută material..."
              value={query}
            />
          </div>
        </div>
      </section>

      {filteredMaterials.length === 0 ? (
        <section className="flex min-h-[320px] flex-col items-center justify-center rounded-md border border-dashed bg-background p-8 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-md border bg-muted">
            <Package className="size-5 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">
            {items.length === 0 ? "Nu există materiale încă" : "Nu am găsit rezultate"}
          </h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {items.length === 0
              ? "Adaugă primul material cu imagine și Art. Nummer pentru biblioteca tehnică."
              : "Încearcă alt nume, alt Art. Nummer sau șterge filtrul de căutare."}
          </p>
          {items.length === 0 ? (
            <Button asChild className="mt-5">
              <Link href="/materials/add-new">
                <Package className="size-4" />
                Adaugă material
              </Link>
            </Button>
          ) : null}
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMaterials.map((material) => {
            const imageUrl = materialImageUrl(material.id);

            return (
              <article
                className="overflow-hidden rounded-md border bg-background shadow-sm transition hover:border-foreground/20 hover:shadow-md"
                key={material.id}
              >
                <a
                  className="group relative block aspect-[4/3] overflow-hidden bg-muted"
                  href={imageUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="size-8 text-muted-foreground/70" />
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={material.name}
                    className="relative z-10 size-full object-cover transition duration-200 group-hover:scale-[1.02]"
                    onError={(event) => {
                      if (!event.currentTarget.dataset.fallback) {
                        event.currentTarget.dataset.fallback = "true";
                        event.currentTarget.src = material.url;
                        return;
                      }

                      event.currentTarget.style.display = "none";
                    }}
                    src={imageUrl}
                  />
                </a>

                <div className="space-y-4 p-4">
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold">
                          {material.name}
                        </h3>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {cleanFileName(material.fileName)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="max-w-[130px] truncate"
                      >
                        {material.artNummer}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={imageUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <ExternalLink className="size-4" />
                        Deschide
                      </a>
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button
                        aria-label="Copiază Art. Nummer"
                        onClick={() => copyArtNumber(material)}
                        size="icon"
                        title="Copiază Art. Nummer"
                        type="button"
                        variant="ghost"
                      >
                        {copiedId === material.id ? (
                          <Check className="size-4 text-emerald-600" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            aria-label="Șterge material"
                            disabled={deletingId === material.id}
                            size="icon"
                            title="Șterge material"
                            type="button"
                            variant="ghost"
                          >
                            {deletingId === material.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4 text-destructive" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Ștergi materialul?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Materialul „{material.name}” va fi șters din listă
                              și fișierul asociat va fi eliminat din storage,
                              dacă este disponibil.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Anulează</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-white hover:bg-destructive/90"
                              onClick={() => handleDelete(material)}
                            >
                              Șterge
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
