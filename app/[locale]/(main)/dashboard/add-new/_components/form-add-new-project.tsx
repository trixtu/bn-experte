"use client";

import { LoadingButton } from "@/components/loading-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { redirect } from "@/i18n/routing";
import { User } from "@/prisma/lib/generated/prisma";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { Model } from "openai/resources/models.mjs";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";

export function FormAddNewProject({
  user,
  models,
}: {
  user: User;
  models: Model[];
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const locale = useLocale();

  const t = useTranslations("AddProject");
  const validations = useTranslations("Validation");

  const admin = user.role === "admin";

  const createAsistentSchema = z.object({
    name: z.string().min(2, validations("name.min")),
    model: z.string().min(1),
  });

  type CreateAsistentValues = z.infer<typeof createAsistentSchema>;

  const form = useForm<CreateAsistentValues>({
    resolver: zodResolver(createAsistentSchema),
    defaultValues: {
      name: "",
      model: "gpt-4o",
    },
  });

  async function onSubmit({ name, model }: CreateAsistentValues) {
    setStatus(null);
    setError(null);

    const res = await fetch("/api/create-project", {
      method: "POST",
      body: JSON.stringify({ name: name, userId: user.id, model }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();

    if (error) {
      setError(error || "Failed to create project");
    } else {
      setStatus("The project was created successfully");
      redirect({
        href: `/dashboard/project/${data.assistant.id}`,
        locale,
      });
    }
  }

  const loading = form.formState.isSubmitting;

  return (
    <Card className="w-2xl">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
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
                  <FormLabel>Models</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem
                          key={model.id}
                          value={model.id}
                          disabled={!admin}
                        >
                          {model.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

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
