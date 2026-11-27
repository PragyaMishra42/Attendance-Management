# SmartAttend

SmartAttend is an offline-first school attendance PWA built with Next.js 15, React 19, TypeScript, Tailwind CSS, Prisma, and PostgreSQL. Attendance can be recorded offline in IndexedDB and synchronized when a connection returns. AI-assisted identifications still require teacher verification.

## Run locally

1. Install Node.js 20.9 or newer.
2. Copy `.env.example` to `.env` and set both `DATABASE_URL` and `DATABASE_URL_POOLED` to your local PostgreSQL URL. A local database can use the same URL for both. For local demo mode, built-in demo sign-in is available when PostgreSQL is unavailable.
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

The Prisma Postgres integration provides separate direct and pooled connection strings. Prisma CLI operations use `DATABASE_URL` (direct). App requests prefer `DATABASE_URL_POOLED` and also recognize the integration's `SMARTATTEND_DATABASE_URL_POOLED`; they fall back to `DATABASE_URL` if no pooled value is configured. Keep `DATABASE_URL` set to the integration's direct URL and redeploy. Never use `localhost` in Vercel.

Apply the Prisma schema to the connected database with `npm run db:push`, then seed accounts with strong `SEED_ADMIN_PASSWORD` and `SEED_TEACHER_PASSWORD` values using `npm run db:seed`. For local commands, set `DATABASE_URL` to the provider's direct URL and optionally `DATABASE_URL_POOLED` to its pooled URL in the same PowerShell session first. Do not paste database URLs or passwords into chat or commit them to Git.

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
