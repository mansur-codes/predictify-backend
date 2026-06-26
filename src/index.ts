import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { v4 as uuidv4 } from "uuid";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { healthRouter } from "./routes/health";
import { marketsRouter } from "./routes/markets";
import { leaderboardRouter } from "./routes/leaderboard";
import { reconciliationRouter } from "./routes/reconciliation";
import { errorHandler } from "./middleware/errorHandler";
import { initializeScheduler, stopScheduler } from "./services/scheduler";

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: "256kb" }));

  // ── pinoHttp ─────────────────────────────────────────────────────────────
  //
  // genReqId  - Honour an inbound X-Request-Id (sanitised); generate a UUID v4
  //             when absent or when the inbound value is empty after sanitising.
  //
  // customProps - Lift req.id to the top level of every log line as `reqId` so
  //               it can be queried without drilling into the nested req object.
  app.use(
    pinoHttp({
      logger,
      genReqId(req) {
        const inbound = req.headers[REQUEST_ID_HEADER];
        const raw = Array.isArray(inbound) ? inbound[0] : inbound;
        return (raw && sanitizeRequestId(raw)) ?? uuidv4();
      },
      customProps(req) {
        return { reqId: req.id };
      },
    }),
  );

  // ── AsyncLocalStorage + response-header middleware ────────────────────────
  //
  // Runs after pinoHttp so that req.id is already set.
  //
  // 1. Echoes the (possibly sanitised / generated) id back to the caller via
  //    the X-Request-Id response header, making correlation trivial for clients.
  //
  // 2. Wraps the remaining middleware chain inside an AsyncLocalStorage context
  //    so that any code further downstream — including async workers started
  //    from a request handler — can call getRequestId() without needing the
  //    id passed through every function argument.
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const requestId = req.id as string;

    // Echo back to client.
    res.setHeader(REQUEST_ID_HEADER, requestId);

    // Make available to all downstream code via AsyncLocalStorage.
    requestContextStorage.run({ requestId }, next);
  });

  app.use("/health", healthRouter);
  app.use("/api/markets", marketsRouter);
  app.use("/api/leaderboard", leaderboardRouter);
  app.use("/api/reconciliation", reconciliationRouter);

  app.use(errorHandler);
  return app;
}

if (require.main === module) {
  const app = createApp();
  
  // Initialize scheduled tasks
  initializeScheduler();
  
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "predictify-backend listening");
  });
  
  // Graceful shutdown
  process.on("SIGTERM", () => {
    logger.info("SIGTERM received, shutting down gracefully");
    stopScheduler();
    process.exit(0);
  });
  
  process.on("SIGINT", () => {
    logger.info("SIGINT received, shutting down gracefully");
    stopScheduler();
    process.exit(0);
  });
}
