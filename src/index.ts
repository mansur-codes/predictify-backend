import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { healthRouter } from "./routes/health";
import { marketsRouter } from "./routes/markets";
import { errorHandler } from "./middleware/errorHandler";
import { metricsMiddleware } from "./metrics/httpMetrics";
import { register } from "./metrics/registry";

export function createApp(): express.Express {
  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: "256kb" }));
  app.use(pinoHttp({ logger }));
  app.use(metricsMiddleware);

  app.use("/health", healthRouter);
  app.use("/api/markets", marketsRouter);

  app.get("/metrics", async (_req, res) => {
    const metricsAuthToken = process.env.METRICS_AUTH_TOKEN;
    if (metricsAuthToken && _req.headers.authorization !== `Bearer ${metricsAuthToken}`) {
      res.status(401).send("Unauthorized");
      return;
    }
    res.set("Content-Type", register.contentType);
    res.send(await register.metrics());
  });

  app.use(errorHandler);
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "predictify-backend listening");
  });
}
