import { Worker } from 'bullmq';
import { QdrantVectorStore } from '@langchain/qdrant';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { CharacterTextSplitter } from '@langchain/textsplitters';
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import 'dotenv/config';


const worker = new Worker(
  'file-upload-queue',
  async (job) => {
    console.log(`Job:`, job.data);
    const data = JSON.parse(job.data);
    /*
    Path: data.path
    read the pdf from path,
    chunk the pdf,
    call the openai embedding model for every chunk,
    store the chunk in qdrant db
    */

    // Load the PDF
    const loader = new PDFLoader(data.path);
    let docs = await loader.load();

    
    // 3️⃣ Creează embeddings folosind Hugging Face (gratis)
    const embeddings = new HuggingFaceInferenceEmbeddings({
      model: "sentence-transformers/all-MiniLM-L6-v2", 
      apiKey: process.env.HF_API_KEY,
    });


    // 2️⃣ Împarte textul în chunk-uri mai mici
    const splitter = new CharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
    docs = await splitter.splitDocuments(docs);


    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: process.env.QDRANT_URL,
        collectionName: 'langchainjs-testing',
        clientOptions: { checkCompatibility: false },
      }
    );
    await vectorStore.addDocuments(docs);
    console.log("✅ Toate documentele au fost adăugate în Qdrant!");
    
  },
  {
    concurrency: 100,
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
    }
  }
);
