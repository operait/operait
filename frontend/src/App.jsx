import { useState } from "react";
import { streamChat } from "./api";

export default function App() {
  const [question, setQuestion] = useState("");
  const [eraResponse, setEraResponse] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [sources, setSources] = useState(null);

  async function handleAsk(useRag = false) {
    setEraResponse("");
    setSources(null);
    setIsThinking(true);

    await streamChat({
      message: question,
      useRag,
      onToken: (text) => setEraResponse(text),
      onDone: ({ reply, sources }) => {
        setEraResponse(reply);
        setSources(sources);
        setIsThinking(false);
      },
    });
  }

  return (
    <div style={{ maxWidth: "600px", margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Ask Era</h1>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={4}
        style={{ width: "100%" }}
        placeholder="Type your question..."
      />
      <div style={{ marginTop: "1rem" }}>
        <button onClick={() => handleAsk(false)}>Ask (Chat)</button>
        <button onClick={() => handleAsk(true)} style={{ marginLeft: "0.5rem" }}>Ask (RAG)</button>
      </div>

      {isThinking && <p>💭 Era is thinking...</p>}
      <div style={{ marginTop: "1rem", whiteSpace: "pre-wrap" }}>{eraResponse}</div>

      {sources && (
        <div style={{ marginTop: "1rem" }}>
          <h4>Sources:</h4>
          <ul>
            {sources.map((s, i) => (
              <li key={i}>{s.content.slice(0, 120)}...</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
