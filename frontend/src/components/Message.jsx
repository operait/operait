import { Copy, ThumbsUp, ThumbsDown, Share2, RotateCw, MoreHorizontal } from "lucide-react";

export default function Message({ id, role, content, onCopy, onLike, onDislike, onShare, onResend, index }) {
  const isUser = role === "user";
  return (
    <div className={`message ${isUser ? "user" : "assistant"}`}>
      <div className="bubble">
        {content}
      </div>
      {!isUser && (
        <div className="actions">
          <button className="icon-btn" title="Copy" onClick={onCopy}><Copy size={16} /></button>
          <button className="icon-btn" title="Like" onClick={() => onLike(id)}><ThumbsUp size={16} /></button>
          <button className="icon-btn" title="Dislike" onClick={() => onDislike(id)}><ThumbsDown size={16} /></button>
          <button className="icon-btn" title="Share" onClick={onShare}><Share2 size={16} /></button>
          <button className="icon-btn" title="Try again" onClick={() => onResend(index)}><RotateCw size={16} /></button>
          <button className="icon-btn" title="More actions" onClick={() => alert("More actions coming soon")}><MoreHorizontal size={16} /></button>
        </div>
      )}
    </div>
  );
}