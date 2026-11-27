# SmartAttend — Offline-First AI-Assisted School Attendance PWA

SmartAttend is a production-style Progressive Web Application (PWA) for school attendance management. Teachers can capture classroom photos, review AI-assisted student identification matches (with mandatory teacher verification), record attendance offline via IndexedDB (Dexie.js), and automatically synchronize with PostgreSQL when connectivity returns.

## Architecture & Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide React
- **Backend**: Next.js API Routes, Prisma ORM, PostgreSQL
- **Auth & RBAC**: JWT session cookies (`jose`) + `bcryptjs` password hashing (`TEACHER` & `ADMIN` roles)
- **Offline-First**: Service Worker (`public/sw.js`), Web App Manifest (`public/manifest.json`), IndexedDB (`Dexie.js`), idempotent `/api/sync` reconciliation

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start PostgreSQL (optional for full DB persistence; demo fallback works out of the box)**
   ```bash
   docker compose up -d
   npx prisma db push
   npm run db:seed
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Demo Credentials**
   - **Teacher**: `priya.sharma@smartattend.edu` / `password123`
   - **Admin**: `admin@smartattend.edu` / `admin123`
# Attendance-Management
