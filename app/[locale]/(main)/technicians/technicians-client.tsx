"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Bot,
  BrainCircuit,
  CalendarDays,
  Edit3,
  FileText,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export type ManualOption = {
  projectId: string;
  projectName: string;
  vectorStoreId: string;
  manualId: string;
  manualName: string;
};

export type TechnicianItem = {
  id: string;
  name: string;
  domain: string;
  brands: string | null;
  productTypes: string | null;
  instructions: string;
  responseStyle: string;
  webEnabled: boolean;
  experienceEnabled: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  canManage: boolean;
  manuals: Array<ManualOption & { id: string }>;
};

type TechnicianDraft = {
  id?: string;
  name: string;
  domain: string;
  brands: string;
  productTypes: string;
  instructions: string;
  responseStyle: string;
  webEnabled: boolean;
  experienceEnabled: boolean;
  active: boolean;
  manualKeys: string[];
};

const defaultInstructions = [
  "Ești un technician AI specializat. Răspunzi ca un technician senior: clar, practic, conversațional și prudent.",
  "Folosește manualele asociate ca sursă principală. Dacă informația nu apare în manual, spune clar acest lucru.",
  "Folosește experiența salvată doar ca ajutor practic. Manualul are prioritate.",
  "Pentru intervenții electrice, sisteme antifoc sau mecanisme grele, include avertizare și recomandă technician autorizat când este cazul.",
].join("\n");

const emptyDraft: TechnicianDraft = {
  name: "",
  domain: "Porți industriale",
  brands: "",
  productTypes: "",
  instructions: defaultInstructions,
  responseStyle: "diagnostic",
  webEnabled: true,
  experienceEnabled: true,
  active: true,
  manualKeys: [],
};

const berichtInstructions = [
  "Ești un asistent AI specializat în redactarea și verificarea rapoartelor tehnice de lucru: Arbeitsbericht, Servicebericht, Wartungsbericht, Störungsbericht și Übergabebericht.",
  "Scopul tău este să ajuți utilizatorul să transforme observațiile tehnicianului într-un Bericht clar, complet, profesional și ușor de predat clientului sau firmei.",
  "Răspunde conversațional, dar structurează rezultatul ca un raport tehnic. Dacă utilizatorul cere text final în germană, redactează în germană profesională, simplă și precisă.",
  "Folosește șabloanele/manualele asociate ca sursă principală pentru câmpuri, ordine, formulări și cerințe. Dacă nu există șablon asociat sau lipsește o informație, spune clar ce lipsește și cere datele necesare.",
  "Nu inventa date: ore, materiale, coduri de eroare, măsurători, nume client, adresă, număr comandă, valori electrice, piese înlocuite sau semnături. Marchează necunoscutele ca „nicht angegeben” sau cere completare.",
  "Când creezi un Bericht, verifică următoarele puncte: client/obiect, dată, tehnician, instalație/produs, brand/model, problemă reclamată, diagnostic, cauză, lucrări efectuate, piese/materiale, timp de lucru, stare finală, recomandări, siguranță și următorii pași.",
  "Pentru intervenții la porți, bariere, Brandschutzanlage sau instalații electrice, diferențiază clar între observație, cauză confirmată, cauză probabilă și recomandare. Nu prezenta presupunerile ca fapt.",
  "Dacă raportul trebuie să fie pentru client, folosește formulări neutre și profesionale. Evită acuzații și texte prea tehnice dacă nu sunt necesare.",
  "Dacă raportul este intern, poți include detalii tehnice suplimentare, pași de diagnostic, coduri de eroare, piese recomandate și observații pentru următoarea intervenție.",
  "La final, dacă lipsesc informații importante, adaugă o secțiune scurtă „Fehlende Angaben” cu întrebările exacte pe care utilizatorul trebuie să le clarifice.",
].join("\n");

