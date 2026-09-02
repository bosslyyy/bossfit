# 🏋️ BossFit

**BossFit** is a mobile-first fitness PWA (Progressive Web App) for building habits, completing daily sets, and tracking real progress — with a premium, native-app-like experience.

🔗 **Live demo:** [bossfit.vercel.app](https://bossfit.vercel.app)

---

## 🛠️ Tech Stack

- **Next.js** + **React** + **TypeScript**
- **Tailwind CSS** for styling
- **Zustand** for persistent local state
- **React Hook Form** + **Zod** for form validation
- **Supabase Auth** with email/password
- Local persistence + remote sync per user
- Manual PWA setup with manifest, icons, and service worker

---

## ✨ Current Features

- Login, signup, and logout with Supabase
- Protected routes for the main app
- Full CRUD for habits
- Day-based scheduling with a touch selector `M T W T F S S`
- Daily execution by sets, not individual reps
- Robust local persistence with `localStorage`
- Gradual sync of user state with Supabase
- Dashboard with daily progress, current streak, best streak, Boss Points, and level
- "Today" view with `0/3`, `1/3`, `2/3`, `3/3` status
- Progress view with weekly summary, monthly calendar, 7-day chart, and per-habit history
- Boss Points system with levels and progress toward the next level
- Settings with dark mode, local reminders, and data reset
- Installable PWA experience with iPhone/iOS support

---

## 📋 Requirements

- Node.js 20 or higher
- npm 10 or higher

---

## 🔐 Environment Variables

BossFit expects these variables in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` is used only in server routes for admin operations and critical account sync. **Never expose it in the frontend or commit it to Git.**

---

## ⚙️ Supabase Setup

1. In Supabase, enable **Email Auth**.
2. Run the SQL from [`supabase/schema.sql`](./supabase/schema.sql) in the project's SQL Editor.
3. Make sure your `.env.local` variables point to that same project.

Sync uses two remote tables: `public.bossfit_user_state` for the current snapshot and `public.bossfit_user_state_history` for recoverable remote backups.

### Required columns in `bossfit_user_state`

- `user_id`
- `storage_version`
- `app_state`
- `last_synced_at`
- `updated_at`
- `habits_count`
- `completions_count`
- `current_streak`
- `best_streak`
- `total_points`
- `level`

### What `app_state` stores

`app_state` is a `jsonb` field holding the snapshot needed to rehydrate the app:

- `habits`
- `completions`
- `theme`
- `reminderSettings`

### What's stored as auxiliary metadata

These columns help with reporting and debugging, but **are not the source of truth**:

- `habits_count`
- `completions_count`
- `current_streak`
- `best_streak`
- `total_points`
- `level`

Streaks, Boss Points, levels, and full stats are always derived from the snapshot to avoid mismatches.

---

## 🚀 Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## 📜 Scripts

```bash
npm run dev        # Development server
npm run build       # Production build
npm run start        # Production server
npm run typecheck  # Type checking
```

---

## 🧪 Testing Login + Sync

1. Run the SQL from [`supabase/schema.sql`](./supabase/schema.sql).
2. Start the app with `npm run dev`.
3. Create an account or sign in.
4. Create or edit habits.
5. Log daily progress.
6. Reload the page.
7. Sign out and sign back in with the same user.
8. Confirm the data comes back from Supabase and also persists in `localStorage`.

---

## 🔄 Persistence Flow

BossFit keeps two persistence layers:

1. `localStorage` remains the local base on the device.
2. If the user is signed in, important state syncs to Supabase under their `user_id`.

**Gradual migration strategy:**

- If the user signs in for the first time and no remote state exists, BossFit uploads their local state.
- If remote state already exists, BossFit fetches it and hydrates the store.
- If there are unsynced local changes for the same user, BossFit prioritizes that local state and re-uploads it.
- If the user switches accounts in the same browser, BossFit avoids mixing data between users.

---

## 🗂️ Project Structure

```text
src/
  app/
    login/page.tsx
    register/page.tsx
    page.tsx
    today/page.tsx
    progress/page.tsx
    settings/page.tsx
    habits/new/page.tsx
    habits/[id]/edit/page.tsx
  components/
    auth/
    dashboard/
    habits/
    layout/
    progress/
    pwa/
    ui/
  lib/
    constants.ts
    date.ts
    habit-logic.ts
    persistence.ts
    progress-analytics.ts
    reminders.ts
    supabase/client.ts
    supabase/data.ts
    validation/habit.ts
  store/
    use-bossfit-store.ts
  types/
    habit.ts
supabase/
  schema.sql
public/
  sw.js
  favicon.svg
```

---

## 🔔 Reminders

BossFit uses the browser's Notifications API with local configuration:

- Turn reminders on or off
- Choose a daily time
- Store permission and last sent date locally
- Trigger reminders while BossFit is open or installed in a supported environment

**Important limitation:** without a backend, remote push, or a notification service worker, there is no guarantee of persistent reminders when the app is closed. This limitation is especially relevant on iPhone/iOS; the experience is more reliable when BossFit is installed on the home screen.

---

## 📝 Notes

- New users start with no habits by default.
- The service worker lives in `public/sw.js`.
- The manifest is generated from `src/app/manifest.ts`.
- PWA icons are generated from `src/app/icon.tsx` and `src/app/apple-icon.tsx`.
- Current route protection is resolved client-side to avoid adding an extra SSR layer while `@supabase/ssr` can't yet be installed in this environment.
