"use client";

import { useState } from "react";
import {
  AlertCircleIcon,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { CircleAlertIcon } from "lucide-react";

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

import {
  formatBytes,
  useFileUpload,
  type FileWithPreview,
} from "@/hooks/use-file-upload";
import { Button } from "@/components/ui/button";
import { Manual } from "@/prisma/lib/generated/prisma";
import { toast } from "sonner";
import { uploadFileWithProgress } from "@/app/[locale]/(main)/manuals/manual-upload.action";
import { manualDeleteAction } from "@/server/manualUploadAction";
import { Link } from "@/i18n/routing";
import { getFileIcon } from "@/lib/functions";
import { UploadProgress } from "@/types";
import { Input } from "./ui/input";

export default function ManualsForm(props: { manuals: Manual[] }) {
  const maxSizeMB = 50;
  const maxSize = maxSizeMB * 1024 * 1024; // 5MB default
  const maxFiles = 60;

  // State to track upload progress for each file
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;

  // Function to handle newly added files
  const handleFilesAdded = async (addedFiles: FileWithPreview[]) => {
    const newProgressItems = addedFiles.map((file) => ({
      fileId: file.id,
      progress: 0,
      completed: false,
    }));
    setUploadProgress((prev) => [...prev, ...newProgressItems]);

    addedFiles.forEach(async (file) => {
      if (!file?.file) return;

      try {
        const url = await uploadFileWithProgress(
          file.file as File,
          (progress) => {
            setUploadProgress((prev) =>
              prev.map((item) =>
                item.fileId === file.id ? { ...item, progress } : item
              )
            );
          }
        );

        setUploadProgress((prev) =>
          prev.map((item) =>
            item.fileId === file.id
              ? { ...item, progress: 100, completed: true }
              : item
          )
        );

        console.log("Uploaded to:", url);
      } catch (err) {
        toast.error("Upload failed");
        console.error(err);
      }
    });
  };

  // Remove the progress tracking for the file
  const handleFileRemoved = async (fileId: string) => {
    setUploadProgress((prev) => prev.filter((item) => item.fileId !== fileId));

    await manualDeleteAction(fileId);
  };

  const [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      clearFiles,
      getInputProps,
    },
  ] = useFileUpload({
    multiple: true,
    maxFiles,
    maxSize,
    initialFiles: props.manuals.map((manual) => ({
      id: manual.id,
      url: manual.url,
      type: manual.type || "",
      name: manual.fileName,
      size: manual.size || 0,
    })),
    onFilesAdded: handleFilesAdded,
  });

  // Aplica search
  const filteredFiles = files.filter((file) =>
    (file.file instanceof File ? file.file.name : file.file.name)
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Aplica paginație
  const totalPages = Math.ceil(filteredFiles.length / perPage) || 1;
  const paginatedFiles = filteredFiles.slice(
    (page - 1) * perPage,
    page * perPage
  );

  return (
    <div className="space-y-4 w-2xl ">
      <div className="flex flex-col gap-2">
        {/* Search bar */}
        {files.length > 0 && (
          <div className="flex items-center justify-between mb-2">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search files..."
              className="max-w-xs"
            />
            <div className="flex items-center gap-2 text-sm">
              <span>
                Page {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
        {/* Drop area */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          data-dragging={isDragging || undefined}
          data-files={files.length > 0 || undefined}
          className="border-input data-[dragging=true]:bg-accent/50 has-[input:focus]:border-ring has-[input:focus]:ring-ring/50 relative flex min-h-52 flex-col items-center overflow-hidden rounded-xl border border-dashed p-4 transition-colors not-data-[files]:justify-center has-[input:focus]:ring-[3px]"
        >
          <input
            {...getInputProps()}
            className="sr-only"
            aria-label="Upload image file"
          />
          {files.length > 0 ? (
            <div className="flex w-full flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-sm font-medium">
                  Files ({files.length})
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={openFileDialog}>
                    <UploadIcon
                      className="-ms-0.5 size-3.5 opacity-60"
                      aria-hidden="true"
                    />
                    Add files
                  </Button>
                </div>
              </div>

              <div className="w-full space-y-2">
                {paginatedFiles.map((file) => {
                  const fileProgress = uploadProgress.find(
                    (p) => p.fileId === file.id
                  );
                  const isUploading = fileProgress && !fileProgress.completed;

                  return (
                    <div
                      key={file.id}
                      data-uploading={isUploading || undefined}
                      className="bg-background flex flex-col gap-1 rounded-lg border p-2 pe-3 transition-opacity duration-300"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={file.preview ? file.preview : "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <div className="flex items-center gap-3 overflow-hidden in-data-[uploading=true]:opacity-50">
                            <div className="flex aspect-square size-10 shrink-0 items-center justify-center rounded border">
                              {getFileIcon(file)}
                            </div>
                            <div className="flex min-w-0 flex-col gap-0.5">
                              <p className="truncate text-[13px] font-medium">
                                {file.file instanceof File
                                  ? file.file.name
                                  : file.file.name}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {formatBytes(
                                  file.file instanceof File
                                    ? file.file.size
                                    : file.file.size
                                )}
                              </p>
                            </div>
                          </div>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground/80 hover:text-foreground -me-2 size-8 hover:bg-transparent"
                              aria-label="Remove file"
                            >
                              <XIcon className="size-4" aria-hidden="true" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <div className="flex flex-col gap-2 max-sm:items-center sm:flex-row sm:gap-4">
                              <div
                                className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-orange-200"
                                aria-hidden="true"
                              >
                                <CircleAlertIcon
                                  className="opacity-80"
                                  size={16}
                                />
                              </div>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Are you sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete manual
                                  <strong>&quot;{file.file.name}&quot;</strong>?
                                  All your data will be removed.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <Button asChild variant={"destructive"}>
                                <AlertDialogAction
                                  onClick={() => {
                                    handleFileRemoved(file.id);
                                    removeFile(file.id);
                                  }}
                                >
                                  Confirm
                                </AlertDialogAction>
                              </Button>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      {/* Upload progress bar */}
                      {fileProgress &&
                        (() => {
                          const progress = fileProgress.progress || 0;
                          const completed = fileProgress.completed || false;

                          if (completed) return null;

                          return (
                            <div className="mt-1 flex items-center gap-2">
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className="bg-primary h-full transition-all duration-300 ease-out"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-muted-foreground w-10 text-xs tabular-nums">
                                {progress}%
                              </span>
                            </div>
                          );
                        })()}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
              <div
                className="bg-background mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border"
                aria-hidden="true"
              >
                <ImageIcon className="size-4 opacity-60" />
              </div>
              <p className="mb-1.5 text-sm font-medium">Drop your files here</p>
              <p className="text-muted-foreground text-xs">
                Max {maxFiles} files ∙ Up to {maxSizeMB}MB
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={openFileDialog}
              >
                <UploadIcon className="-ms-1 opacity-60" aria-hidden="true" />
                Select files
              </Button>
            </div>
          )}
        </div>

        {errors.length > 0 && (
          <div
            className="text-destructive flex items-center gap-1 text-xs"
            role="alert"
          >
            <AlertCircleIcon className="size-3 shrink-0" />
            <span>{errors[0]}</span>
          </div>
        )}
      </div>
    </div>
  );
}
