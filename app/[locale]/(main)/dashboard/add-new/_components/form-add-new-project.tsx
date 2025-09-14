"use client";

import { LoadingButton } from "@/components/loading-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { redirect } from "@/i18n/routing";
import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "better-auth";
import { useLocale, useTranslations } from "next-intl";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";

export function FormAddNewProject({ user }: { user: User }) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const locale = useLocale();

  const t = useTranslations("AddProject");
  const validations = useTranslations("Validation");

  const createAsistentSchema = z.object({
    name: z.string().min(2, validations("name.min")),
  });

  type CreateAsistentValues = z.infer<typeof createAsistentSchema>;

  const form = useForm<CreateAsistentValues>({
    resolver: zodResolver(createAsistentSchema),
    defaultValues: {
      name: "",
    },
  });

  async function onSubmit({ name }: CreateAsistentValues) {
    setStatus(null);
    setError(null);

    const res = await fetch("/api/create-project", {
      method: "POST",
      body: JSON.stringify({ name: name, userId: user.id }),
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
