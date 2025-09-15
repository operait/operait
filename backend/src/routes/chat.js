import express from "express";
import { PassThrough } from "stream";
import { z } from "zod";
import { getOpenAI } from "../services/openai.js";

export const router = express.Router();

const BodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["system","user","assistant"]),
    content: z.string()
  }))
});

// Simple model fallback list
const MODEL_PREFERENCE = ["gpt-4.1-mini","gpt-4o-mini","gpt-3.5-turbo"];

async function createStream(openai, messages){
  let lastErr;
  for(const model of MODEL_PREFERENCE){
    try{
      return await openai.chat.completions.create({ model, messages, stream: true });
    }catch(err){
      lastErr = err;
      // if it's a rate limit, try next model
      if(err?.status === 429) continue;
      throw err;
    }
  }
  throw lastErr;
}

router.post("/", async (req, res) => {
  try {
    const { messages } = BodySchema.parse(req.body);
    const openai = getOpenAI();

    const stream = await createStream(openai, messages);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const pass = new PassThrough();
    pass.pipe(res);

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content || "";
      if (content) {
        pass.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    pass.write("data: [DONE]\n\n");
    pass.end();
  } catch (err) {
    console.error("Chat streaming error:", err);
    const status = err?.status === 429 ? 429 : 500;
    const message = status === 429
      ? "ERA is rate-limited by OpenAI. Please retry in a few seconds."
      : err.message || "Failed to stream response";
    res.status(status).json({ error: message });
  }
});
