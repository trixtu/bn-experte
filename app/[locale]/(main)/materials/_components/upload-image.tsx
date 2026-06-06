"use client";

import { AlertCircleIcon, ImageUpIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { useFileUpload } from "@/hooks/use-file-upload";

export function UploadImage(props: { setImageFile: (file: File | null) => void }) {
  const maxSizeMB = 6;
  const maxSize = maxSizeMB * 1024 * 1024;

  const [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      getInputProps,
    },
  ] = useFileUpload({
    accept: "image/jpeg,image/png,image/webp",
    maxFiles: 1,
    maxSize,
    onFilesAdded: async (newFiles) => {
      const file = newFiles[0]?.file;

      if (!file || !(file instanceof File)) {
        toast.error("Nu a fost adăugată nicio imagine.");
        return;
      }

      if (file.size > maxSize) {
        toast.error(`Imaginea depășește limita de ${maxSizeMB} MB.`);
        return;
      }

      props.setImageFile(file);
      return file;
    },
  });

  const removeImage = (fileId: string) => {
    removeFile(fileId);
    props.setImageFile(null);
  };

  const firstFile = files[0];
  const previewUrl = firstFile?.preview || null;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <div
          className="relative flex aspect-[4/3] min-h-64 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-input bg-background p-4 transition-colors hover:bg-accent/50 has-disabled:pointer-events-none has-[input:focus]:border-ring has-disabled:opacity-50 has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50"
          data-dragging={isDragging || undefined}
          onClick={openFileDialog}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          role="button"
          tabIndex={-1}
        >
          <input
            {...getInputProps()}
            aria-label="Încarcă imagine material"
            className="sr-only"
          />
          {previewUrl ? (
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={firstFile.file.name || "Imagine material"}
                className="size-full object-cover"
                src={previewUrl}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
              <div
                aria-hidden="true"
                className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background"
              >
                <ImageUpIcon className="size-4 opacity-60" />
              </div>
              <p className="mb-1.5 text-sm font-medium">
                Trage imaginea aici sau selectează din calculator
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG sau WebP, maxim {maxSizeMB} MB
              </p>
            </div>
          )}
        </div>
        {previewUrl && firstFile ? (
          <div className="absolute right-4 top-4">
            <button
              aria-label="Elimină imaginea"
              className="z-50 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white outline-none transition-[color,box-shadow] hover:bg-black/80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              onClick={() => removeImage(firstFile.id)}
              type="button"
            >
              <XIcon aria-hidden="true" className="size-4" />
            </button>
          </div>
        ) : null}
      </div>

      {errors.length > 0 ? (
        <div
          className="flex items-center gap-1 text-xs text-destructive"
          role="alert"
        >
          <AlertCircleIcon className="size-3 shrink-0" />
          <span>{errors[0]}</span>
        </div>
      ) : null}
    </div>
  );
}
