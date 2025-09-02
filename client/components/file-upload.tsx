"use client";
import * as React from "react";
import { Input } from "./ui/input";
import { Upload } from "lucide-react";

const FileUploadComponent: React.FC = () => {
  const [manualName, setManualName] = React.useState<string>("");
  const [file, setFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!manualName.trim()) {
      alert("Te rog introdu numele manualului!");
      return;
    }
    if (!file) {
      alert("Te rog selectează un fișier PDF!");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("manualName", manualName);

    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/pdf`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      alert(`Manualul "${manualName}" a fost încărcat cu succes!`);
      setManualName("");
      setFile(null);
    } catch (err) {
      console.error(err);
      alert("Eroare la încărcarea PDF-ului");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shadow-2xl flex flex-col justify-center items-center p-4 rounded-lg border-2 gap-4 w-full max-w-md mx-auto">
      <Input
        type="text"
        value={manualName}
        onChange={(e) => setManualName(e.target.value)}
        placeholder="Nume manual"
        className="p-2 rounded w-full"
      />
      <label className="border border-gray-300 border-dashed flex  items-center justify-center text-center bg-gray-100 rounded py-2 cursor-pointer">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="cursor-pointer ml-4 w-full"
        />
        <Upload className="mr-4" />
      </label>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 p-2 rounded w-full text-white"
      >
        {loading ? "Uploading..." : "Upload PDF"}
      </button>
    </div>
  );
};

export default FileUploadComponent;
