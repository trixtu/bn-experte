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
import { Material, User } from "@/prisma/lib/generated/prisma";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { UploadImage } from "../_components/upload-image";
import { toast } from "sonner";
import { createMaterialAction } from "../create-material.action";
import { useRouter } from "next/navigation";

export function FormAddNewMaterial({
  user,
  materials,
}: {
  user: User;
  materials: Material[];
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const locale = useLocale();

  const [imageFile, setImageFile] = useState<File | null>(null);

  const t = useTranslations("AddProject");
  const validations = useTranslations("Validation");

  const admin = user.role === "admin";

  const createMaterialSchema = z.object({
    name: z.string().min(2, validations("name.min")),
    artNummer: z.string().min(2),
  });

  const router = useRouter();

  type CreateMaterialValues = z.infer<typeof createMaterialSchema>;

  const form = useForm<CreateMaterialValues>({
    resolver: zodResolver(createMaterialSchema),
    defaultValues: {
        name: "",
        artNummer: "",  
    },
  });

  async function onSubmit({
    name,
    artNummer,
  }: CreateMaterialValues) {
    setStatus("loading");
    setError(null);

    try {  
        const formData = new FormData();
        formData.append("name", name);
        formData.append("artNummer", artNummer);

        // imageFile este cel stocat în state din onFilesAdded
        if (imageFile) {
            formData.append("file", imageFile);
        } else {
            toast.error("Te rugăm să adaugi o imagine!");
        return;
        }

        // 2. Trimitem către Server Action
        const result = await createMaterialAction(formData);

        form.reset();

        setImageFile(null);
        router.refresh();

        toast.success("Material creat cu succes!");
        setStatus("success");
        
    }
    catch (err) {
        console.error(err);
        setError("A apărut o eroare la salvare.");
        setStatus("error");
    }

    console.log("Submitted:", { name, artNummer, imageFile });
    
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
              name="artNummer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Art.Nummer</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder={ "Art.Nummer" }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <UploadImage setImageFile={setImageFile} />

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
