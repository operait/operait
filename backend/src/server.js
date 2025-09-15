import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { router as chatRouter } from "./routes/chat.js";
import { router as ragRouter } from "./routes/rag.js";
import { router as conversationsRouter } from "./routes/conversations.js";

dotenv.config();
const app = express();
app.set("trust proxy", true);

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("tiny"));

app.get("/", (_req, res) => {
  res.type("text/plain").send("✅ Era backend with SSE+RAG is running");
});

// Mount under /api to match frontend
app.use("/api/chat", chatRouter);
app.use("/api/rag-chat", ragRouter);
app.use("/api/conversations", conversationsRouter);

app.use((req, res) => res.status(404).json({ error: "Not Found", path: req.path }));

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: "Server Error", message: err.message });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`🚀 Server listening on ${port}`));
