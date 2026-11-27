# SmartAttend

SmartAttend is an offline-first school attendance PWA built with Next.js 15, React 19, TypeScript, Tailwind CSS, Prisma, and PostgreSQL. Attendance can be recorded offline in IndexedDB and synchronized when a connection returns. AI-assisted identifications still require teacher verification.

## Run locally

1. Install Node.js 22.
2. Copy `.env.example` to `.env` and set `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`. For local PostgreSQL, use the same connection URL for both. If port `5432` is already in use, set `POSTGRES_HOST_PORT` and the port in both URLs to another free port, such as `5433`. For local demo mode, built-in demo sign-in is available when PostgreSQL is unavailable.
3. Install dependencies and generate the Prisma client:

   ```bash
   npm install
   ```

4. Start PostgreSQL, create the schema, and optionally seed sample data:

   ```bash
   docker compose up -d
   npm run db:push
   npm run db:seed
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

Local demo credentials: `priya.sharma@smartattend.edu` / `password123` and `admin@smartattend.edu` / `admin123`. Demo login fallback is disabled in production.

## Deploy to Render

This repository includes `render.yaml`, which defines a Next.js web service and a PostgreSQL database in the Singapore region. To create them together:

1. Push the repository to GitHub and choose **New → Blueprint** in Render. Connect `PragyaMishra42/Attendance-Management` and select the `main` branch.
2. Review the resources and deploy the Blueprint. Render sets `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` from the database's internal connection string and generates `AUTH_SECRET` automatically. The web service runs `npm ci && npm run build`, then `npm start`.
3. After the database is created, apply the schema and seed the demo records from your local project folder using the database's **external** connection URL from Render's **Connect** menu:

   ```powershell
   $env:POSTGRES_PRISMA_URL = "paste-the-Render-external-PostgreSQL-URL-here"
   $env:POSTGRES_URL_NON_POOLING = $env:POSTGRES_PRISMA_URL
   npm run db:push
   $env:SEED_ADMIN_PASSWORD = "choose-a-strong-admin-password"
   $env:SEED_TEACHER_PASSWORD = "choose-a-strong-teacher-password"
   npm run db:seed
   Remove-Item Env:POSTGRES_PRISMA_URL, Env:POSTGRES_URL_NON_POOLING, Env:SEED_ADMIN_PASSWORD, Env:SEED_TEACHER_PASSWORD
   ```

   Do not use the local `localhost` URL for this step. Keep the connection URL and seed passwords private. Sign in with the seeded teacher (`priya.sharma@smartattend.edu`) or administrator (`admin@smartattend.edu`) email and the password you chose above.
4. Open the web service URL shown in Render. Its `/api/health` endpoint checks database connectivity and is configured as the service health check.

The Blueprint uses Render's free web and database plans to make a trial deployment possible. Free web services can spin down while idle, and free PostgreSQL databases expire after 30 days; upgrade the database before relying on it for long-term attendance records. See [Render's free instance limits](https://render.com/docs/free).

The app requires PostgreSQL at runtime; production API routes report persistence failures instead of pretending mock writes succeeded. Optional face-recognition integration can be configured with `FACE_RECOGNITION_API_URL` and `FACE_RECOGNITION_API_KEY`. Without them, the app uses its clearly labeled mock identification service.

## Deploy with Supabase on Vercel

1. Install Supabase from the Vercel Marketplace and connect it to this Vercel project. Supabase adds `POSTGRES_PRISMA_URL` for Prisma runtime traffic and `POSTGRES_URL_NON_POOLING` for direct schema operations. Set both for Production. Never use a `localhost` URL in Vercel.
2. If configuring connection strings manually, use Supabase's **Transaction pooler** URL on port `6543` for `POSTGRES_PRISMA_URL` and append `pgbouncer=true`. Use the direct or **Session pooler** URL on port `5432` for `POSTGRES_URL_NON_POOLING`.
3. Set `AUTH_SECRET` to a random value of at least 32 characters. Keep database URLs and secrets private.
4. From a local terminal, set `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` to the corresponding Supabase connection strings, then apply the schema and seed accounts:

   ```powershell
   $env:POSTGRES_PRISMA_URL = "paste-the-Supabase-transaction-pooler-URL-here"
   $env:POSTGRES_URL_NON_POOLING = "paste-the-Supabase-direct-or-session-pooler-URL-here"
   npm run db:push
   $env:SEED_ADMIN_PASSWORD = "choose-a-strong-admin-password"
   $env:SEED_TEACHER_PASSWORD = "choose-a-strong-teacher-password"
   npm run db:seed
   Remove-Item Env:POSTGRES_PRISMA_URL, Env:POSTGRES_URL_NON_POOLING, Env:SEED_ADMIN_PASSWORD, Env:SEED_TEACHER_PASSWORD
   ```

5. Redeploy the Vercel project. Sign in with the seeded teacher or administrator email and the password you chose.

For serverless Prisma traffic Supabase recommends its transaction pooler; transaction mode requires `pgbouncer=true`. Prisma uses the non-pooling URL for schema operations. See [Supabase's Prisma guide](https://supabase.com/docs/guides/database/prisma) and [Vercel Marketplace guide](https://supabase.com/docs/guides/integrations/vercel-marketplace).

Optional face-recognition integration can be configured with `FACE_RECOGNITION_API_URL` and `FACE_RECOGNITION_API_KEY`. Without them, the app uses its clearly labeled mock identification service.

## Useful commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:generate
npm run db:push
npm run db:seed
```
