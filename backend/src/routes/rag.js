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
  try{
    const body = BodySchema.parse(req.body);
    const message = body.message || body.question;
    if(!message) return res.status(400).json({ error: "Missing 'question' or 'message' in body" });

    const openai = getOpenAI();
    const embeddingResp = await withRetry(() => openai.embeddings.create({ model: "text-embedding-3-small", input: message }));
    const queryEmbedding = embeddingResp.data[0].embedding;

    const supabase = getSupabase();
    let docs = [];
    if (supabase) {
      const { data, error } = await supabase.rpc("match_documents", {
        query_embedding: queryEmbedding,
        match_threshold: 0.75,
        match_count: 5
      });
      if (!error) docs = data;
    }

    const context = docs?.map(d => d.content).join("\n---\n") || "";
    let masterPromptObj = {};
    let masterPromptText = "You are ERA. Be concise and helpful.";
    const promptPath = process.cwd() + "/prompts/master_prompt.yaml";
    if (fs.existsSync(promptPath)) {
      const yamlText = fs.readFileSync(promptPath, "utf-8");
      masterPromptObj = yaml.load(yamlText);
      // Build a rich system prompt from YAML fields
      masterPromptText = [
        masterPromptObj.system?.role,
        masterPromptObj.goals ? `Goals: ${masterPromptObj.goals.join(" ")}` : "",
        masterPromptObj.guardrails ? `Guardrails: ${masterPromptObj.guardrails.join(" ")}` : "",
        masterPromptObj.company_context ? `Company: ${JSON.stringify(masterPromptObj.company_context)}` : "",
        masterPromptObj.expertise ? `Expertise: ${masterPromptObj.expertise.join(" ")}` : "",
        masterPromptObj.response_style ? `Response Style: ${JSON.stringify(masterPromptObj.response_style)}` : "",
        masterPromptObj.rules_of_engagement ? `Rules: ${masterPromptObj.rules_of_engagement.join(" ")}` : ""
      ].filter(Boolean).join("\n\n");
    }

    const completion = await withRetry(() =>
      openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: masterPromptText },
          { role: "user", content: `Manager question: ${message}\n\nRelevant context:\n${context}` }
        ]
      })
    );
    const reply = completion.choices?.[0]?.message?.content || "";
    res.json({ reply, sources: docs });
  }catch(err){ next(err); }
});

// Keep the previous /stream path too for compatibility
router.post("/stream", async (req,res,next)=>router.handle(req,res,next));
