import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function finalizeText(text) {
  return text
    .replace(/\s+/g, " ")          // collapse multiple spaces
    .replace(/\s([.,!?;:])/g, "$1") // remove spaces before punctuation
    .replace(/\. \. /g, ". ")       // fix double dot artifacts
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
            components={{
              h1: ({node, ...props}) => <h1 className="prose font-bold text-xl my-2" {...props} />,
              h2: ({node, ...props}) => <h2 className="prose font-semibold text-lg my-2" {...props} />,
              h3: ({node, ...props}) => <h3 className="prose font-semibold text-md my-1" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc ml-5 my-2" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal ml-5 my-2" {...props} />,
              li: ({node, ...props}) => <li className="my-1" {...props} />,
              table: ({node, ...props}) => (
                <table className="table-auto border-collapse border border-slate-400 my-3" {...props} />
              ),
              th: ({node, ...props}) => (
                <th className="border border-slate-400 px-2 py-1 bg-slate-100" {...props} />
              ),
              td: ({node, ...props}) => (
                <td className="border border-slate-400 px-2 py-1" {...props} />
              ),
              p: ({node, ...props}) => <p className="my-2 leading-relaxed" {...props} />,
            }}
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
