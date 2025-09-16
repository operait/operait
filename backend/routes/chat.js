import express from "express";
import fs from "fs";
import path from "path";
import { getOpenAI } from "../services/openai.js";

export const router = express.Router();
const openai = getOpenAI();

async function withRetry(fn, retries = 3, delay = 1000) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err) {
      if (err?.status === 429 && attempt < retries - 1) {
        const wait = delay * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, wait));
        attempt++;
      } else {
        throw err;
      }
    }
  }
}

router.post("/", async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res
        .status(400)
        .json({ error: "Request body must include 'message' (string)." });
    }

    // Folder holding tenant data
    const dataDir = path.join(process.cwd(), "data/fitness_connection/");
    const files = fs.readdirSync(dataDir).filter((f) => !f.startsWith("."));

    let context = "";

    for (const file of files) {
      const filePath = path.join(dataDir, file);

      try {
        let extracted = "";

        if (file.endsWith(".txt") || file.endsWith(".md")) {
          // Plain text / markdown
          extracted = fs.readFileSync(filePath, "utf-8");
        } else if (file.endsWith(".pdf")) {
          // PDF
          const pdfParse = (await import("pdf-parse")).default;
          const dataBuffer = fs.readFileSync(filePath);
          const pdfData = await pdfParse(dataBuffer);
          extracted = pdfData.text;
        } else if (file.endsWith(".docx")) {
          // DOCX
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ path: filePath });
          extracted = result.value;
        } else if (file.endsWith(".xlsx")) {
          // XLSX
          const XLSX = await import("xlsx");
          const workbook = XLSX.readFile(filePath);
          extracted = Object.keys(workbook.Sheets)
            .map(
              (sheetName) =>
                `Sheet: ${sheetName}\n` +
                XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName])
            )
            .join("\n");
        }

        if (extracted && extracted.trim().length > 0) {
          context += `\n---\n[${file}]\n${extracted}`;
        }
      } catch (err) {
        console.warn(`Failed to extract ${file}:`, err.message);
      }
    }

    // Load master prompt
    const promptPath = path.join(process.cwd(), "prompts/master_prompt.yaml");
    let masterPromptText = "You are ERA, an AI-powered Employee Relations coach.";
    if (fs.existsSync(promptPath)) {
      masterPromptText = fs.readFileSync(promptPath, "utf-8");
    }

    const completion = await withRetry(() =>
      openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: masterPromptText },
          {
            role: "user",
            content: `Manager question: ${message}\n\nTenant data context:\n${context}\n\n⚠️ IMPORTANT: Format the answer in strict Markdown.`,
          },
        ],
      })
    );

    console.log("SYSTEM PROMPT:\n", masterPromptText);
    console.log("USER MESSAGE:\n", message);
    console.log("RAW TENANT DATA CONTEXT:\n", context);

    const reply = completion.choices?.[0]?.message?.content || "";
    res.json({ reply });
  } catch (err) {
    next(err);
  }
});
