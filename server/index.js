import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Queue } from 'bullmq';
import { QdrantVectorStore } from '@langchain/qdrant';
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import Groq from "groq-sdk";
import 'dotenv/config';

// const qdrantUrl = process.env.QDRANT_URL;
// const redisHost = process.env.REDIS_HOST;
// const redisPort = process.env.REDIS_PORT;
// const hfApiKey = process.env.HF_API_KEY;
// const groqApiKey = process.env.GROQ_API_KEY;

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


const queue = new Queue('file-upload-queue', {
  connection: process.env.REDIS_URL
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
  origin: "*", // pentru test poți lăsa *, apoi specifică domeniile reale
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.get('/', (req, res) => {
  return res.json({ status: 'All Good!' });
});


app.post('/upload/pdf', upload.single('pdf'), async (req, res) => {
  try {
    await queue.add(
      'file-ready',
      JSON.stringify({
        filename: req.file.originalname,
        destination: req.file.destination,
        path: req.file.path,
      })
    );
    return res.json({ message: 'uploaded' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Upload failed" });
  }
});

app.get('/chat', async (req, res) => {

  try {
    const userQuery = req.query.message;
    if (!userQuery) return res.status(400).json({ error: "Missing message" });

    const embeddings = new HuggingFaceInferenceEmbeddings({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      apiKey: process.env.HF_API_KEY,
      provider: "hf-inference",
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: 'http://qdrant:6333',
        collectionName: "langchainjs-testing",
        clientOptions: { checkCompatibility: false },
      }
    );

    const retriever = vectorStore.asRetriever({ k: 3 });
    const result = await retriever.invoke(userQuery);

    const context = result.map(r => r.pageContent).slice(0, 3).join("\n\n");
    
    const SYSTEM_PROMPT = `
      Ești un asistent care răspunde STRICT pe baza manualului PDF încărcat si imi explici in limba romana. 
      Dacă nu găsești răspunsul în context poti cauta si pe internet dar sa specifici ca este luat din internet"

      Context:
      ${context}
    `;

    const chat = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",   // ⚡ rapid și puternic
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userQuery },
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

app.listen(8000, () => console.log(`Server started on PORT:${PORT}`));
