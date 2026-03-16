# BossFit

BossFit es una PWA fitness mobile-first para crear hábitos, marcar series completadas por día y seguir progreso semanal con una experiencia premium tipo app.

## Stack

- Next.js + React + TypeScript
- Tailwind CSS
- Zustand para estado local persistente
- React Hook Form + Zod para formularios
- PWA manual con manifest, iconos y service worker
- Estructura lista para integrar Supabase después

## Funcionalidades del MVP

- CRUD completo de hábitos
- Programación por días con selector táctil `L M X J V S D`
- Ejecución diaria por series, no por repetición individual
- Persistencia local con `localStorage`
- Dashboard con progreso del día
- Vista de hoy con estado `0/3`, `1/3`, `2/3`, `3/3`
- Vista de progreso con racha, cumplimiento e historial por hábito
- Ajustes básicos con modo oscuro y reinicio de datos
- Experiencia PWA instalable con soporte iPhone/iOS

## Requisitos

- Node.js 20 o superior
- npm 10 o superior

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
```

## Estructura principal

```text
src/
  app/
    page.tsx
    today/page.tsx
    progress/page.tsx
    settings/page.tsx
    habits/new/page.tsx
    habits/[id]/edit/page.tsx
  components/
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
    mock-data.ts
    validation/habit.ts
    supabase/client.ts
  store/
    use-bossfit-store.ts
  types/
    habit.ts
public/
  sw.js
  favicon.svg
```

## Supabase

El MVP corre sin backend. Para dejar lista una futura conexión:

1. Copia `.env.example` a `.env.local`.
2. Agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Implementa el cliente real y sincroniza las entidades del store.

## Notas

- Los datos iniciales son mock y se guardan localmente.
- El service worker está en `public/sw.js`.
- El manifest se genera desde `src/app/manifest.ts`.
- Los iconos PWA se generan desde `src/app/icon.tsx` y `src/app/apple-icon.tsx`.
