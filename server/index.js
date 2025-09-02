import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Queue } from 'bullmq';
import { QdrantVectorStore } from '@langchain/qdrant';
import { QdrantClient } from "@qdrant/js-client-rest";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import Groq from "groq-sdk";
import 'dotenv/config';

// const qdrantUrl = process.env.QDRANT_URL;
// const redisHost = process.env.REDIS_HOST;
// const redisPort = process.env.REDIS_PORT;
// const hfApiKey = process.env.HF_API_KEY;
// const groqApiKey = process.env.GROQ_API_KEY;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});


const queue = new Queue('file-upload-queue', {
  connection:{
    url:process.env.REDIS_URL
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

const app = express();

app.use(cors({
  origin: ['*','http://localhost:8000','https://bn-experte-production.up.railway.app','http://localhost:3000','https://keen-laughter-production.up.railway.app'], // pentru test poți lăsa *, apoi specifică domeniile reale
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.get('/', (req, res) => {
  return res.json({ status: 'All Good!' });
});


app.post('/upload/pdf', upload.single('pdf'), async (req, res) => {
   const manualName = req.body.manualName; // fiecare manual are un ID
  if (!manualName) return res.status(400).json({ error: "manualName lipsă" });

  try {
    await queue.add(
      'file-ready',
      {
        filename: req.file.originalname,
        destination: req.file.destination,
        path: req.file.path,
        manualName
      }
    );
    res.json({ message: 'PDF încărcat și trimis la procesare', manualName });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Upload failed" });
  }
});

app.get("/manuals", async (req, res) => {
  try {
    // Preia lista de colecții (fiecare colecție = un manual)
    const collections = await qdrant.getCollections();
    const manualNames = collections.collections.map(c => c.name);
    
    res.json({ manuals: manualNames });
  } catch (err) {
    console.error("Error fetching manuals from Qdrant:", err);
    res.status(500).json({ manuals: [] });
  }
});

app.get('/chat', async (req, res) => {

  try {
    const { message, manualName } = req.query;
    if (!message || !manualName) return res.status(400).json({ error: "Lipsește message sau manualName" });

    const embeddings = new HuggingFaceInferenceEmbeddings({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      apiKey: process.env.HF_API_KEY,
      provider: "hf-inference",
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: process.env.QDRANT_URL,
        collectionName: `${manualName}`,
        clientOptions: { checkCompatibility: false },
        apiKey: process.env.QDRANT_API_KEY
      }
    );

    const retriever = vectorStore.asRetriever({ k: 3 });
    const result = await retriever.invoke(message);

    const context = result.map(r => r.pageContent).slice(0, 3).join("\n\n");
    
    const SYSTEM_PROMPT = `
      Ești un asistent care răspunde STRICT pe baza manualului selectat și explică clar în limba română.
      Dacă răspunsul nu se găsește în manual, răspunde: "Nu am informații în manualul curent."

      Context:
      ${context}
    `;

    const chat = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",   // ⚡ rapid și puternic
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
      temperature: 0.2,
    });

    const answer = chat.choices[0]?.message?.content ?? "Eroare la generare";

    return res.json({
      answer,
      sources: result.map(r => ({
        text: r.pageContent,
        metadata: r.metadata,
      })),
    });
  } catch (error) {
    console.log(error)
    return res.status(500).json({ error: "Eroare la procesarea cererii" });
  }
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => console.log(`Server started on PORT:${PORT}`));
