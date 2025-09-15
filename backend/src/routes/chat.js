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


`);
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages
    });
    const reply = completion.choices?.[0]?.message?.content || "";
    res.json({ reply });
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
