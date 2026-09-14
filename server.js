import "dotenv/config";
import express from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDemoAnalysis, compactRowsForAi } from "./lib/analytics.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/sample-data/sales.csv", (_req, res) => {
  res.sendFile(path.join(__dirname, "sample-data", "sales.csv"));
});

app.post("/api/parse", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Choose a CSV or XLSX file." });

    const extension = path.extname(req.file.originalname).toLowerCase();
    if (![".csv", ".xlsx", ".xls"].includes(extension)) {
      return res.status(400).json({ error: "Supported formats: CSV, XLSX, XLS." });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return res.status(400).json({ error: "The workbook has no sheets." });

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
      defval: "",
      raw: false
    });

    if (rows.length === 0) return res.status(400).json({ error: "The table is empty." });

    const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    res.json({
      fileName: req.file.originalname,
      sheetName: firstSheetName,
      rowCount: rows.length,
      headers,
      rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not parse the table." });
  }
});

app.post("/api/analyze", async (req, res) => {
  try {
    const rows = compactRowsForAi(req.body?.rows);
    const question = String(req.body?.question || "Summarize the most important patterns in this table.").trim();

    if (rows.length === 0) return res.status(400).json({ error: "No table rows were supplied." });
    if (question.length > 1000) return res.status(400).json({ error: "Question is too long." });

    const apiKey = process.env.AI_API_KEY?.trim();
    if (!apiKey) {
      return res.json({ mode: "demo", answer: buildDemoAnalysis(rows, question) });
    }

    const apiUrl = process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions";
    const model = process.env.AI_MODEL || "gpt-5.6-sol";
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You are a data analyst. Answer from the supplied table only. Be concise, mention calculations when useful, and state when the data is insufficient."
          },
          {
            role: "user",
            content: `Question: ${question}\n\nTable rows (JSON):\n${JSON.stringify(rows)}`
          }
        ],
        temperature: 0.2
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || `AI API returned HTTP ${response.status}.`;
      return res.status(502).json({ error: message });
    }

    const answer = payload?.choices?.[0]?.message?.content;
    if (!answer) return res.status(502).json({ error: "AI API returned no answer." });

    res.json({ mode: "ai", model, answer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Analysis failed." });
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File is too large. Maximum size is 5 MB." });
  }
  console.error(error);
  res.status(500).json({ error: "Unexpected server error." });
});

app.listen(port, () => {
  console.log(`AI Table Analyzer: http://localhost:${port}`);
});
