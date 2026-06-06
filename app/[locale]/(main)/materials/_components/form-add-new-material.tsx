"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ImagePlus, PackagePlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/routing";
import { createMaterialAction } from "../create-material.action";
import { UploadImage } from "./upload-image";

const createMaterialSchema = z.object({
  name: z.string().trim().min(2, "Introdu cel puțin 2 caractere."),
  artNummer: z.string().trim().min(2, "Introdu codul articolului."),
});

type CreateMaterialValues = z.infer<typeof createMaterialSchema>;

export function FormAddNewMaterial() {
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const router = useRouter();

  const form = useForm<CreateMaterialValues>({
    resolver: zodResolver(createMaterialSchema),
    defaultValues: {
      name: "",
      artNummer: "",
    },
  });

  async function onSubmit({ name, artNummer }: CreateMaterialValues) {
    setError(null);

    if (!imageFile) {
      toast.error("Adaugă o imagine pentru material.");
      setError("Imaginea materialului este obligatorie.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("artNummer", artNummer);
      formData.append("file", imageFile);

      await createMaterialAction(formData);

      form.reset();
      setImageFile(null);
      setUploadKey((current) => current + 1);
      toast.success("Material creat cu succes.");
      router.push("/materials");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "A apărut o eroare la salvare.";
      setError(message);
      toast.error(message);
    }
  }

  const loading = form.formState.isSubmitting;

  return (
    <section className="rounded-md border bg-background shadow-sm">
      <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md border bg-muted">
            <ImagePlus className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              Adaugă material
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Încarcă imaginea și salvează codul articolului pentru biblioteca
              tehnică.
            </p>
          </div>
        </div>

        <Button asChild variant="outline">
          <Link href="/materials">
            <ArrowLeft className="size-4" />
            Înapoi
          </Link>
        </Button>
      </div>

      <Form {...form}>
        <form
          className="grid gap-6 p-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold">Date material</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Folosește denumiri clare și codul exact de comandă.
              </p>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Denumire</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Fotocelulă FEIG, arc barieră..."
                      type="text"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="artNummer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Art. Nummer</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: 123456 / FEIG-..."
                      type="text"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Codul trebuie să fie unic în biblioteca de materiale.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}
          </div>

          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold">Imagine material</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Imaginea va fi salvată în Cloudflare R2 și afișată în listă.
              </p>
            </div>

            <UploadImage key={uploadKey} setImageFile={setImageFile} />

            <div className="flex justify-end">
              <LoadingButton loading={loading} type="submit">
                <PackagePlus className="size-4" />
                Salvează material
              </LoadingButton>
            </div>
          </div>
        </form>
      </Form>
    </section>
  );
}
