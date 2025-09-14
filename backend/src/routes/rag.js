import { Router } from "express";
import { z } from "zod";
import { getOpenAI } from "../services/openai.js";
import { getSupabase } from "../services/supabase.js";
import { initSSE, sendSSE, endSSE } from "../utils/sse.js";

export const router = Router();
const RagSchema = z.object({ message: z.string().min(1) });

router.post("/stream", async (req, res, next) => {
  try {
    const { message } = RagSchema.parse(req.body);
    const openai = getOpenAI();

    const embeddingResp = await openai.embeddings.create({ model: "text-embedding-3-small", input: message });
    const queryEmbedding = embeddingResp.data[0].embedding;

    const supabase = getSupabase();
    let docs = [];
    if (supabase) {
      const { data, error } = await supabase.rpc("match_documents", {
        query_embedding: queryEmbedding,
        match_threshold: 0.8,
        match_count: 3
      });
      if (!error) docs = data;
    }

    const context = docs?.map(d => d.content).join("\n---\n") || "";
    const system = `You are ERA, answer using the following context:\n${context}`;

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: system }, { role: "user", content: message }],
      stream: true
    });

    initSSE(res);
    for await (const chunk of stream) {
      const token = chunk.choices?.[0]?.delta?.content || "";
      if (token) sendSSE(res, token);
    }
    endSSE(res, { sources: docs });
  } catch (err) { next(err); }
});
