# predictify-backend

Backend API for **Predictify** — a Stellar/Soroban prediction-markets dApp.

This service indexes on-chain market state from the Predictify Soroban contract, exposes a REST API for the frontend, handles wallet-based authentication, and ships notifications + leaderboards.

## Stack

- **Node.js 20** + **TypeScript**
- **Express** for HTTP
- **Drizzle ORM** + **PostgreSQL** for persistence
- **zod** for env + request validation
- **pino** for structured logging
- **JWT (jsonwebtoken)** for wallet-based session auth
- **Stellar SDK** for Soroban RPC + Horizon
- **Jest** + **supertest** for tests

## Quick start

```bash
cp .env.example .env   # fill JWT_SECRET, DATABASE_URL, contract id
npm install
npm run db:migrate
npm run dev
```

## Layout

```
src/
  config/      env + logger
  routes/      health, markets (more to come)
  services/    domain services
  middleware/  errorHandler, auth (planned)
  db/          drizzle schema
tests/         jest tests
docs/          architecture docs
scripts/       dev helpers
```

## Roadmap

This starter is intentionally minimal. The full backlog is tracked in GitHub Issues under the **OFFICIAL CAMPAIGN** label. Major themes:

- Wallet-based auth (Stellar address challenge/signature → JWT)
- Market CRUD + caching layer
- Soroban-RPC indexer with reorg/gap handling
- Predictions + claims endpoints
- Leaderboards & user profiles
- Webhook delivery + DLQ
- Observability (metrics, tracing, /readyz with deep checks)
- OpenAPI spec + contract tests

## Auth Refresh Flow

- `POST /api/auth/refresh` accepts `{ "refreshToken": "<opaque token>" }`, revokes the presented refresh token, and returns a fresh `accessToken` plus a rotated `refreshToken`.
- Refresh tokens are stored only as SHA-256 hashes in the `refresh_tokens` table. The raw bearer token is generated once and is never persisted.
- If a revoked refresh token is presented again, the service treats it as suspected theft and revokes every still-active token in the same `familyId`.
- `POST /api/auth/logout` accepts the same body and revokes the remaining active tokens in that refresh-token family.

## Refresh Token Tests

```bash
npm test -- tests/refreshToken.test.ts
```

The refresh-token test suite covers rotation, expiry handling, reuse detection, logout family revocation, and hash-only storage.

## License

MIT
