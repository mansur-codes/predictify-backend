import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

healthRouter.get("/ready", (_req, res) => {
  res.json({ status: "ready" });
});