function createBerichtDraft(manualOptions: ManualOption[]): TechnicianDraft {
  const reportManualKeys = manualOptions
    .filter((manual) => {
      const searchable = [
        manual.projectName,
        manual.manualName,
        manual.vectorStoreId,
      ]
        .join(" ")
        .toLowerCase();

      return [
        "bericht",
        "arbeitsbericht",
        "servicebericht",
        "wartungsbericht",
        "störungsbericht",
        "stoerungsbericht",
        "blanko",
        "rapport",
      ].some((keyword) => searchable.includes(keyword));
    })
    .map(getManualKey);

  return {
    name: "Bericht Assistent",
    domain: "Bericht / Arbeitsbericht",
    brands: "B&N Tortechnik",
    productTypes:
      "Arbeitsbericht, Servicebericht, Wartungsbericht, Störungsbericht",
    instructions: berichtInstructions,
    responseStyle: "bericht",
    webEnabled: false,
    experienceEnabled: true,
    active: true,
    manualKeys: [...new Set(reportManualKeys)],
  };
}

function getManualKey(manual: Pick<ManualOption, "projectId" | "manualId">) {
  return `${manual.projectId}:${manual.manualId}`;
}

function createDraftFromTechnician(technician: TechnicianItem): TechnicianDraft {
  return {
    id: technician.id,
    name: technician.name,
    domain: technician.domain,
    brands: technician.brands ?? "",
    productTypes: technician.productTypes ?? "",
    instructions: technician.instructions,
    responseStyle: technician.responseStyle,
    webEnabled: technician.webEnabled,
    experienceEnabled: technician.experienceEnabled,
    active: technician.active,
    manualKeys: technician.manuals.map(getManualKey),
  };
}

