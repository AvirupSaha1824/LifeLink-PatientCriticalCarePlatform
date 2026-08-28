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
