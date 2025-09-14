const API_BASE = "https://operait.onrender.com";

export async function streamChat({ message, useRag = false, onToken, onDone }) {
  const endpoint = useRag
    ? `${API_BASE}/api/rag-chat/stream`
    : `${API_BASE}/api/chat/stream`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullReply = "";
  let sources = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n\n");

    for (let line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          onDone?.({ reply: fullReply, sources });
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.sources) { sources = parsed.sources; continue; }
        } catch {
          fullReply += data;
          onToken?.(fullReply);
        }
      }
    }
  }
}
