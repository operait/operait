import express from "express";
import OpenAI from "openai";
import { PassThrough } from "stream";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", async (req, res) => {
  try {
    const { messages } = req.body;

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
        pass.write(`data: ${JSON.stringify({ content })}\n\n`);
        res.flush?.();
      }
    }

    pass.write("data: [DONE]\n\n");
    pass.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to stream response" });
  }
});

export { router };