export default function TechniciansClient({
  initialTechnicians,
  manualOptions,
}: {
  initialTechnicians: TechnicianItem[];
  manualOptions: ManualOption[];
}) {
  const [technicians, setTechnicians] = useState(initialTechnicians);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<TechnicianDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const visibleTechnicians = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return technicians;

    return technicians.filter((technician) =>
      [
        technician.name,
        technician.domain,
        technician.brands,
        technician.productTypes,
        technician.instructions,
        technician.manuals.map((manual) => manual.manualName).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, technicians]);

  const selectedManuals = useMemo(() => {
    if (!draft) return [];
    return manualOptions.filter((manual) =>
      draft.manualKeys.includes(getManualKey(manual)),
    );
  }, [draft, manualOptions]);

  const groupedManuals = useMemo(() => {
    const groups = new Map<string, ManualOption[]>();

    manualOptions.forEach((manual) => {
      const current = groups.get(manual.projectName) ?? [];
      current.push(manual);
      groups.set(manual.projectName, current);
    });

    return [...groups.entries()];
  }, [manualOptions]);

  const updateDraft = <K extends keyof TechnicianDraft>(
    key: K,
    value: TechnicianDraft[K],
  ) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const toggleManual = (manual: ManualOption, checked: boolean) => {
    if (!draft) return;
    const key = getManualKey(manual);

    updateDraft(
      "manualKeys",
      checked
        ? [...new Set([...draft.manualKeys, key])]
        : draft.manualKeys.filter((item) => item !== key),
    );
  };

  const saveTechnician = async () => {
    if (!draft || saving) return;

    setSaving(true);

    try {
      const res = await fetch("/api/technicians", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          name: draft.name,
          domain: draft.domain,
          brands: draft.brands,
          productTypes: draft.productTypes,
          instructions: draft.instructions,
          responseStyle: draft.responseStyle,
          webEnabled: draft.webEnabled,
          experienceEnabled: draft.experienceEnabled,
          active: draft.active,
          manuals: selectedManuals,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.error || "Technicianul nu a putut fi salvat.");
      }

      const data = await res.json();
      const technician = mapApiTechnician(data.technician);

      setTechnicians((current) =>
        draft.id
          ? current.map((item) => (item.id === technician.id ? technician : item))
          : [technician, ...current],
      );
      setDraft(null);
      toast.success("Technician salvat.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Technicianul nu a putut fi salvat.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteTechnician = async (technician: TechnicianItem) => {
    setDeletingId(technician.id);

    try {
      const res = await fetch(`/api/technicians?id=${technician.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.error || "Technicianul nu a putut fi șters.");
      }

      setTechnicians((current) =>
        current.filter((item) => item.id !== technician.id),
      );
      toast.success("Technician șters.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Technicianul nu a putut fi șters.",
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
              <Bot className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-normal sm:text-2xl">
                Tehnicieni AI
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Creează specialiști pe brand, domeniu și manuale: GFA, FEIG,
                Marantec, Brandschutz, Bericht și alte zone tehnice.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraft(createBerichtDraft(manualOptions))}
            >
              <FileText className="size-4" />
              Bericht
            </Button>
            <Button type="button" onClick={() => setDraft(emptyDraft)}>
              <Plus className="size-4" />
              Creează technician
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-background p-3 shadow-xs">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Caută technician, brand, domeniu sau manual..."
            className="pl-9"
          />
        </div>
      </section>

      {visibleTechnicians.length === 0 ? (
        <section className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed bg-background p-8 text-center">
          <div className="max-w-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-md border bg-muted">
              <BrainCircuit className="size-5 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-base font-semibold">
              Nu există tehnicieni încă
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Creează primul technician AI și asociază-l cu manualele lui.
            </p>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {visibleTechnicians.map((technician) => (
            <article
              key={technician.id}
              className="rounded-lg border bg-background p-4 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-semibold">
                      {technician.name}
                    </h2>
                    <Badge variant={technician.active ? "secondary" : "outline"}>
                      {technician.active ? "Activ" : "Inactiv"}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{technician.domain}</span>
                    {technician.brands && <span>{technician.brands}</span>}
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" />
                      {formatDate(technician.updatedAt)}
                    </span>
                  </div>
                </div>

                {technician.canManage && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDraft(createDraftFromTechnician(technician))}
                      aria-label="Editează technician"
                    >
                      <Edit3 className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={deletingId === technician.id}
                      onClick={() => deleteTechnician(technician)}
                      aria-label="Șterge technician"
                    >
                      <Trash2
                        className={cn(
                          "size-4",
                          deletingId === technician.id && "animate-pulse",
                        )}
                      />
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-3">
                <div className="flex flex-wrap gap-2">
                  {technician.webEnabled && (
                    <Badge variant="outline">Web fallback</Badge>
                  )}
                  {technician.experienceEnabled && (
                    <Badge variant="outline">Experiență</Badge>
                  )}
                  <Badge variant="outline">{technician.responseStyle}</Badge>
                </div>

                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {technician.instructions}
                </p>

                <div className="rounded-md bg-muted/35 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Manuale asociate
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {technician.manuals.length > 0 ? (
                      technician.manuals.slice(0, 6).map((manual) => (
                        <Badge key={manual.id} variant="secondary">
                          {manual.manualName}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Global, fără manuale fixe
                      </span>
                    )}
                    {technician.manuals.length > 6 && (
                      <Badge variant="outline">
                        +{technician.manuals.length - 6}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      <Dialog
        open={Boolean(draft)}
        onOpenChange={(open) => {
          if (!open && !saving) setDraft(null);
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {draft?.id ? "Editează technician" : "Creează technician AI"}
            </DialogTitle>
            <DialogDescription>
              Alege specializarea, manualele și comportamentul tehnicianului.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="grid gap-5">
              {!draft.id && (
                <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">Preset rapid</p>
                    <p className="text-xs text-muted-foreground">
                      Completează automat câmpurile pentru rapoarte tehnice.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => setDraft(createBerichtDraft(manualOptions))}
                  >
                    <FileText className="size-4" />
                    Folosește Bericht
                  </Button>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nume">
                  <Input
                    value={draft.name}
                    placeholder="GFA Expert"
                    onChange={(event) => updateDraft("name", event.target.value)}
                  />
                </Field>
                <Field label="Domeniu">
                  <Input
                    value={draft.domain}
                    placeholder="Porți industriale"
                    onChange={(event) =>
                      updateDraft("domain", event.target.value)
                    }
                  />
                </Field>
                <Field label="Branduri">
                  <Input
                    value={draft.brands}
                    placeholder="GFA, FEIG, Marantec"
                    onChange={(event) =>
                      updateDraft("brands", event.target.value)
                    }
                  />
                </Field>
                <Field label="Tip produse">
                  <Input
                    value={draft.productTypes}
                    placeholder="TS971, bariere, Brandschutzanlage"
                    onChange={(event) =>
                      updateDraft("productTypes", event.target.value)
                    }
                  />
                </Field>
              </div>

              <Field label="Instrucțiuni technician">
                <Textarea
                  value={draft.instructions}
                  rows={7}
                  onChange={(event) =>
                    updateDraft("instructions", event.target.value)
                  }
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Stil răspuns">
                  <Input
                    value={draft.responseStyle}
                    placeholder="diagnostic, bericht, service"
                    onChange={(event) =>
                      updateDraft("responseStyle", event.target.value)
                    }
                  />
                </Field>
                <div className="grid gap-2">
                  <Label>Opțiuni</Label>
                  <div className="grid gap-2 rounded-md border p-3">
                    <ToggleLine
                      label="Activ"
                      checked={draft.active}
                      onCheckedChange={(checked) =>
                        updateDraft("active", checked)
                      }
                    />
                    <ToggleLine
                      label="Permite web fallback"
                      checked={draft.webEnabled}
                      onCheckedChange={(checked) =>
                        updateDraft("webEnabled", checked)
                      }
                    />
                    <ToggleLine
                      label="Folosește experiență salvată"
                      checked={draft.experienceEnabled}
                      onCheckedChange={(checked) =>
                        updateDraft("experienceEnabled", checked)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Manuale asociate</Label>
                  <Badge variant="secondary">
                    {draft.manualKeys.length} selectate
                  </Badge>
                </div>

                <ScrollArea className="h-72 rounded-md border">
                  <div className="grid gap-4 p-3">
                    {groupedManuals.length === 0 ? (
                      <div className="rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">
                        Nu există manuale indexate încă.
                      </div>
                    ) : (
                      groupedManuals.map(([projectName, manuals]) => (
                        <div key={projectName} className="grid gap-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            {projectName}
                          </p>
                          <div className="grid gap-2">
                            {manuals.map((manual) => {
                              const key = getManualKey(manual);
                              const checked = draft.manualKeys.includes(key);

                              return (
                                <label
                                  key={key}
                                  className="flex cursor-pointer items-center gap-3 rounded-md border p-2 text-sm hover:bg-muted/40"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(value) =>
                                      toggleManual(manual, value === true)
                                    }
                                  />
                                  <FileText className="size-4 shrink-0 text-red-600" />
                                  <span className="min-w-0 truncate">
                                    {manual.manualName}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setDraft(null)}
            >
              Anulează
            </Button>
            <Button
              type="button"
              disabled={
                saving ||
                !draft?.name.trim() ||
                !draft?.domain.trim() ||
                !draft?.instructions.trim()
              }
              onClick={saveTechnician}
            >
              {saving ? (
                <Bot className="size-4 animate-pulse" />
              ) : (
                <Plus className="size-4" />
              )}
              Salvează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ToggleLine({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      {label}
    </label>
  );
}

function mapApiTechnician(technician: TechnicianItem): TechnicianItem {
  return {
    ...technician,
    createdAt: new Date(technician.createdAt).toISOString(),
    updatedAt: new Date(technician.updatedAt).toISOString(),
    canManage: true,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
