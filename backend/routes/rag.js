import express from "express";
import fs from "fs";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// helper: retry wrapper
async function withRetry(fn, retries = 3, delay = 1000) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err) {
      if (err.status === 429 && attempt < retries - 1) {
        const wait = delay * Math.pow(2, attempt); // exponential backoff
        console.warn(`⚠️ Rate limit hit. Retrying in ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
        attempt++;
      } else {
        throw err;
      }
    }
  }
}

router.post("/", async (req, res) => {
  const { question, tenantId } = req.body;
  if (!tenantId) return res.status(400).json({ error: "Missing tenantId" });

  try {
    // 1. Embed question with retry
    const embeddingRes = await withRetry(() =>
      openai.embeddings.create({
        model: "text-embedding-3-small",
        input: question
      })
    );

    // 2. Retrieve relevant chunks
    const { data: chunks, error } = await supabase.rpc("match_documents", {
      query_embedding: embeddingRes.data[0].embedding,
      match_threshold: 0.75,
      match_count: 5
    });

    if (error) throw error;

    const filtered = chunks.filter(c => c.metadata?.tenant_id === tenantId);
    const context = filtered.map(c => c.content).join("\n---\n");

    // 3. Load master prompt
    const masterPrompt = fs.readFileSync("./prompts/master_prompt.yaml", "utf-8");

    // 4. Generate response with retry
    const completion = await withRetry(() =>
      openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: masterPrompt },
          { role: "user", content: `Manager question: ${question}\n\nRelevant context:\n${context}` }
        ],
        temperature: 0.2
      })
    );

    res.json({ answer: completion.choices[0].message.content, sources: filtered });
  } catch (err) {
    console.error(err);
    if (err.status === 429) {
      return res.status(429).json({
        error: "ERA is temporarily unavailable due to usage limits. Please retry in a few seconds."
      });
    }
    res.status(500).json({ error: err.message });
  }
});

export { router };
