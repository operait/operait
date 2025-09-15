import express from "express";
import fs from "fs";
import yaml from "js-yaml";
import { z } from "zod";
import { getOpenAI } from "../services/openai.js";
import { getSupabase } from "../services/supabase.js";
import { initSSE, sendSSE, endSSE } from "../utils/sse.js";

export const router = express.Router();

const BodySchema = z.object({
  tenantId: z.string().min(1).optional(), // optional for now
  question: z.string().min(1).optional(),
  message: z.string().min(1).optional()
});

async function withRetry(fn, retries=3, delay=1000){
  let attempt=0;
  while(attempt<retries){
    try{ return await fn(); }
    catch(err){
      if(err?.status===429 && attempt<retries-1){
        const wait = delay * Math.pow(2, attempt);
        await new Promise(r=>setTimeout(r, wait));
        attempt++;
      } else { throw err; }
    }
  }
}

router.post("/", async (req, res, next) => {
    console.log("Posting!!!");
  try{
    const body = BodySchema.parse(req.body);
    const message = body.message || body.question;
    if(!message) return res.status(400).json({ error: "Missing 'question' or 'message' in body" });

    // Load all tenant data files (any type) as context
    const dataDir = process.cwd() + "/data/fitness_connection/";
    const files = fs.readdirSync(dataDir).filter(f => !f.startsWith("."));
    let context = "";
    for (const file of files) {
      const filePath = dataDir + file;
      if (fs.existsSync(filePath)) {
        try {
          let extracted = "";
          if (file.endsWith('.pdf')) {
            // PDF extraction
            const pdfjsLib = require('pdf-parse');
            const dataBuffer = fs.readFileSync(filePath);
            try {
              const pdfData = await pdfjsLib(dataBuffer);
              extracted = pdfData.text;
            } catch (e) {
              extracted = '[PDF extraction error]';
            }
          } else if (file.endsWith('.docx')) {
            // DOCX extraction using mammoth
            const mammoth = require('mammoth');
            try {
              const result = await mammoth.extractRawText({ path: filePath });
              extracted = result.value;
            } catch (e) {
              extracted = '[DOCX extraction error]';
            }
  // NOTE: The xlsx package has a known high-severity vulnerability (Prototype Pollution, ReDoS).
  // Only use it on trusted files from your own tenant data folder. Do not process untrusted user uploads.
          } else if (file.endsWith('.xlsx')) {
            // XLSX extraction
            const XLSX = require('xlsx');
            try {
              const workbook = XLSX.readFile(filePath);
              extracted = Object.keys(workbook.Sheets).map(sheetName => {
                return `Sheet: ${sheetName}\n` + XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
              }).join('\n');
            } catch (e) {
              extracted = '[XLSX extraction error]';
            }
          } else {
            // Try reading as utf-8 text
            try {
              extracted = fs.readFileSync(filePath, "utf-8");
            } catch (e) {
              extracted = '[Unreadable file type]';
            }
          }
          context += `\n---\n[${file}]\n` + extracted;
        } catch (e) {
          context += `\n[${file}] (error reading file)`;
        }
      } else {
        context += `\n[${file}] (not found)`;
      }
    }
    let docs = files.map(f => ({ file: f })); // For logging compatibility
    const promptPath = process.cwd() + "/prompts/master_prompt.yaml";
    let masterPromptText;
    if (fs.existsSync(promptPath)) {
      masterPromptText = fs.readFileSync(promptPath, "utf-8");
    }

  // Log what is being sent to GPT (after context and prompt construction)
  console.log("SYSTEM PROMPT:\n", masterPromptText);
  console.log("USER MESSAGE:\n", message);
  console.log("RAW TENANT DATA CONTEXT:\n", context);

    const completion = await withRetry(() =>
      openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: masterPromptText },
          { role: "user", content: `Manager question: ${message}\n\nTenant data context:\n${context}` }
        ]
      })
    );
    const reply = completion.choices?.[0]?.message?.content || "";
    res.json({ reply, sources: files });
  }catch(err){ next(err); }
});

// Keep the previous /stream path too for compatibility
router.post("/stream", async (req,res,next)=>router.handle(req,res,next));
