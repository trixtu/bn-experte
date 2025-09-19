"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { IoDocumentOutline } from "react-icons/io5";
import { FaFolderPlus } from "react-icons/fa6";
import { CiFolderOn } from "react-icons/ci";
import { RiDeleteBin6Line } from "react-icons/ri";
import { useTranslations } from "next-intl";

type UploadFile = {
  id: string;
  filename: string;
};

export default function UploadPdf({
  id,
  vectorId,
}: {
  id: string;
  vectorId?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<UploadFile>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const t = useTranslations("UploadPdf");
  useEffect(() => {
    if (!vectorId || vectorId.length === 0) return;

    const fetchFile = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/vector-file?vectorId=${vectorId.join(",")}`
        );
        const data = await res.json();
        setFileData(data.file); // presupunem că backend trimite textul PDF-ului
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFile();
  }, [vectorId]);

  const handleUpload = async () => {
    if (!file) {
      setMessage(t("Warnings.incarca"));
      return;
    }

    setLoading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", id);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setMessage(t("Warnings.success"));
      } else {
        setMessage(t("Warnings.error") + data.error);
      }
    } catch (err) {
      console.log(err);
      setMessage(t("Warnings.error"));
    } finally {
      setLoading(false);
      setOpen(false);
      setFile(null);
    }
  };

  const handleDelete = () => {};

  console.log(fileData);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-md text-foreground py-1 border rounded-full px-4 cursor-pointer flex items-center gap-2">
          <div className="bg-red-500 py-1 px-[2px] rounded">
            <IoDocumentOutline className="w-3 h-3" color="white" />
          </div>
          <span>
            {vectorId && vectorId.length > 0
              ? `${vectorId.length} ${t("files")}${
                  vectorId.length > 1 ? "e" : ""
                }`
              : t("addFile")}
          </span>
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader className="mt-4">
          <DialogTitle className="flex items-center justify-between">
            <span>{t("foldersProject")}</span>
          </DialogTitle>
        </DialogHeader>
        {fileData && (
          <div className="border px-4 py-1 rounded flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-red-500 px-2 py-2 rounded text-white">
                <CiFolderOn />
              </span>
              <div className="flex flex-col">
                <span>{fileData.filename}</span>
                <span>PDF</span>
              </div>
              <a
                href={`/api/vector-file/original?fileId=${fileData.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Vezi PDF original
              </a>
            </div>
            <button
              className="hover:bg-gray-200 p-1 rounded cursor-pointer"
              onClick={handleDelete}
            >
              <RiDeleteBin6Line className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        )}
        {/* Input pentru fișier */}
        <label className="w-full cursor-pointer h-20 rounded">
          <div className="h-full border-2 border-dashed">
            <div className="h-full flex items-center justify-center mb-4">
              <FaFolderPlus className="w-8 h-8" />
            </div>
          </div>

          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            hidden
          />
        </label>

        {/* Buton de upload */}
        {file && (
          <p className="text-sm text-center">📄 Fișier selectat: {file.name}</p>
        )}
        <button
          onClick={handleUpload}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-full disabled:opacity-50 cursor-pointer"
        >
          {loading ? t("buttonLoading") : t("button")}
        </button>

        {/* Mesaj */}
        {message && <p className="mt-2 text-center">{message}</p>}
      </DialogContent>
    </Dialog>
  );
}
