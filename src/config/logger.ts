import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: "predictify-backend" },
  redact: ["req.headers.authorization", "req.headers.cookie", "password", "token"],
});
