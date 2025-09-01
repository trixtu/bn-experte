import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { QdrantVectorStore } from "@langchain/qdrant";

const jobQueue = [];

// Adaugă job
export function addJob(job) {
  jobQueue.push(job);
  processJobs();
}

// Procesează job-urile (in-memory)
let isProcessing = false;
async function processJobs() {
  if (isProcessing) return;
  isProcessing = true;

  while (jobQueue.length > 0) {
    const job = jobQueue.shift();
    try {
      console.log("Procesăm PDF:", job.filename);

      // Salvează temporar PDF-ul în /tmp
      const tmpPath = `/tmp/${job.filename}`;
      await import("fs").then(fs => fs.promises.writeFile(tmpPath, job.buffer));

      // Încarcă PDF-ul
      const loader = new PDFLoader(tmpPath);
      let docs = await loader.load();

      // Split text
      const splitter = new CharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
      docs = await splitter.splitDocuments(docs);

      // Embeddings
      const embeddings = new HuggingFaceInferenceEmbeddings({
        model: "sentence-transformers/all-MiniLM-L6-v2",
        apiKey: process.env.HF_API_KEY,
      });

      // Qdrant
      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
          url: process.env.QDRANT_URL,
          collectionName: "langchainjs-testing",
          clientOptions: { checkCompatibility: false },
        }
      );

      await vectorStore.addDocuments(docs);
      console.log("✅ PDF procesat:", job.filename);
    } catch (err) {
      console.error("Eroare la procesarea PDF:", err);
    }
  }

  isProcessing = false;
}
