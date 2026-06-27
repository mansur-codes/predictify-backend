/**
 * userService.ts
 *
 * Data-access layer for public user profile information.
 *
 * All functions return plain objects so that the route layer can serialise
 * them directly.  The real implementations will query Drizzle/PostgreSQL;
 * stubs are provided here so the rest of the application compiles and the
 * test suite can inject mocks without touching a live database.
 */

// ── Types ─────────────────────────────────────────────────────────────────

/** One entry in the public prediction history. */
export interface PredictionEntry {
  /** UUID of the prediction row. */
  id: string;
  /** The market this prediction was placed on. */
  market: {
    id: string;
    question: string;
    status: string;
    resolutionTime: string;
  };
  /** Which outcome the user chose (e.g. "yes" / "no"). */
  outcome: string;
  /**
   * Amount staked, stored as a string to preserve precision for large
   * Stellar stroops values.
   */
  amount: string;
  /** ISO-8601 timestamp when the prediction was created. */
  createdAt: string;
}

/** Aggregate totals derived from the user's full prediction history. */
export interface ProfileTotals {
  /** Total number of predictions the user has placed. */
  totalPredictions: number;
  /**
   * Sum of all staked amounts as a string.
   * Computed by the service; callers should treat this as opaque.
   */
  totalAmountStaked: string;
  /** Number of predictions on markets that resolved in the user's favour. */
  wins: number;
  /** Number of predictions on markets that resolved against the user. */
  losses: number;
}

/** Full public profile payload returned by the route. */
export interface UserProfile {
  /** Internal UUID (opaque to external consumers). */
  id: string;
  /** The user's public Stellar address — also the primary lookup key. */
  stellarAddress: string;
  /** ISO-8601 timestamp of account creation. */
  joinedAt: string;
  /** Ordered newest-first list of predictions. */
  predictions: PredictionEntry[];
  /** Pre-computed aggregate statistics. */
  totals: ProfileTotals;
}

// ── Service functions ─────────────────────────────────────────────────────

/**
 * Look up a public user profile by Stellar address.
 *
 * Returns `null` when no user with that address exists.
 *
 * Production implementation should:
 *  1. SELECT the user row by `stellar_address`.
 *  2. JOIN predictions → markets, ordered by `predictions.created_at DESC`.
 *  3. Compute totals in SQL (COUNT, SUM) to avoid pulling every row into JS.
 *
 * @param stellarAddress - The Stellar account address to look up.
 */
export async function getUserProfile(
  stellarAddress: string,
): Promise<UserProfile | null> {
  // Stub: always returns null until the DB layer is wired up.
  // Replace with a Drizzle query against the real connection pool.
  void stellarAddress;
  return null;
}
