# BossFit

BossFit es una PWA fitness mobile-first para crear h?bitos, completar series por d?a y seguir progreso real con una experiencia premium tipo app.

## Stack

- Next.js + React + TypeScript
- Tailwind CSS
- Zustand para estado local persistente
- React Hook Form + Zod para formularios
- Supabase Auth con email/password
- Persistencia local + sincronizaci?n remota por usuario
- PWA manual con manifest, iconos y service worker

## Funcionalidades actuales

- Login, registro y logout con Supabase
- Rutas protegidas para la app principal
- CRUD completo de h?bitos
- Programaci?n por d?as con selector t?ctil `L M X J V S D`
- Ejecuci?n diaria por series, no por repetici?n individual
- Persistencia local robusta con `localStorage`
- Sincronizaci?n gradual del estado del usuario con Supabase
- Dashboard con progreso del d?a, racha actual, mejor racha, Boss Points y nivel
- Vista de hoy con estado `0/3`, `1/3`, `2/3`, `3/3`
- Vista de progreso con resumen semanal, calendario mensual, gr?fica de 7 d?as e historial por h?bito
- Sistema de Boss Points con niveles y progreso al siguiente nivel
- Ajustes con modo oscuro, recordatorios locales y reinicio de datos
- Experiencia PWA instalable con soporte iPhone/iOS

## Requisitos

- Node.js 20 o superior
- npm 10 o superior

## Variables de entorno

BossFit espera estas variables en `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` se usa solo en rutas del servidor para operaciones administrativas y para la sync critica de cuenta. No la expongas en el frontend ni la subas a Git.

## Configuraci?n de Supabase

1. En Supabase, habilita Email Auth.
2. Ejecuta el SQL de [supabase/schema.sql](./supabase/schema.sql) en el SQL Editor del proyecto.
3. Verifica que tus variables de entorno en `.env.local` apunten al mismo proyecto.

La sync usa dos tablas remotas: `public.bossfit_user_state` para el snapshot actual y `public.bossfit_user_state_history` para backups remotos recuperables.

### Columnas requeridas en `bossfit_user_state`

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

### Qu? guarda `app_state`

`app_state` es un `jsonb` con el snapshot necesario para rehidratar la app:

- `habits`
- `completions`
- `theme`
- `reminderSettings`

### Qu? se guarda como metadata auxiliar

Estas columnas ayudan para reporting y debugging, pero no son la fuente principal de verdad:

- `habits_count`
- `completions_count`
- `current_streak`
- `best_streak`
- `total_points`
- `level`

Rachas, Boss Points, niveles y estad?sticas completas siguen deriv?ndose desde el snapshot para evitar desajustes.

## C?mo correrlo

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

## C?mo probar login + sync

1. Ejecuta el SQL de [supabase/schema.sql](./supabase/schema.sql).
2. Inicia la app con `npm run dev`.
3. Crea una cuenta o inicia sesi?n.
4. Crea o edita h?bitos.
5. Marca progreso diario.
6. Recarga la p?gina.
7. Cierra sesi?n y vuelve a entrar con el mismo usuario.
8. Verifica que los datos vuelvan desde Supabase y tambi?n permanezcan en localStorage.

## Flujo de persistencia

BossFit mantiene dos capas de persistencia:

1. `localStorage` sigue siendo la base local del dispositivo.
2. Si el usuario inicia sesi?n, el estado importante se sincroniza con Supabase bajo su `user_id`.

Estrategia de migraci?n gradual:

- si el usuario entra por primera vez y no hay estado remoto, BossFit sube su estado local
- si ya existe estado remoto, BossFit lo recupera y lo hidrata en el store
- si hay cambios locales sin sincronizar del mismo usuario, BossFit prioriza ese estado local y lo vuelve a subir
- si cambia de cuenta en el mismo navegador, BossFit evita mezclar datos entre usuarios

## Estructura principal

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

## Recordatorios

BossFit usa la Notifications API del navegador con configuraci?n local:

- activar o desactivar recordatorios
- elegir una hora diaria
- guardar permiso y ?ltima fecha enviada localmente
- ejecutar recordatorios mientras BossFit esta abierta o instalada en un entorno compatible

Limitaci?n importante:

- sin backend, push remota ni service worker de notificaciones, no existe garantia de recordatorios persistentes cuando la app esta cerrada
- en iPhone/iOS esta limitacion es especialmente importante; la experiencia es mas fiable si BossFit esta instalada en la pantalla de inicio

## Notas

- Los usuarios nuevos empiezan sin h?bitos por defecto.
- El service worker esta en `public/sw.js`.
- El manifest se genera desde `src/app/manifest.ts`.
- Los iconos PWA se generan desde `src/app/icon.tsx` y `src/app/apple-icon.tsx`.
- La protecci?n de rutas actual se resuelve en el cliente para no introducir una capa SSR adicional mientras no podamos instalar `@supabase/ssr` en este entorno.


