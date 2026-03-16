# BossFit

BossFit es una PWA fitness mobile-first para crear hábitos, marcar series completadas por día y seguir progreso real con una experiencia premium tipo app.

## Stack

- Next.js + React + TypeScript
- Tailwind CSS
- Zustand para estado local persistente
- React Hook Form + Zod para formularios
- PWA manual con manifest, iconos y service worker
- Estructura lista para integrar Supabase después

## Funcionalidades actuales

- CRUD completo de hábitos
- Programación por días con selector táctil `L M X J V S D`
- Ejecución diaria por series, no por repetición individual
- Persistencia local con `localStorage`
- Dashboard con progreso del día, racha actual, mejor racha, Boss Points y nivel
- Vista de hoy con estado `0/3`, `1/3`, `2/3`, `3/3`
- Vista de progreso con resumen semanal, calendario mensual, gráfica de 7 días e historial por hábito
- Sistema de Boss Points con niveles y progreso al siguiente nivel
- Ajustes con modo oscuro, recordatorios locales y reinicio de datos
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
    progress-analytics.ts
    reminders.ts
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

## Boss Points y niveles

BossFit calcula los puntos a partir del progreso local guardado:

- completar 1 serie: `+5`
- completar un hábito: `+10`
- completar todo el día: `+20`
- alcanzar un múltiplo de 7 días de racha: `+35`

Los niveles crecen de forma progresiva y se derivan automáticamente de tus Boss Points acumulados.

## Recordatorios

BossFit usa la Notifications API del navegador con configuración local:

- activar o desactivar recordatorios
- elegir una hora diaria
- guardar permiso y última fecha enviada localmente
- ejecutar recordatorios mientras BossFit está abierta o instalada en un entorno compatible

Limitación importante:

- sin backend, push remota ni service worker de notificaciones, no existe garantía de recordatorios persistentes cuando la app está cerrada
- en iPhone/iOS esta limitación es especialmente importante; la experiencia es más fiable si BossFit está instalada en la pantalla de inicio

## Supabase

El MVP sigue corriendo sin backend. Para dejar lista una futura conexión:

1. Copia `.env.example` a `.env.local`.
2. Agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Implementa el cliente real y sincroniza las entidades del store.

## Notas

- Los datos iniciales son mock y se guardan localmente.
- El service worker está en `public/sw.js`.
- El manifest se genera desde `src/app/manifest.ts`.
- Los iconos PWA se generan desde `src/app/icon.tsx` y `src/app/apple-icon.tsx`.
