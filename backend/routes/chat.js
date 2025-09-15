import { Router } from "express";
import { z } from "zod";
import { getOpenAI } from "../services/openai.js";
import { initSSE, sendSSE, endSSE } from "../utils/sse.js";

export const router = Router();
const ChatSchema = z.object({
  message: z.string().min(1),
  system: z.string().optional(),
  history: z.array(z.object({
    role: z.enum(["system","user","assistant"]),
    content: z.string()
  })).optional()
});

router.post("/", async (req, res, next) => {
  try {
    const body = ChatSchema.parse(req.body);
    const messages = [];
    if (body.system) messages.push({ role: "system", content: body.system });
    if (Array.isArray(body.history)) messages.push(...body.history);
    messages.push({ role: "user", content: body.message });

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({ model: "gpt-3.5-turbo", messages });
    res.json({ reply: completion.choices?.[0]?.message?.content ?? "" });
  } catch (err) { next(err); }
});

router.post("/stream", async (req, res, next) => {
  try {
    const body = ChatSchema.parse(req.body);
    const messages = [];
    if (body.system) messages.push({ role: "system", content: body.system });
    if (Array.isArray(body.history)) messages.push(...body.history);
    messages.push({ role: "user", content: body.message });

    const openai = getOpenAI();
    const stream = await openai.chat.completions.create({ model: "gpt-3.5-turbo", messages, stream: true });

    initSSE(res);
    for await (const chunk of stream) {
      const token = chunk.choices?.[0]?.delta?.content || "";
      if (token) sendSSE(res, token);
    }
    endSSE(res);
  } catch (err) { next(err); }
});
