import { openai } from "@/lib/openai";
import { notFound } from "next/navigation";
import React from "react";
import { CiFolderOn } from "react-icons/ci";
import UploadPdf from "../../add-new/_components/upload-pdf";
import Chat from "../../chat";
import { SelectorLimba } from "../../selector-limba";

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  let assistant;
  try {
    assistant = await openai.beta.assistants.retrieve(id);
  } catch (e) {
    return notFound();
  }

  return (
    <div className="lg:px-32 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CiFolderOn className="w-8 h-8" color="blue" />
          <h1 className="text-2xl">{assistant.name}</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* selector limbă */}
          <SelectorLimba />

          {/* upload pdf */}
          <UploadPdf
            id={id}
            vectorId={assistant.tool_resources?.file_search?.vector_store_ids}
          />
        </div>
      </div>
      <div className="mt-4">
        <Chat assistantId={assistant.id} />
      </div>
    </div>
  );
};

export default page;
