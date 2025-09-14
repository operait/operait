import { X, Search, Trash2, HelpCircle, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Sidebar({ open, onClose, conversations, activeId, onSelect, reload }) {
  const [query, setQuery] = useState("");
  const overlayRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (e.target === overlayRef.current) onClose();
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [onClose]);

  const filtered = (conversations || []).filter(c => (c.title || "").toLowerCase().includes(query.toLowerCase()));

  return (
    <div className={`sidebar-overlay ${open ? "open" : ""}`} ref={overlayRef}>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="flex items-center justify-between px-3 py-3 border-b">
          <div className="font-semibold">🌀 Operait</div>
          <button aria-label="Close" className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="p-3 flex gap-2">
          <button className="btn" onClick={reload}><RefreshCw size={16} /> Refresh</button>
          <div className="search">
            <Search size={16} />
            <input placeholder="Search Chat" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        </div>

        <div className="px-3">
          <button className="btn btn-secondary mb-2" onClick={() => alert("New Project coming soon")}>New Project</button>
        </div>

        <div className="chats">
          {filtered.map(c => (
            <div key={c.id} className={`chat-item ${c.id === activeId ? "active" : ""}`}>
              <button className="grow text-left" onClick={() => onSelect(c.id)}>
                <div className="title">{c.title || "Untitled"}</div>
                <div className="muted">{new Date(c.created_at).toLocaleString()}</div>
              </button>
              <button className="icon-btn danger" onClick={async () => {
                try {
                  const res = await fetch(`/api/conversations/${c.id}`, { method: "DELETE" });
                  const data = await res.json();
                  if (data.success) {
                    reload(); // refresh list
                    if (c.id === activeId) {
                      onSelect(null); // clear current chat
                    }
                  } else {
                    console.error("Delete failed:", data.error);
                  }
                } catch (e) {
                  console.error("Delete request error:", e);
                }
              }}
              >
                <Trash2 size={16} />
              </button>

            </div>
          ))}
          {filtered.length === 0 && <div className="muted px-3 py-2">No conversations yet.</div>}
        </div>

        <div className="mt-auto p-3 border-t">
          <a className="btn btn-ghost" href="mailto:help@operait.com?subject=Operait%20Help"><HelpCircle size={16} /> Get Help</a>
        </div>
      </aside>
    </div>
  );
}