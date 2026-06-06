"use client";

import { LoadingButton } from "@/components/loading-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { redirect } from "@/i18n/routing";
import { User } from "@/prisma/lib/generated/prisma";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bot, Gauge, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";

const modelPresets = [
  {
    id: "gpt-5.4-mini",
    label: "Rapid",
    description: "Răspunsuri rapide pentru întrebări uzuale din manuale.",
    icon: Gauge,
  },
  {
    id: "gpt-5.4",
    label: "Precizie",
    description: "Mai bun pentru manuale dense și răspunsuri tehnice lungi.",
    icon: Bot,
    adminOnly: true,
  },
  {
    id: "gpt-5.5",
    label: "Expert",
    description: "Maxim de calitate pentru cazuri dificile.",
    icon: Sparkles,
    adminOnly: true,
  },
];

export function FormAddNewProject({ user }: { user: User }) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const locale = useLocale();

  const t = useTranslations("AddProject");
  const validations = useTranslations("Validation");

  const admin = user.role === "admin";

  const createAsistentSchema = z.object({
    name: z.string().min(2, validations("name.min")),
    model: z.string().min(1),
    system_instructions: z.string().optional(),
  });

  type CreateAsistentValues = z.infer<typeof createAsistentSchema>;

  const form = useForm<CreateAsistentValues>({
    resolver: zodResolver(createAsistentSchema),
    defaultValues: {
      name: "",
      model: "gpt-5.4-mini",
      system_instructions: "",
    },
  });

  async function onSubmit({
    name,
    model,
    system_instructions,
  }: CreateAsistentValues) {
    setStatus(null);
    setError(null);

    const res = await fetch("/api/create-project", {
      method: "POST",
      body: JSON.stringify({
        name: name,
        userId: user.id,
        model,
        system_instructions,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error || "Proiectul nu a putut fi creat.");
      return;
    }

    setStatus("Proiectul a fost creat.");
    redirect({
      href: `/dashboard/project/${data.assistant.id}`,
      locale,
    });
  }

  const loading = form.formState.isSubmitting;

  return (
    <Card className="w-full max-w-2xl rounded-lg">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{t("title")}</CardTitle>
            <CardDescription>
              Creează un spațiu de lucru pentru manuale și întrebări tehnice.
            </CardDescription>
          </div>
          <Badge variant="secondary">OpenAI</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder={t("placeHolder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Alege modelul" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {modelPresets.map((model) => (
                        <SelectItem
                          key={model.id}
                          value={model.id}
                          disabled={model.adminOnly && !admin}
                        >
                          <div className="flex items-center gap-2">
                            <model.icon className="size-4" />
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
                      modelPresets.find(
                        (preset) => preset.id === field.value,
                      )?.description
                    }
                  </p>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="system_instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instrucțiuni</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: răspunde scurt, păstrează codurile exact ca în manual..."
                      className="min-h-28 resize-none"
                      disabled={!admin}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div role="alert" className="text-sm text-red-600">
                {error}
              </div>
            )}
            {status && (
              <div role="status" className="text-sm text-green-600">
                {status}
              </div>
            )}
            <LoadingButton type="submit" loading={loading}>
              {t("button")}
            </LoadingButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
