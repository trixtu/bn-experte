import express from "express";
import cors from "cors";
import multer from "multer";
import { addJob } from "./worker.js";

const app = express();
app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.get("/", (req, res) => res.send("Server OK"));

app.post("/upload/pdf", upload.single("pdf"), async (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");

  // Trimite job-ul către worker
  addJob({ buffer: req.file.buffer, filename: req.file.originalname });

  return res.json({ message: "PDF trimis la procesare!" });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server started on PORT:${PORT}`));
