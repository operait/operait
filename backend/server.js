import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
console.log("Routes folder contents:", fs.readdirSync("./routes"));
import chatRouter from "./routes/chat.js";
console.log("chatRouter after import:", chatRouter);
import fs from "fs";



dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "2mb" }));
console.log("Mounting chat router...");
app.use("/api", chatRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Backend running on http://127.0.0.1:${PORT}`));
