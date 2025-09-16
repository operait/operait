import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function finalizeText(text) {
  return text
    .replace(/[ \t]+([.,!?;:])/g, "$1") // remove spaces before punctuation
    .replace(/\. \. /g, ". ")           // fix double dot artifacts
    .replace(/\r\n/g, "\n")             // normalize line endings
    .trim();
}


export default function Message({
  id,
  role,
  content,
  onCopy,
  onLike,
  onDislike,
  onShare,
  onResend,
  index
}) {
  const cleaned = finalizeText(content);

  return (
    <div className={`message ${role}`}>
      <div className="bubble">
        {role === "assistant" ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
          >
            {cleaned}
          </ReactMarkdown>
        ) : (
          cleaned
        )}
      </div>
    </div>
  );
}
