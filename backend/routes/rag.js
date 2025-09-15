import fs from "fs";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY });

export async function ragChat(req, res) {
  const { question, tenantId } = req.body;
  if (!tenantId) return res.status(400).json({ error: "Missing tenantId" });

  // 1. Embed question
  const embeddingRes = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: question
  });

  // 2. Retrieve relevant chunks
  const { data: chunks, error } = await supabase.rpc("match_documents", {
    query_embedding: embeddingRes.data[0].embedding,
    match_threshold: 0.75,
    match_count: 5
  });

  if (error) return res.status(500).json({ error });

  // Filter chunks to this tenant only
  const filtered = chunks.filter(c => c.metadata?.tenant_id === tenantId);
  const context = filtered.map(c => c.content).join("\n---\n");

  // 3. Load master prompt
  const masterPrompt = fs.readFileSync("./prompts/master_prompt.yaml", "utf-8");

  // 4. Send to OpenAI
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: masterPrompt },
      { role: "user", content: `Manager question: ${question}\n\nRelevant context:\n${context}` }
    ],
    temperature: 0.2
  });

  res.json({ answer: completion.choices[0].message.content, sources: filtered });
}
