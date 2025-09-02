import { Worker } from 'bullmq';
import { QdrantVectorStore } from '@langchain/qdrant';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { CharacterTextSplitter } from '@langchain/textsplitters';
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import fs from 'fs';
import 'dotenv/config';

const worker = new Worker(
  'file-upload-queue',
  async (job) => {
    console.log("📥 Job primit:", job.data);

    try {
      const { path, manualName } = job.data;

      // Verific dacă fișierul există
      if (!fs.existsSync(path)) {
        throw new Error(`❌ Fișierul nu există: ${path}`);
      }

      // 1️⃣ Încarcă PDF-ul
      console.log("➡ Încărc PDF:", path);
      const loader = new PDFLoader(path);
      let docs = await loader.load();
      console.log(`✅ PDF încărcat (${docs.length} pagini)`);

      // 2️⃣ Split în chunk-uri
      const splitter = new CharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
      docs = await splitter.splitDocuments(docs);
      console.log(`✅ PDF împărțit în ${docs.length} chunk-uri`);

      if (docs.length === 0) {
        throw new Error("❌ Nu s-a extras niciun text din PDF!");
      }

      // 3️⃣ Creează embeddings HuggingFace
      const embeddings = new HuggingFaceInferenceEmbeddings({
        model: "sentence-transformers/all-MiniLM-L6-v2",
        apiKey: process.env.HF_API_KEY,
      });
      console.log("✅ Embeddings inițializat");

      // 4️⃣ Stochează în Qdrant
      await QdrantVectorStore.fromDocuments(
        docs,
        embeddings,
        {
          url: process.env.QDRANT_URL,
          collectionName: `manual-${manualName}`,
          clientOptions: { checkCompatibility: false },
          apiKey: process.env.QDRANT_API_KEY,
        }
      );

      console.log("🎉 Toate documentele au fost adăugate în Qdrant!");
    } catch (error) {
      console.error("❌ Eroare la procesarea jobului:", error);
    }

  },
  {
    concurrency: 5,
    connection: {
      url: process.env.REDIS_URL, // ex: redis://redis:6379
    }
  }
);
