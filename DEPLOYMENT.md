# Despliegue de GestorPro

Guía para publicar GestorPro en producción. Arquitectura:

- **Base de datos**: Supabase Cloud (Postgres + Auth + Storage administrados).
- **App web**: Vercel para empezar (portátil; se puede migrar a otro hosting luego).

> Nota de seguridad: los pasos que piden **credenciales o crear cuentas los haces tú**.
> Nunca pegues llaves/contraseñas en el chat.

---

## 1. Base de datos — Supabase Cloud

1. Crea una cuenta y un proyecto nuevo en <https://supabase.com> (elige región cercana,
   ej. `East US` o `Central`). Guarda la **contraseña de la base** que definas.
2. En el dashboard del proyecto, **Project Settings → API**, anota:
   - `Project URL` → será `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (secreta) → `SUPABASE_SERVICE_ROLE_KEY`
   - El `Project ref` (está en la URL del dashboard) → lo usarás para `link`.
3. Aplica las migraciones a la base en la nube (desde tu PC, en la carpeta del repo):

   ```bash
   # Inicia sesión en el CLI de Supabase (abre el navegador)
   pnpm --filter web exec supabase login

   # Enlaza el repo con tu proyecto (pide la contraseña de la base)
   pnpm --filter web exec supabase link --project-ref TU_PROJECT_REF

   # Sube las 8 migraciones (crea tablas, RLS, funciones y el cron pg_cron)
   pnpm --filter web exec supabase db push
   ```

   Esto deja la base de producción con exactamente el mismo esquema que probamos en local,
   incluido el job mensual de `pg_cron`.

4. **Auth → URL Configuration** (dashboard de Supabase): pon el `Site URL` y agrega a
   `Redirect URLs` la URL de Vercel (la defines en el paso 2), por ejemplo:
   - Site URL: `https://gestorpro.vercel.app`
   - Redirect: `https://gestorpro.vercel.app/auth/callback`
5. (Opcional pero recomendado) **Auth → Providers/Email**: configura un SMTP propio para
   correos de confirmación; el correo por defecto de Supabase tiene límites bajos.

---

## 2. App web — Vercel

1. En <https://vercel.com>, **Add New → Project** e importa tu repo de GitHub
   (`EguiSaz/nextjs-saas-starter-kit-lite`). Vercel detecta Next.js automáticamente.
2. **Root Directory**: `apps/web`. Build command y output los infiere el kit (Turborepo).
3. **Environment Variables** (Settings → Environment Variables) — agrégalas todas:

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL de Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key de Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key (secreta) |
   | `NEXT_PUBLIC_SITE_URL` | la URL https de tu app en Vercel |
   | `NEXT_PUBLIC_PRODUCT_NAME` | `GestorPro` |
   | `CRON_SECRET` | una cadena aleatoria larga (para el endpoint de cron) |

   > `NEXT_PUBLIC_SITE_URL` **debe ser https** (el build lo valida). Primero deploya para
   > obtener la URL de Vercel, luego ponla aquí y redeploya; o usa tu dominio final.
4. **Deploy.** Vercel construye y publica. La rama de producción por defecto es `main`,
   así que fusiona el PR a `main` (o cambia la Production Branch en Vercel a
   `feat/fundacion-multitenant`).

---

## 3. Cron de cargos en producción

El agendado ya está resuelto por **pg_cron dentro de la base** (lo crea la migración):
corre el día 1 de cada mes y genera la renta de todos los contratos activos. **No necesitas
configurar nada más** en Vercel para eso.

El endpoint `POST /api/cron/generar-cargos` (protegido con `CRON_SECRET`) queda disponible
como alternativa/complemento si algún día quieres dispararlo por HTTP (ej. Vercel Cron).

---

## 4. Verificación post-deploy

1. Entra a `https://TU-APP` → deberías ver la landing en español.
2. Regístrate: al crear la cuenta se crea tu organización + arrendador propio (onboarding).
3. Crea un arrendador, una propiedad, un inquilino y un contrato; registra un pago.
4. Revisa el dashboard y los reportes.

---

## 5. Migrar a tu propio hosting (después)

La app es Next.js estándar y **no depende de features exclusivas de Vercel** (el cron vive
en la base con pg_cron). Para moverla a otro hosting:

- Build: `pnpm --filter web build` → Run: `pnpm --filter web start` (Node 20+), con las
  mismas variables de entorno.
- O empaquétala en Docker (Next.js standalone) y córrela donde quieras.
- La **base de Supabase no se mueve**: sigue siendo la misma en la nube; solo cambia dónde
  vive la app. Actualiza `NEXT_PUBLIC_SITE_URL` y las Redirect URLs de Supabase Auth al
  nuevo dominio.
