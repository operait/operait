import { useEffect, useRef, useState } from "react";
import Message from "./Message.jsx";

export default function ChatBox({ messages, onSend, onFeedback, loading }) {
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(() => (messages?.length || 0) > 0);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!started && (messages?.length || 0) > 0) setStarted(true);
  }, [messages, started]);

  async function handleSend() {
  const text = input.trim();
  if (!text) return;
  setInput("");
  if (!started) setStarted(true);

  // 1. Add user message instantly
  const tempMessage = {
    id: Date.now().toString(), // temporary ID
    role: "user",
    content: text,
  };

  // 2. Send to backend
  await onSend(text);
}


  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleCopy(text) {
    try { await navigator.clipboard.writeText(text); } catch {}
  }

  function handleShare(text) {
    const subject = encodeURIComponent("Sharing an Operait conversation");
    const body = encodeURIComponent(
    `Here is a response from Era (Operait):\n\n${text}\n\n— sent from Operait`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <div className="chat-root">
      {!started && (
        <div className="center-intro">
          <h1>Hey There! I’m Era, How can I help you?</h1>
          <div className="composer large">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask me anything…"
              disabled={loading}
            />
            <button onClick={handleSend} disabled={loading}>Send</button>
          </div>
        </div>
      )}

      {started && (
        <div className="conversation">
          <div className="messages">
            {messages.map((m, i) => (
              <Message
                key={m.id || i}
                id={m.id}
                role={m.role}
                content={m.content}
                index={i}
                onCopy={() => handleCopy(m.content)}
                onLike={(id) => onFeedback(id, "like")}
                onDislike={(id) => onFeedback(id, "dislike")}
                onShare={() => handleShare(m.content)}
                onResend={(idx) => {
                  const prevUser = messages[idx - 1];
                  if (prevUser?.role === "user") {
                    onSend(prevUser.content);
                  }
                }}
              />
            ))}
            {loading && (
              <div className="message assistant">
                <div className="bubble muted">Era is thinking…</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="composer">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type your message…"
              disabled={loading}
            />
            <button onClick={handleSend} disabled={loading}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}