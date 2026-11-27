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

## Deploy to Vercel

1. Push this project to GitHub and import the repository in Vercel. Vercel detects Next.js automatically; use `npm run build` as the build command.
2. Create a hosted PostgreSQL database and add `DATABASE_URL` to the Vercel project environment variables. Use the provider's recommended connection URL for serverless deployments. Add it to the Production environment (and Preview if previews need a database).
3. Generate a unique authentication secret and set it as `AUTH_SECRET` in Vercel. For example, run `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` locally. Keep `.env` out of Git and never reuse the example value.
4. Apply the Prisma schema to the hosted database from a trusted local terminal with the production `DATABASE_URL` configured:

   ```bash
   npm run db:push
   ```

5. Optionally seed sample data. Set strong, unique `SEED_ADMIN_PASSWORD` and `SEED_TEACHER_PASSWORD` values in that terminal before running `npm run db:seed`. Production seeding refuses to use the public demo passwords. Remove these seed variables from Vercel after seeding if they are not otherwise needed.
6. Deploy from Vercel. The build generates the Prisma client before building Next.js. The app requires a reachable PostgreSQL database at runtime; production API routes return an error if persistence is unavailable rather than reporting mock writes as successful.

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
