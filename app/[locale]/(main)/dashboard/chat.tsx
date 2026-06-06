"use client";

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
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpenCheck,
  BrainCircuit,
  FileImage,
  FileText,
  ImagePlus,
  Loader2,
  SendHorizontal,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

type Message = {
  role: "user" | "assistant";
  content: string;
  images?: ChatImage[];
};

type ChatImage = {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
};

type ProjectManual = {
  id: string;
  manualId: string;
  filename: string;
  status: "in_progress" | "completed" | "cancelled" | "failed";
  createdAt: number;
  usageBytes: number;
};

type ProjectTechnician = {
  id: string;
  name: string;
  domain: string;
  brands?: string;
  productTypes?: string;
  responseStyle: string;
  webEnabled: boolean;
  experienceEnabled: boolean;
  manualIds: string[];
};

type ExperienceDraft = {
  messageIndex: number;
  title: string;
  question: string;
  answer: string;
  symptoms: string;
  cause: string;
  solution: string;
  tags: string;
};

export default function Chat({
  assistantId,
  manuals,
  technicians,
}: {
  assistantId: string;
  manuals: ProjectManual[];
  technicians: ProjectTechnician[];
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [images, setImages] = useState<ChatImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedManualId, setSelectedManualId] = useState("all");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("general");
  const [experienceDraft, setExperienceDraft] =
    useState<ExperienceDraft | null>(null);
  const [savedExperienceIndexes, setSavedExperienceIndexes] = useState<
    Set<number>
  >(new Set());
  const [savingExperience, setSavingExperience] = useState(false);
  const locale = useLocale();
  const t = useTranslations("Chat");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const readyManuals = useMemo(
    () => manuals.filter((manual) => manual.status === "completed"),
    [manuals],
  );

  const selectedManual = useMemo(
    () =>
      selectedManualId === "all"
        ? null
        : readyManuals.find((manual) => manual.manualId === selectedManualId),
    [readyManuals, selectedManualId],
  );

  const selectedTechnician = useMemo(
    () =>
      selectedTechnicianId === "general"
        ? null
        : technicians.find((technician) => technician.id === selectedTechnicianId),
    [selectedTechnicianId, technicians],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (
      selectedManualId !== "all" &&
      !readyManuals.some((manual) => manual.manualId === selectedManualId)
    ) {
      setSelectedManualId("all");
    }
  }, [readyManuals, selectedManualId]);

  useEffect(() => {
    if (
      selectedTechnicianId !== "general" &&
      !technicians.some((technician) => technician.id === selectedTechnicianId)
    ) {
      setSelectedTechnicianId("general");
    }
  }, [selectedTechnicianId, technicians]);

  const hasDraftContent = input.trim().length > 0 || images.length > 0;

  const getPreviousUserMessage = (assistantMessageIndex: number) => {
    for (let index = assistantMessageIndex - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === "user") return messages[index];
    }

    return null;
  };

  const openExperienceDialog = (messageIndex: number) => {
    const assistantMessage = messages[messageIndex];
    const userMessage = getPreviousUserMessage(messageIndex);

    if (!assistantMessage || assistantMessage.role !== "assistant") return;

    const question = userMessage?.content ?? "";
    const titleSource = question || assistantMessage.content;

    setExperienceDraft({
      messageIndex,
      title: titleSource.replace(/\s+/g, " ").trim().slice(0, 90),
      question,
      answer: assistantMessage.content,
      symptoms: question,
      cause: "",
      solution: assistantMessage.content.slice(0, 3000),
      tags: selectedManual?.filename ?? "",
    });
  };

  const saveExperience = async () => {
    if (!experienceDraft || savingExperience) return;

    setSavingExperience(true);

    try {
      const res = await fetch("/api/technician-experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: assistantId,
          technicianId: selectedTechnician?.id,
          manualId: selectedManual?.manualId,
          manualName: selectedManual?.filename,
          title: experienceDraft.title,
          question: experienceDraft.question,
          answer: experienceDraft.answer,
          symptoms: experienceDraft.symptoms,
          cause: experienceDraft.cause,
          solution: experienceDraft.solution,
          tags: experienceDraft.tags,
          source: "chat",
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.error || "Experiența nu a putut fi salvată.");
      }

      setSavedExperienceIndexes((current) => {
        const next = new Set(current);
        next.add(experienceDraft.messageIndex);
        return next;
      });
      setExperienceDraft(null);
      toast.success("Experiență salvată.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Experiența nu a putut fi salvată.",
      );
    } finally {
      setSavingExperience(false);
    }
  };

  const addImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    const remainingSlots = Math.max(0, 4 - images.length);
    const selectedFiles = Array.from(files)
      .filter((file) => allowedTypes.has(file.type))
      .filter((file) => file.size <= 6 * 1024 * 1024)
      .slice(0, remainingSlots);

    const nextImages = await Promise.all(
      selectedFiles.map(
        (file) =>
          new Promise<ChatImage>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
                name: file.name,
                mimeType: file.type,
                dataUrl: String(reader.result),
              });
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          }),
      ),
    );

    setImages((current) => [...current, ...nextImages]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sendMessage = async () => {
    if (!hasDraftContent || loading || readyManuals.length === 0) return;

    const currentInput = input;
    const currentImages = images;
    const conversationHistory = messages
      .slice(-8)
      .filter((message) => message.content.trim().length > 0)
      .map((message) => ({
        role: message.role,
        content: message.content.slice(0, 1800),
        hasImages: Boolean(message.images?.length),
      }));
    const newMessage: Message = {
      role: "user",
      content: currentInput || "Analizează imaginea atașată.",
      images: currentImages,
    };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setImages([]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistantId,
          message: currentInput,
          images: currentImages.map((image) => ({
            name: image.name,
            mimeType: image.mimeType,
            dataUrl: image.dataUrl,
          })),
          conversationHistory,
          language: locale,
          selectedManualId,
          technicianId: selectedTechnicianId,
        }),
      });

      if (!res.body) throw new Error("No response body");

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Eroare la server");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: buffer,
          };
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err instanceof Error
              ? err.message
              : "A apărut o eroare la server.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="grid min-h-[calc(100vh-190px)] gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="rounded-lg border bg-background p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-md bg-muted">
            <BookOpenCheck className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Context răspuns</h2>
            <p className="text-xs text-muted-foreground">
              {readyManuals.length} manuale indexate
            </p>
          </div>
        </div>

        <div className="mt-4">
          <Select
            value={selectedTechnicianId}
            onValueChange={setSelectedTechnicianId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Alege technicianul" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              {technicians.map((technician) => (
                <SelectItem key={technician.id} value={technician.id}>
                  {technician.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTechnician && (
          <div className="mt-3 rounded-md border bg-muted/25 p-3 text-xs">
            <div className="font-medium">{selectedTechnician.domain}</div>
            <div className="mt-1 text-muted-foreground">
              {[
                selectedTechnician.brands,
                selectedTechnician.productTypes,
                selectedTechnician.responseStyle,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedTechnician.webEnabled && (
                <Badge variant="outline">web</Badge>
              )}
              {selectedTechnician.experienceEnabled && (
                <Badge variant="outline">experiență</Badge>
              )}
              {selectedTechnician.manualIds.length > 0 && (
                <Badge variant="outline">
                  {selectedTechnician.manualIds.length} manuale
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="mt-3">
          <Select
            value={selectedManualId}
            onValueChange={setSelectedManualId}
            disabled={readyManuals.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Alege manualul" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate manualele</SelectItem>
              {readyManuals.map((manual) => (
                <SelectItem key={manual.id} value={manual.manualId}>
                  {manual.filename}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 space-y-2">
          <Button
            asChild
            variant="outline"
            className="mb-2 w-full justify-start"
          >
            <Link href="/experience">
              <BrainCircuit className="size-4" />
              Experiență salvată
            </Link>
          </Button>

          {readyManuals.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Încarcă un PDF pentru a începe.
            </div>
          ) : (
            readyManuals.map((manual) => (
              <button
                key={manual.id}
                type="button"
                onClick={() => setSelectedManualId(manual.manualId)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md border p-2 text-left text-sm transition-colors hover:bg-muted/60",
                  selectedManualId === manual.manualId &&
                    "border-primary bg-muted",
                )}
              >
                <FileText className="size-4 shrink-0 text-red-600" />
                <span className="min-w-0 flex-1 truncate">
                  {manual.filename}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <div className="relative flex min-h-[620px] flex-col overflow-hidden rounded-lg border bg-background shadow-xs">
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Chat proiect</h2>
            <p className="truncate text-xs text-muted-foreground">
              {selectedTechnician
                ? selectedTechnician.name
                : selectedManual
                  ? selectedManual.filename
                  : "Toate manualele proiectului"}
            </p>
          </div>
          <Badge variant="secondary" className="w-fit">
            {selectedTechnician
              ? "Technician selectat"
              : selectedManual
                ? "Manual selectat"
                : "Chat + surse la cerere"}
          </Badge>
        </div>

        <ScrollArea className="flex-1 bg-muted/20">
          <div className="space-y-4 p-4 pb-24">
            {messages.length === 0 && (
              <div className="flex min-h-[360px] items-center justify-center text-center">
                <div className="max-w-md space-y-3">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-md border bg-background">
                    <BookOpenCheck className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">
                      Vorbește natural cu asistentul
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Poți conversa normal. Când ai nevoie, cere explicit să
                      caute în manual, pe internet sau atașează o poză tehnică.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={`${idx}-${msg.role}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "chat max-w-[88%] rounded-lg border px-4 py-3 text-sm shadow-xs lg:max-w-[76%]",
                      msg.role === "user"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background text-foreground",
                    )}
                  >
                    {msg.images && msg.images.length > 0 && (
                      <div className="mb-3 grid gap-2 sm:grid-cols-2">
                        {msg.images.map((image) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={image.id}
                            src={image.dataUrl}
                            alt={image.name}
                            className="max-h-48 rounded-md border object-cover"
                          />
                        ))}
                      </div>
                    )}
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {msg.content}
                    </ReactMarkdown>
                    {msg.role === "assistant" && msg.content.trim() && (
                      <div className="mt-3 border-t pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                          disabled={savedExperienceIndexes.has(idx)}
                          onClick={() => openExperienceDialog(idx)}
                        >
                          <BrainCircuit className="size-3.5" />
                          {savedExperienceIndexes.has(idx)
                            ? "Experiență salvată"
                            : "Salvează experiență"}
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground shadow-xs">
                  <Loader2 className="size-4 animate-spin" />
                  Se analizează mesajul...
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="absolute inset-x-0 bottom-0 border-t bg-background/95 p-3 backdrop-blur">
          {images.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="group flex max-w-[220px] items-center gap-2 rounded-md border bg-background p-1.5 shadow-xs"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.dataUrl}
                      alt={image.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {image.name}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setImages((current) =>
                        current.filter((item) => item.id !== image.id),
                      )
                    }
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Șterge imaginea"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(event) => addImages(event.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={loading || readyManuals.length === 0 || images.length >= 4}
              className="h-11 w-11 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Atașează imagine"
              title="Atașează imagine"
            >
              {images.length > 0 ? (
                <FileImage className="size-4" />
              ) : (
                <ImagePlus className="size-4" />
              )}
            </Button>
            <Input
              id="chat"
              className="h-11"
              placeholder="Scrie normal sau cere: caută în manual / caută pe internet..."
              value={input}
              disabled={loading || readyManuals.length === 0}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button
              onClick={sendMessage}
              disabled={loading || !hasDraftContent || readyManuals.length === 0}
              className="h-11 px-4"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <SendHorizontal className="size-4" />
              )}
              <span className="hidden sm:inline">{t("buttons.send")}</span>
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={Boolean(experienceDraft)}
        onOpenChange={(open) => {
          if (!open && !savingExperience) setExperienceDraft(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Salvează experiență permanentă</DialogTitle>
            <DialogDescription>
              Cazul salvat va fi folosit automat la întrebări similare în acest
              proiect{selectedTechnician ? ` pentru ${selectedTechnician.name}` : ""}.
            </DialogDescription>
          </DialogHeader>

          {experienceDraft && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="experience-title">Titlu caz</Label>
                <Input
                  id="experience-title"
                  value={experienceDraft.title}
                  onChange={(event) =>
                    setExperienceDraft((current) =>
                      current
                        ? { ...current, title: event.target.value }
                        : current,
                    )
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="experience-symptoms">Simptome / context</Label>
                <Textarea
                  id="experience-symptoms"
                  value={experienceDraft.symptoms}
                  rows={4}
                  onChange={(event) =>
                    setExperienceDraft((current) =>
                      current
                        ? { ...current, symptoms: event.target.value }
                        : current,
                    )
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="experience-cause">Cauză confirmată</Label>
                <Textarea
                  id="experience-cause"
                  placeholder="Ex: DES defect, fotocelulă blocată, fază lipsă..."
                  value={experienceDraft.cause}
                  rows={3}
                  onChange={(event) =>
                    setExperienceDraft((current) =>
                      current
                        ? { ...current, cause: event.target.value }
                        : current,
                    )
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="experience-solution">Soluție / pași utili</Label>
                <Textarea
                  id="experience-solution"
                  value={experienceDraft.solution}
                  rows={6}
                  onChange={(event) =>
                    setExperienceDraft((current) =>
                      current
                        ? { ...current, solution: event.target.value }
                        : current,
                    )
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="experience-tags">Taguri</Label>
                <Input
                  id="experience-tags"
                  placeholder="GFA TS971, F5.5, DES, Torbewegung"
                  value={experienceDraft.tags}
                  onChange={(event) =>
                    setExperienceDraft((current) =>
                      current
                        ? { ...current, tags: event.target.value }
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
              disabled={savingExperience}
              onClick={() => setExperienceDraft(null)}
            >
              Anulează
            </Button>
            <Button
              type="button"
              disabled={
                savingExperience ||
                !experienceDraft?.title.trim() ||
                !experienceDraft?.question.trim() ||
                !experienceDraft?.answer.trim()
              }
              onClick={saveExperience}
            >
              {savingExperience ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <BrainCircuit className="size-4" />
              )}
              Salvează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
