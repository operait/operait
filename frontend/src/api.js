import { API_BASE } from "./config";

export async function streamChat({ message, onDone, useRag = false }) {
  const endpoint = useRag ? `${API_BASE}/rag-chat` : `${API_BASE}/chat`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("Request failed. Response: " + text);
  }
  const data = await res.json();
  let reply = data.reply || "";
  let sources = data.sources || null;
  // Clean up spaces before punctuation and multiple spaces
  let cleaned = reply.replace(/\s+([.,:;!?()])/g, '$1').replace(/\s{2,}/g, ' ');
  onDone?.({ reply: cleaned, sources });
}
