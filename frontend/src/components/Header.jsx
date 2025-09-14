import { Menu, Plus } from "lucide-react";

export default function Header({ onMenu, onNewChat }) {
  return (
    <header className="h-14 border-b bg-white/70 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto h-full px-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button aria-label="Open menu" onClick={onMenu} className="icon-btn">
            <Menu size={20} />
          </button>
          <div className="font-semibold tracking-tight">🌀 Operait</div>
        </div>
        <button aria-label="New chat" onClick={onNewChat} className="icon-btn">
          <Plus size={20} />
        </button>
      </div>
    </header>
  );
}