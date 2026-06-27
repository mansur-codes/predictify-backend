/**
 * users.ts
 *
 * Public user-profile routes.
 *
 * Routes
 * ──────
 *   GET /api/users/:stellarAddress/profile
 *     Returns the public profile for a Stellar account address.
 *     The response contains the user's prediction history and aggregate
 *     totals. No authentication is required — all data exposed here is
 *     considered public information (it mirrors what is visible on-chain).
 *
 * Privacy
 * ───────
 *   - Only the Stellar address (already public on-chain) is returned.
 *   - No email, IP address, or other off-chain PII is exposed.
 *   - Internal database UUIDs are included so that clients can build
 *     links, but they carry no sensitive meaning.
 *
 * Error codes
 * ───────────
 *   404  not_found        — no user registered with that Stellar address
 *   400  validation_error — address fails basic format validation
 *   500  internal_error   — unexpected server error (via global handler)
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { getUserProfile } from "../services/userService";
import { logger } from "../config/logger";
import { getRequestId } from "../lib/requestContext";

export const usersRouter = Router();

// ── Validation ────────────────────────────────────────────────────────────

/**
 * Minimal Stellar address validator.
 *
 * A Stellar public key (G-address) is a base-32 encoded 32-byte Ed25519
 * public key: always starts with "G", always exactly 56 characters long,
 * and uses the Stellar base-32 alphabet (A–Z, 2–7).
 *
 * We perform this check at the boundary so the service layer never receives
 * a value that could cause unexpected query behaviour.
 */
const stellarAddressSchema = z
  .string()
  .regex(
    /^G[A-Z2-7]{55}$/,
    "must be a valid Stellar public key (G… 56 chars, base-32)",
  );

// ── Route ─────────────────────────────────────────────────────────────────

/**
 * GET /api/users/:stellarAddress/profile
 *
 * Public endpoint — no authentication required.
 *
 * Returns the profile for the user identified by `stellarAddress`.
 *
 * Example response (200):
 * ```json
 * {
 *   "data": {
 *     "id": "3fa85f64-...",
 *     "stellarAddress": "GABC...XYZ",
 *     "joinedAt": "2024-01-15T10:30:00.000Z",
 *     "predictions": [
 *       {
 *         "id": "7c9e6679-...",
 *         "market": {
 *           "id": "market-contract-id",
 *           "question": "Will BTC exceed $100k by end of 2025?",
 *           "status": "resolved",
 *           "resolutionTime": "2025-12-31T23:59:59.000Z"
 *         },
 *         "outcome": "yes",
 *         "amount": "5000000",
 *         "createdAt": "2024-03-01T08:00:00.000Z"
 *       }
 *     ],
 *     "totals": {
 *       "totalPredictions": 1,
 *       "totalAmountStaked": "5000000",
 *       "wins": 1,
 *       "losses": 0
 *     }
 *   }
 * }
 * ```
 */
usersRouter.get(
  "/:stellarAddress/profile",
  async (req: Request, res: Response, next: NextFunction) => {
    const reqId = getRequestId();

    // ── 1. Input validation ──────────────────────────────────────────────
    const parseResult = stellarAddressSchema.safeParse(req.params.stellarAddress);
    if (!parseResult.success) {
      logger.warn(
        { reqId, stellarAddress: req.params.stellarAddress, issues: parseResult.error.issues },
        "user_profile_validation_failed",
      );
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: parseResult.error.issues[0]?.message ?? "invalid stellar address",
          requestId: reqId,
        },
      });
    }

    const stellarAddress = parseResult.data;

    // ── 2. Service call ──────────────────────────────────────────────────
    try {
      logger.debug({ reqId, stellarAddress }, "user_profile_lookup");

      const profile = await getUserProfile(stellarAddress);

      if (!profile) {
        logger.debug({ reqId, stellarAddress }, "user_profile_not_found");
        return res.status(404).json({
          error: {
            code: "not_found",
            message: "no user found with that stellar address",
            requestId: reqId,
          },
        });
      }

      logger.debug(
        { reqId, stellarAddress, predictionCount: profile.predictions.length },
        "user_profile_found",
      );

      return res.json({ data: profile });
    } catch (err) {
      // Delegate to the global error handler which logs and returns a
      // standardised 500 envelope (including requestId).
      next(err);
    }
  },
);
