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

router.post("/", async (req, res) => {
  const { question, tenantId } = req.body;
  if (!tenantId) return res.status(400).json({ error: "Missing tenantId" });

  try {
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question
    });

    const { data: chunks, error } = await supabase.rpc("match_documents", {
      query_embedding: embeddingRes.data[0].embedding,
      match_threshold: 0.75,
      match_count: 5
    });

    if (error) throw error;

    const filtered = chunks.filter(c => c.metadata?.tenant_id === tenantId);
    const context = filtered.map(c => c.content).join("\\n---\\n");

    const masterPrompt = fs.readFileSync("./prompts/master_prompt.yaml", "utf-8");

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: masterPrompt },
        { role: "user", content: `Manager question: ${question}\\n\\nRelevant context:\\n${context}` }
      ],
      temperature: 0.2
    });

    res.json({ answer: completion.choices[0].message.content, sources: filtered });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export { router };
