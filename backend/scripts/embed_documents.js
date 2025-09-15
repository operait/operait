import "dotenv/config";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { encode } from "gpt-3-encoder";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunks[i]
    });

    await supabase.from("document_chunks").insert({
      document_id: doc.id,
      chunk_index: i,
      content: chunks[i],
      embedding: embeddingRes.data[0].embedding,
      tokens: encode(chunks[i]).length,
      metadata: { tenant_id: tenantId }
    });
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
