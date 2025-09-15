import { useEffect, useState } from "react";
import Header from "./components/Header.jsx";
import Sidebar from "./components/Sidebar.jsx";
import ChatBox from "./components/ChatBox.jsx";
import { streamChat } from "./api";
import { API_BASE } from "./config";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadConversations() {
    try {
      const res = await fetch(`${API_BASE}/conversations`);
      const data = await res.json();
      setConversations(data || []);
    } catch (e) {
      console.error("loadConversations error:", e);
    }
  }

  async function loadMessages(id) {
    if (!id) { setMessages([]); return; }
    try {
      const res = await fetch(`/messages/${id}`);
      const data = await res.json();
      setMessages(data || []);
    } catch (e) {
      console.error("loadMessages error:", e);
    }
  }

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { if (activeId) loadMessages(activeId); }, [activeId]);

  async function sendMessage(text) {
  // Add user message immediately
  const userMsg = { id: Date.now().toString(), role: "user", content: text };
  setMessages((prev) => [...prev, userMsg]);

  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    const data = await res.json();

    // Add assistant reply
    const replyMsg = {
      id: "a-" + (Date.now() + 1),
      role: "assistant",
      content: data.reply || "(no response)",
    };
    setMessages((prev) => [...prev, replyMsg]);

    // Optionally refresh conversations
    try { await loadConversations(); } catch {}
  } catch (e) {
    console.error("sendMessage error:", e);
  } finally {
    setLoading(false);
  }
}


  async function sendFeedback(messageId, value) {
    try {
      await fetch(`${API_BASE}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, value })
      });
    } catch (e) {
      console.warn("feedback failed", e);
    }
  }

  function newChat() {
    setActiveId(null);
    setMessages([]);
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header onMenu={() => setSidebarOpen(true)} onNewChat={newChat} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          conversations={conversations}
          activeId={activeId}
          onSelect={(id) => setActiveId(id)}
          reload={loadConversations}
        />
        <main className="flex-1 h-full">
          <ChatBox
            messages={messages}
            onSend={sendMessage}
            onFeedback={sendFeedback}
            loading={loading}
          />
        </main>
      </div>
    </div>
  );
}