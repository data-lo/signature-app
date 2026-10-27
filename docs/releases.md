# Releases a producción

Cada release de producción sale de `main` y se identifica con un tag Git
SemVer: `vMAJOR.MINOR.PATCH`. Un tag es inmutable: si una versión ya se publicó,
no se mueve ni se reutiliza.

## Crear un release

1. Integra a `main` el commit ya validado en `development`.
2. Actualiza la versión según el cambio:
   - `PATCH` (`v1.2.3` → `v1.2.4`): corrección compatible.
   - `MINOR` (`v1.2.3` → `v1.3.0`): funcionalidad compatible.
   - `MAJOR` (`v1.2.3` → `v2.0.0`): cambio incompatible.
3. Desde el commit que está en `main`, crea y publica un tag anotado:

   ```bash
   git switch main
   git pull --ff-only origin main
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

El push del tag ejecuta `Deploy production`. El workflow valida que el commit
del tag pertenezca a `main`, ejecuta lint, pruebas y build; después espera la
aprobación del GitHub Environment `production` antes de publicar y desplegar.

## Etiquetas de imagen

Para `v1.0.0` sobre el commit `abc123...`, el workflow publica:

- `dataloplatforms/signature-app:v1.0.0`: referencia humana e inmutable del release.
- `dataloplatforms/signature-app:sha-abc123...`: referencia exacta para auditoría y rollback.
- `dataloplatforms/signature-app:production`: puntero que Dokploy consume y que avanza sólo tras la aprobación.

Dokploy debe estar configurado para usar `dataloplatforms/signature-app:production`
y hacer pull al recibir el webhook. Para volver atrás, cambia temporalmente esa
referencia a una versión previa (`v1.0.0`) en Dokploy o republica el puntero
`production` desde un workflow de rollback revisado.

## Configuración requerida en GitHub

Crea el Environment `production`, configura revisores obligatorios y agrega
estos secrets en ese Environment:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `BACKEND_URL_BUILD`
- `NEXT_PUBLIC_SENTRY_DSN` (vacío si no se usa Sentry)
- `DOKPLOY_PRODUCTION_DEPLOY_WEBHOOK`

Las variables de runtime, como `BACKEND_URL_RUNTIME` y `TURNSTILE_SITE_KEY`,
se conservan configuradas como variables protegidas dentro de Dokploy; nunca se
incluyen en una imagen ni en el workflow.
