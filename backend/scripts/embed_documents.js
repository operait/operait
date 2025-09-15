import "dotenv/config";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { encode } from "gpt-3-encoder";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Helper: delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: retry with exponential backoff
async function withRetry(fn, retries = 3, delay = 1000) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err) {
      if (err.status === 429 && attempt < retries - 1) {
        const wait = delay * Math.pow(2, attempt);
        console.warn(`⚠️ Rate limit hit. Retrying in ${wait}ms...`);
        await sleep(wait);
        attempt++;
      } else {
        throw err;
      }
    }
  }
}

function chunkText(text, maxTokens = 500) {
  const words = text.split(/\s+/);
  let chunks = [];
  let chunk = [];

  for (let word of words) {
    const tokens = encode([...chunk, word].join(" "));
    if (tokens.length > maxTokens) {
      chunks.push(chunk.join(" "));
      chunk = [word];
    } else {
      chunk.push(word);
    }
  }
  if (chunk.length) chunks.push(chunk.join(" "));
  return chunks;
}

async function processFile(filePath, tenantId) {
  const fileName = path.basename(filePath);
  const content = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(content);

  // Insert into documents
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      title: fileName,
      source_type: "json",
      metadata: { tenant_id: tenantId }
    })
    .select()
    .single();

  if (docError) throw docError;

  // Chunk + embed
  const chunks = chunkText(JSON.stringify(data, null, 2));
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embeddingRes = await withRetry(() =>
      openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk
      })
    );

    await supabase.from("document_chunks").insert({
      document_id: doc.id,
      chunk_index: i,
      content: chunk,
      embedding: embeddingRes.data[0].embedding,
      tokens: encode(chunk).length,
      metadata: { tenant_id: tenantId }
    });

    // Throttle between requests
    const throttle = parseInt(process.env.THROTTLE_MS || "200", 10);
    if (throttle > 0) await sleep(throttle);
  }
  console.log(`✅ Uploaded ${fileName} (${chunks.length} chunks) for tenant ${tenantId}`);
}

async function run() {
  const tenantId = process.argv[2];
  if (!tenantId) {
    console.error("❌ Please provide a tenant_id, e.g. node scripts/embed_documents.js fitness_connection");
    process.exit(1);
  }

  const dir = `./data/${tenantId}`;
  if (!fs.existsSync(dir)) {
    console.error(`❌ Directory ${dir} not found`);
    process.exit(1);
  }

  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith(".json")) {
      await processFile(path.join(dir, file), tenantId);
    }
  }
}
run();
