export function initSSE(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
}
export function sendSSE(res, data) {
  res.write(`data: ${data}\n\n`);
}
export function endSSE(res, extra = null) {
  if (extra) res.write(`event: meta\ndata: ${JSON.stringify(extra)}\n\n`);
  res.write("data: [DONE]\n\n");
  res.end();
}
