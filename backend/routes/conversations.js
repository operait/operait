import { Router } from "express";
export const router = Router();
// TODO: expand with Supabase persistence
router.get("/", (_req, res) => res.json({ conversations: [] }));
