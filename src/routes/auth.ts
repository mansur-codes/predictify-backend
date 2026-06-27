import { Router } from "express";
import { z } from "zod";
import {
  RefreshTokenError,
  rotateRefreshToken,
  revokeFamily,
} from "../services/refreshTokenService";
import { logger } from "../config/logger";

export const authRouter = Router();
const refreshTokenBodySchema = z.object({
  refreshToken: z.string().min(1),
});

function parseRefreshToken(body: unknown): string | null {
  const result = refreshTokenBodySchema.safeParse(body);
  return result.success ? result.data.refreshToken : null;
}

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const refreshToken = parseRefreshToken(req.body);

    if (!refreshToken) {
      res.status(400).json({
        error: { code: "invalid_request", message: "refreshToken is required and must be a string" },
      });
      return;
    }

    const tokens = await rotateRefreshToken(refreshToken);
    res.json(tokens);
  } catch (err) {
    if (err instanceof RefreshTokenError) {
      logger.warn({ code: err.code }, "token_refresh_failed");

      if (err.code === "reuseDetected") {
        res.status(403).json({
          error: { code: "token_reuse_detected" },
        });
        return;
      }

      res.status(401).json({
        error: { code: "invalid_token" },
      });
      return;
    }

    next(err);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const refreshToken = parseRefreshToken(req.body);

    if (!refreshToken) {
      res.status(400).json({
        error: { code: "invalid_request", message: "refreshToken is required and must be a string" },
      });
      return;
    }

    await revokeFamily(refreshToken);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});
