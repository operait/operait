import express from "express";
import fs from "fs";
import yaml from "js-yaml";
import { z } from "zod";
import { getOpenAI } from "../services/openai.js";
import { getSupabase } from "../services/supabase.js";
import { initSSE, sendSSE, endSSE } from "../utils/sse.js";

export const router = express.Router();

const BodySchema = z.object({
  tenantId: z.string().min(1).optional(), // optional for now
  question: z.string().min(1).optional(),
  message: z.string().min(1).optional()
});

async function withRetry(fn, retries=3, delay=1000){
  let attempt=0;
  while(attempt<retries){
    try{ return await fn(); }
    catch(err){
      if(err?.status===429 && attempt<retries-1){
        const wait = delay * Math.pow(2, attempt);
        await new Promise(r=>setTimeout(r, wait));
        attempt++;
      } else { throw err; }
    }
  }
}

router.post("/", async (req, res, next) => {
  try{
    const body = BodySchema.parse(req.body);
    const message = body.message || body.question;
    if(!message) return res.status(400).json({ error: "Missing 'question' or 'message' in body" });

    const openai = getOpenAI();
    const embeddingResp = await withRetry(() => openai.embeddings.create({ model: "text-embedding-3-small", input: message }));
    const queryEmbedding = embeddingResp.data[0].embedding;

    const supabase = getSupabase();
    let docs = [];
    if (supabase) {
      const { data, error } = await supabase.rpc("match_documents", {
        query_embedding: queryEmbedding,
        match_threshold: 0.75,
        match_count: 5
      });
      if (!error) docs = data;
    }

    const context = docs?.map(d => d.content).join("\n---\n") || "";
    let masterPromptObj = {};
    let masterPromptText = "You are ERA. Be concise and helpful.";
    const promptPath = process.cwd() + "/prompts/master_prompt.yaml";
    let formattingInstructions = `\n\nAlways answer with:\n(a) Policy Reference,\n(b) Step-by-Step Guidance,\n(c) Sample Template Language,\n(d) When to Escalate.\nUse bullet points, clear sections, and cite sources/templates.\nStructure your response as follows:\n- Situation summary:\n- Key risks/compliance notes:\n- Recommended steps (with reasoning):\n- Conversation script:\n- Dialogue script/decision matrix (common employee responses & manager follow-ups):\n- Display relevant templated response to copy and paste from: (Excel template_er_ops_templates_tenant_20250912.xlsx)`;
    let goldExample = `\n\nExample:\nSituation summary: Manager is considering a formal corrective action for repeated tardiness.\nKey risks/compliance notes:\n• Attendance/tardiness must be documented consistently across all employees.\n• Confirm whether lateness is tied to protected reasons (e.g., FMLA, ADA, state leave).\n• Managers should not issue corrective action without verifying with official templates.\nRecommended steps (with reasoning):\n1. Review timekeeping records to ensure accurate documentation.\n2. Have a coaching conversation first (progressive discipline).\n3. If no improvement, issue formal Corrective Action using the official template.\nConversation script:\n'I’ve noticed you’ve been late several times recently. Is there anything impacting your ability to arrive on time? Our expectation per policy is consistent punctuality. Going forward, we’ll need to see improvement in this area.'\nDisplay relevant templated response to copy and paste from Corrective Action template (template_er_ops_templates_tenant_20250912.xlsx, tab: Attendance).`;
    if (fs.existsSync(promptPath)) {
      const yamlText = fs.readFileSync(promptPath, "utf-8");
      masterPromptObj = yaml.load(yamlText);
      // Build a rich system prompt from YAML fields
      masterPromptText = [
        masterPromptObj.system?.role,
        masterPromptObj.goals ? `Goals: ${masterPromptObj.goals.join(" ")}` : "",
        masterPromptObj.guardrails ? `Guardrails: ${masterPromptObj.guardrails.join(" ")}` : "",
        masterPromptObj.company_context ? `Company: ${JSON.stringify(masterPromptObj.company_context)}` : "",
        masterPromptObj.expertise ? `Expertise: ${masterPromptObj.expertise.join(" ")}` : "",
        masterPromptObj.response_style ? `Response Style: ${JSON.stringify(masterPromptObj.response_style)}` : "",
        masterPromptObj.rules_of_engagement ? `Rules: ${masterPromptObj.rules_of_engagement.join(" ")}` : "",
        formattingInstructions,
        goldExample
      ].filter(Boolean).join("\n\n");
    } else {
      masterPromptText += formattingInstructions + goldExample;
    }

  // Log what is being sent to GPT (after context and prompt construction)
  console.log("SYSTEM PROMPT:\n", masterPromptText);
  console.log("USER MESSAGE:\n", message);
  console.log("RELEVANT CONTEXT CHUNKS:\n", docs);

    const completion = await withRetry(() =>
      openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: masterPromptText },
          { role: "user", content: `Manager question: ${message}\n\nRelevant context:\n${context}` }
        ]
      })
    );
    const reply = completion.choices?.[0]?.message?.content || "";
    res.json({ reply, sources: docs });
  }catch(err){ next(err); }
});

// Keep the previous /stream path too for compatibility
router.post("/stream", async (req,res,next)=>router.handle(req,res,next));
