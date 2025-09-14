import { API_BASE } from "./config";

export async function streamChat({ message, onToken, onDone, useRag = false }) {
  const endpoint = useRag ? `${API_BASE}/rag-chat/stream` : `${API_BASE}/chat/stream`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });
  if (!res.body) {
    const text = await res.text();
    throw new Error("No stream body. Response: " + text);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let full = "";
  let sources = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const part of chunk.split("\n\n")) {
      if (!part.startsWith("data:")) continue;
      const data = part.slice(5).trim();
      if (data === "[DONE]") {
        // Clean up spaces before punctuation and multiple spaces
        let cleaned = full.replace(/\s+([.,:;!?()])/g, '$1').replace(/\s{2,}/g, ' ');
        onDone?.({ reply: cleaned, sources });
        return;
      }
      try {
        const parsed = JSON.parse(data);
        if (parsed.sources) { sources = parsed.sources; continue; }
      } catch {
        full += (full && !full.endsWith(" ") ? " " : "") + data;
        onToken?.(full);
      }
    }
  }
}
