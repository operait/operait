import ReactMarkdown from "react-markdown";

function finalizeText(text) {
  return text
    .replace(/\s+/g, " ")          // collapse multiple spaces
    .replace(/\s([.,!?;:])/g, "$1") // remove spaces before punctuation
    .replace(/\. \. /g, ". ")     // fix double dot artifacts
    .trim();
}

export default function Message({ id, role, content, onCopy, onLike, onDislike, onShare, onResend, index }) {
  return (
    <div className={`message ${role}`}>
      <div className="bubble">
        <ReactMarkdown>{finalizeText(content)}</ReactMarkdown>
      </div>
    </div>
  );
}
