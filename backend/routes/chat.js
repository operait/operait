import { Router } from "express";
import fs from "fs";
import OpenAI from "openai";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const router = Router();

// Supabase (service role key: backend only)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

try{
  
// Load decision matrix
const decisionMatrix = JSON.parse(fs.readFileSync("./decision-matrix.json", "utf-8"));

// Helpers
function titleFrom(text = "") {
  return (text || "").trim().slice(0, 60) || "New Chat";
}

async function ensureConversation(conversationId, titleSeed) {
  if (conversationId) {
    const { data, error } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!error && data) return conversationId;
  }
  const { data, error } = await supabase
    .from("conversations")
    .insert({ title: titleFrom(titleSeed) })
    .select()
    .single();
  if (error) throw error;
  return data.id;
}

router.get("/conversations", async (_req, res) => {
  const { data, error } = await supabase
    .from("conversations")
    .select("id,title,created_at")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get("/messages/:conversationId", async (req, res) => {
  const { conversationId } = req.params;
  const { data, error } = await supabase
    .from("messages")
    .select("id,role,content,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post("/chat", async (req, res) => {
  try {
    const { message, conversationId } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing 'message' (string)" });
    }

    const convId = await ensureConversation(conversationId, message);

    const systemPrompt = `You are Era, an AI agent for Operait.
Use the following decision matrix to guide responses:
${JSON.stringify(decisionMatrix, null, 2)}
When the user's question maps to the matrix, explain clearly and professionally.`;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ];

    let replyText = "";
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages
      });
      replyText = completion?.choices?.[0]?.message?.content ?? "No response.";
    } catch (err) {
      console.error("OpenAI error:", err?.response?.data || err?.message || err);
      replyText = "⚠️ Demo mode: OpenAI not available.";
    }

    const { data: inserted, error } = await supabase
      .from("messages")
      .insert([
        { conversation_id: convId, role: "user", content: message },
        { conversation_id: convId, role: "assistant", content: replyText }
      ])
      .select();

    if (error) throw error;

    res.json({ reply: replyText, conversationId: convId });
  } catch (err) {
    console.error("chat error:", err);
    res.status(500).json({ error: "Failed to generate or persist message." });
  }
});

router.post("/feedback", async (req, res) => {
  try {
    const { messageId, value } = req.body || {};
    if (!messageId || !value) return res.status(400).json({ error: "messageId and value required" });
    const { error } = await supabase.from("feedback").insert([{ message_id: messageId, value }]);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to save feedback" });
  }
});


 }catch (err) {
  console.error("❌ chat.js failed to load:", err.message);
}

// DELETE /api/conversations/:id
router.delete("/conversations/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Delete all messages first
    const { error: msgErr } = await supabase
      .from("messages")
      .delete()
      .eq("conversation_id", id);
    if (msgErr) throw msgErr;

    // Then delete conversation
    const { error: convErr } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id);
    if (convErr) throw convErr;

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Delete conversation failed:", err.message);
    res.status(500).json({ error: "Delete failed" });
  }
});



export default router;
