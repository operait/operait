import express from "express";
import OpenAI from "openai";
import { PassThrough } from "stream";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", async (req, res) => {
  try {
    let { messages, message } = req.body;

    // Normalize input: support both "message" (string) and "messages" (array)
    if (!messages && message) {
      messages = [
        { role: "system", content: "You are ERA, an AI-powered Employee Relations coach." },
        { role: "user", content: message }
      ];
    }

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "Request body must include 'messages' (array) or 'message' (string)." });
    }

    const stream = await openai.chat.completions.create({
      model: "gpt-4.1-mini",   // fallback-friendly, can adjust to gpt-3.5-turbo if needed
      messages,
      stream: true,
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const pass = new PassThrough();
    pass.pipe(res);

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        pass.write(`data: ${JSON.stringify({ content })}

`);
        res.flush?.();
      }
    }

    pass.write("data: [DONE]\n\n");
    pass.end();
  } catch (err) {
    console.error("Chat streaming error:", err);
    if (err.status === 429) {
      return res.status(429).json({
        error: "ERA is rate-limited by OpenAI. Please retry in a few seconds."
      });
    }
    res.status(500).json({ error: err.message });
  }
});

export { router };
