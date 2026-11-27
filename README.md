# SmartAttend

SmartAttend is an offline-first school attendance PWA built with Next.js 15, React 19, TypeScript, Tailwind CSS, Prisma, and PostgreSQL. Attendance can be recorded offline in IndexedDB and synchronized when a connection returns. AI-assisted identifications still require teacher verification.

## Run locally

1. Install Node.js 20.9 or newer.
2. Copy `.env.example` to `.env` and set a local PostgreSQL `DATABASE_URL`. For local demo mode, the built-in demo accounts are available when PostgreSQL is unavailable.
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
2. Review the resources and deploy the Blueprint. Render sets `DATABASE_URL` from the database's internal connection string and generates `AUTH_SECRET` automatically. The web service runs `npm ci && npm run build`, then `npm start`.
3. After the database is created, apply the schema and seed the demo records from your local project folder using the database's **external** connection URL from Render's **Connect** menu:

   ```powershell
   $env:DATABASE_URL = "paste-the-Render-external-PostgreSQL-URL-here"
   $env:DATABASE_URL_POOLED = $env:DATABASE_URL
   npm run db:push
   $env:SEED_ADMIN_PASSWORD = "choose-a-strong-admin-password"
   $env:SEED_TEACHER_PASSWORD = "choose-a-strong-teacher-password"
   npm run db:seed
   Remove-Item Env:DATABASE_URL, Env:SEED_ADMIN_PASSWORD, Env:SEED_TEACHER_PASSWORD
   ```

   Do not use the local `localhost` URL for this step. Keep the connection URL and seed passwords private. Sign in with the seeded teacher (`priya.sharma@smartattend.edu`) or administrator (`admin@smartattend.edu`) email and the password you chose above.
4. Open the web service URL shown in Render. Its `/api/health` endpoint checks database connectivity and is configured as the service health check.

The Blueprint uses Render's free web and database plans to make a trial deployment possible. Free web services can spin down while idle, and free PostgreSQL databases expire after 30 days; upgrade the database before relying on it for long-term attendance records. See [Render's free instance limits](https://render.com/docs/free).

The app requires PostgreSQL at runtime; production API routes report persistence failures instead of pretending mock writes succeeded. Optional face-recognition integration can be configured with `FACE_RECOGNITION_API_URL` and `FACE_RECOGNITION_API_KEY`. Without them, the app uses its clearly labeled mock identification service.

## Vercel database variables

The Prisma Postgres integration provides separate direct and pooled connection strings. This app uses `DATABASE_URL` (direct) for Prisma CLI operations and `DATABASE_URL_POOLED` for runtime queries. If the integration added prefixed names such as `SMARTATTEND_DATABASE_URL` and `SMARTATTEND_DATABASE_URL_POOLED`, add the unprefixed variables in the Vercel project and copy the matching values: direct to `DATABASE_URL`, pooled to `DATABASE_URL_POOLED`. Set both for Production, then redeploy. Never use `localhost` in Vercel.

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
