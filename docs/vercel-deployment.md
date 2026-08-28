# Deploying LifeLink Blue on Vercel

The page of JavaScript shown on the Vercel URL was caused by serving the server bundle as a static document. LifeLink Blue now separates its reusable Express configuration from the local listener and exposes `api/index.ts` as Vercel's serverless entry point. The `vercel.json` configuration serves the built Vite application from `dist/public`, sends `/api/*` requests to that serverless entry point, and uses the Vite entry page for dashboard routes.

> The current application is a compact React, Express, tRPC, and database application. Its successful production build is approximately 1.4 MB, so a higher-capacity runtime is not required to correct the observed issue.

## Required Vercel project settings

| Setting | Required value |
| --- | --- |
| Framework Preset | `Other` |
| Build Command | `pnpm build` |
| Install Command | `pnpm install --frozen-lockfile` |
| Output Directory | `dist/public` |
| Node.js version | 22.x |

## Environment variables

Configure the existing production values in **Vercel → Project Settings → Environment Variables**. Do not commit secret values to the repository.

| Variable group | Values to provide |
| --- | --- |
| Database and sessions | `DATABASE_URL`, `JWT_SECRET` |
| OAuth | `OAUTH_SERVER_URL`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL` |
| Built-in service integration, if used | `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY` |
| Project metadata | `OWNER_OPEN_ID`, `OWNER_NAME`, `VITE_APP_TITLE`, `VITE_APP_LOGO` |

After Vercel redeploys the revised branch, set the application OAuth redirect URL to `https://<your-vercel-domain>/api/oauth/callback`. Check the deployed homepage first, then verify `/api/trpc` requests through the dashboard. The managed LifeLink hosting remains the most integrated full-stack option because its database, authentication, and built-in services are preconfigured; using Vercel requires maintaining the variables above and a database reachable from Vercel.

## Database connection checklist

LifeLink Blue reads exactly one database variable: `DATABASE_URL`. Add the production connection string in **Vercel → Project Settings → Environment Variables**, select the **Production** environment, and redeploy after saving it. Do not put the value in source control, screenshots, browser code, or a client-side `VITE_*` variable.

The database provider must accept outbound connections from Vercel, permit the database user to connect to the application schema, and require a TLS-enabled connection string when the provider requires encrypted transport. If the provider uses an IP allowlist, use its supported Vercel-compatible policy rather than restricting access to the local development machine. Confirm that the production database schema has already been migrated before testing application queries.

The deployment exposes a safe readiness probe at `/api/health/database`. A response of `200` with `{ "ok": true, "database": "connected" }` confirms that the serverless function received `DATABASE_URL` and completed `SELECT 1`. A response of `503` with `database: "unavailable"` means the variable is missing, the connection string is invalid, TLS negotiation failed, the credentials lack access, the database is unreachable from Vercel, or the provider is refusing the connection. The endpoint intentionally does not expose the connection error or any secret.

| Symptom | Likely cause | Resolution |
| --- | --- | --- |
| `/api/health/database` returns `503` and `ok: false` | `DATABASE_URL` is missing from the Production environment or is malformed | Add the exact variable name and a valid production URL in Vercel, then redeploy. |
| Database connection works locally but not on Vercel | The database blocks Vercel traffic or the URL uses a local/private hostname | Use a provider endpoint reachable from Vercel and update the provider network policy. |
| TLS or certificate error | The provider requires encrypted transport but the URL does not request it | Use the provider’s documented TLS connection string; do not disable certificate verification in production. |
| API returns an unknown table/column error | Production schema is behind the checked-in Drizzle migrations | Apply the reviewed migrations to the production database before opening the application to users. |
| Homepage loads but all cards are empty | The frontend is deployed but serverless tRPC calls fail or return no database rows | Check `/api/health/database`, then inspect the Vercel function logs and `/api/trpc` response status. |

Do not paste `DATABASE_URL` into an issue, chat, commit, or browser console. If a credential was exposed, rotate it at the database provider and update Vercel’s Production variable.
