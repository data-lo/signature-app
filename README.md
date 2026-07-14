# Signature App

Frontend en Next.js (App Router) para la plataforma de firma electrónica de documentos. Consume el backend [`signature-server`](../signature-server/README.md) vía REST.

## 1. Stack técnico

| Categoría | Librería | Uso |
|---|---|---|
| Framework | Next.js 15 (App Router, Turbopack) + React 19 | Base del proyecto |
| Componentes | `@base-ui/react` + `shadcn` (estilo `base-nova`) + `lucide-react` | `components/ui/*`, iconografía |
| Estilos | Tailwind CSS v4, `class-variance-authority`, `tailwind-merge` | Utilidades y variantes de componentes |
| Data fetching | `@tanstack/react-query` v5 | Todo el fetching (queries y mutations); no hay Redux/Zustand |
| HTTP client | `axios` | Cliente centralizado en `lib/axios.ts` |
| Formularios | `react-hook-form` + `zod` v4 | Todos los formularios reales |
| Subida de archivos | FilePond / `react-filepond` | Picker de PDF en `documents/create` |
| Visor de PDF | `react-pdf` (pdf.js, worker desde CDN) | Previsualización de documentos |
| Notificaciones | `react-hot-toast` | Toaster global |
| Sesión | `js-cookie` | Persistencia del JWT en cookie |
| Tema | `next-themes` | Modo claro/oscuro |

`next.config.ts`: `output: 'standalone'` (Dockerfile multi-stage) + alias que desactiva `canvas` (pdf.js lo intenta resolver en Node, no aplica en navegador).

### Middleware de autenticación (`middleware.ts`)

Protege todas las rutas excepto `/`, `/login`, `/signup`, `/error` y assets estáticos. Lee la cookie `token`, **decodifica el payload del JWT sin verificar la firma** (solo para chequear `exp`) y redirige a `/login` si no existe o expiró. No refresca el token — es una optimización de UX para evitar flashes de contenido protegido; la validación de seguridad real ocurre en el backend en cada request.

---

## 2. Proceso de firmado de documentos (desde la UI)

> El backend distingue entre la **credencial de firma** del usuario (rúbrica + INE, se registra una vez) y el **acto de firmar un documento concreto**. En el frontend esto se refleja en dos secciones separadas: `/personal-documents` (credencial) y `/documents/*` (documentos a firmar).

### Paso 1 — Registrar la credencial de firma (`/personal-documents`)

Antes de poder firmar cualquier documento, el usuario debe subir su rúbrica (PNG) e identificación oficial (PDF/JPG/PNG). La pantalla se adapta según el estado actual:
- **Sin nada subido** → formulario que sube ambos archivos juntos (`POST /signature`).
- **Falta uno de los dos** → formulario para completar el que falta (`PATCH /signature/:id`) + opción de eliminar el existente.
- **Ambos completos** → solo visualización + opción de eliminar cada archivo (`DELETE /signature/:id/official-file` o `/signature-image`).

### Paso 2 — Crear un documento y enviarlo a firma (`/documents/create`)

1. Selección del PDF con `DocumentFilePicker` (FilePond, valida tipo `application/pdf` y tamaño ≤20MB) + previsualización en vivo (`PdfPreview`, react-pdf).
2. Selección de participantes con `ParticipantPicker` (dos instancias: firmantes y espectadores), poblado desde `GET /user`. Mínimo un firmante; un mismo usuario no puede ser firmante y espectador a la vez. El orden de selección de firmantes define el **orden de firma**.
3. Al enviar, `useCreateDocument` encadena dos llamadas: `POST /document` (crea el documento) y luego `PATCH /document/:id/submit-for-authorization` (lo envía a firma). Al terminar, navega a `/documents`.
4. Debajo del formulario, `DocumentsTable` lista los documentos ya creados por el usuario (`GET /document?email=...`).

### Paso 3 — Firmar o rechazar (`/documents/[documentId]`)

1. `SignDocumentView` carga el detalle (`GET /document/:id`): PDF (`secureUrl`), lista de participantes con su estado, y los flags `canSign`/`canReject`/`myRole`/`myStatus` que calcula el backend según el turno del usuario.
2. El PDF se muestra con `PdfPreview`. Los participantes se listan con su estado (verde=firmado, rojo=rechazado, ámbar=pendiente).
3. Si `canSign` es `true`, el botón **"Continuar a firmar"** llama directamente `PATCH /document/:id/sign` — no hay ningún paso intermedio de captura de firma en el frontend (la firma visual se compone en el backend a partir de la credencial ya guardada en el paso 1).
4. "Rechazar documento" abre un textarea de motivo (mínimo 5 caracteres) y llama `PATCH /document/:id/reject`.
5. Si no es el turno del usuario, o ya actuó, se muestra un mensaje contextual en vez de los botones de acción.

### Paso 4 — Consultar documentos (`/documents`)

`DocumentsListView`: pestañas "Pendientes"/"Firmados", lista documentos donde el usuario es participante (`GET /document?participantEmail=...`) con filtros por nombre, participante, estado y fechas, y un toggle "solo mi turno". Para documentos firmados, un ícono abre `DocumentPreviewDialog` con el PDF final.

> `/dashboard` (primer punto de entrada tras login) renderiza el mismo componente `CreateDocumentView` que `/documents/create` — ya no existe un flujo mock/en memoria separado.

---

## 3. Estructura de rutas (App Router)

```
app/
├── page.tsx                  → "/" landing pública
├── layout.tsx / providers.tsx → layout raíz (QueryClientProvider + ThemeProvider + Toaster)
├── error/page.tsx            → "/error" — pantalla de error genérica (?code=&message=)
├── login/                    → "/login" (LoginForm, useLogin → POST /auth/login)
├── signup/                   → "/signup" (SignupForm, useRegister → POST /auth/register)
├── _components/               → compartidos entre landing y el flujo mock del dashboard
└── (app)/                    → route group protegido por middleware
    ├── layout.tsx             → DashboardNavbar + DocumentsCountProvider
    ├── dashboard/             → "/dashboard" — renderiza el mismo flujo real que "/documents/create" (ver Pendientes)
    ├── documents/
    │   ├── page.tsx           → "/documents" — listado real (GET /document)
    │   ├── create/            → "/documents/create" — flujo real de creación ⭐
    │   └── [documentId]/      → "/documents/:id" — pantalla de firma real ⭐
    ├── personal-documents/    → "/personal-documents" — credencial de firma (signature/INE)
    └── plans/                 → "/plans", "/plans/success", "/plans/cancel" — suscripciones Stripe
```

Cada ruta con lógica propia trae sus propias carpetas privadas (no forman parte del routing, prefijo `_`):

| Carpeta | Contenido |
|---|---|
| `_components/` | Componentes de presentación específicos de esa ruta |
| `_hooks/` | Hooks de React Query, un archivo por operación (`useCreateDocument.ts`, `useSignDocument.ts`, ...) |
| `_requests.ts` | Funciones de acceso a la API específicas de esa ruta |
| `_schemas.ts` | Esquemas Zod + tipos inferidos para los formularios de esa ruta |

Solo `auth` y `plans` tienen su capa de API centralizada en `lib/api/`; el resto vive co-localizado junto a su ruta (ver sección 6).

---

## 4. Integración con el backend

### Cliente HTTP (`lib/axios.ts`)

- `baseURL`: `process.env.NEXT_PUBLIC_API_BASE_URL` (fallback hardcodeado `http://localhost:3000`, consistente con `.env.local` y el puerto real del backend).
- Interceptor de request: agrega `Authorization: Bearer <token>` leyendo la cookie.
- Interceptor de response: si `401`, limpia la cookie y fuerza redirección a `/login`. No hay refresh token.

### Sesión (`lib/cookies.ts`, `lib/auth.ts`)

Cookie `token` (1 día, `sameSite: 'lax'`, `secure` solo en producción). `logout()` llama `POST /auth/logout` y siempre limpia la cookie localmente en el `finally`, incluso si la llamada falla.

### Funciones de API por módulo

**`lib/api/auth.ts`**

| Función | Endpoint |
|---|---|
| `getCurrentUserRequest` | `GET /auth/me` |

*(`loginRequest` y `registerRequest` viven en `app/login/_requests.ts` y `app/signup/_requests.ts` respectivamente, no en `lib/api/` — inconsistencia menor de ubicación.)*

**`lib/api/plans/`**

| Función | Endpoint |
|---|---|
| `getPlansRequest` | `GET /stripe/plans` |
| `createCheckoutSessionRequest(planId)` | `POST /stripe/checkout/session` |
| `getSubscriptionStateRequest` | `GET /stripe/subscription` |

**`app/(app)/documents/_requests.ts`**

| Función | Endpoint |
|---|---|
| `getUsersRequest` | `GET /user` |
| `getParticipantDocumentsRequest` | `GET /document?participantEmail=&status=&page=&limit=...` |

**`app/(app)/documents/create/_requests.ts`**

| Función | Endpoint |
|---|---|
| `createDocumentRequest` | `POST /document` (multipart) |
| `submitForAuthorizationRequest` | `PATCH /document/:id/submit-for-authorization` |
| `getMyDocumentsRequest` | `GET /document?email=&page=&limit=...` |

**`app/(app)/documents/[documentId]/_requests.ts`**

| Función | Endpoint |
|---|---|
| `getDocumentDetailRequest` | `GET /document/:id` |
| `signDocumentRequest` | `PATCH /document/:id/sign` |
| `rejectDocumentRequest` | `PATCH /document/:id/reject` |

**`app/(app)/personal-documents/_requests.ts`**

| Función | Endpoint |
|---|---|
| `uploadPersonalDocumentsRequest` | `POST /signature` (multipart: officialFile + signatureImage) |
| `updateIneFileRequest` / `updateSignatureFileRequest` | `PATCH /signature/:id` |
| `deleteIneFileRequest` / `deleteSignatureFileRequest` | `DELETE /signature/:id/official-file` \| `/signature-image` |

Todas las respuestas del backend siguen el sobre `{ success, message, data }` (y `meta` en listados paginados).

---

## 5. Componentes reutilizables

- **`components/ui/`** — librería base tipo shadcn sobre `@base-ui/react`: `button`, `card`, `checkbox`, `dialog`, `dropdown-menu`, `input`, `label`, `popover`, `select`, `switch`, `table`, `textarea`, `field`, `separator`. `button.tsx` define las variantes propias (`default`, `brand` — CTA principal verde esmeralda, `outline`, `secondary`, `ghost`, `destructive`, `link`).
- **`components/form/text-field.tsx`** — único helper de formulario reutilizable: envuelve `Field` + `FieldLabel` + `Input` + `FieldError` para usarse directamente con `register()` de react-hook-form. Usado en `LoginForm`/`SignupForm`; el resto de formularios (documentos, personal-documents) construyen sus campos ad-hoc.
- **`lib/utils.ts`** — `cn()` (clsx + tailwind-merge), usado en todo el proyecto para clases condicionales.

---

## 6. Convenciones de estructura

- **Co-locación por ruta**: cada ruta trae su propia lógica en `_components/`, `_hooks/`, `_requests.ts`, `_schemas.ts` — evita un `lib/` monolítico.
- **Rutas anidadas reutilizan tipos/componentes del padre**: p. ej. `documents/create/_components` importa desde `documents/_components/`.
- **Route group `(app)`**: agrupa todas las rutas autenticadas bajo un layout común sin afectar la URL.
- **`next/dynamic({ ssr: false })`** para cualquier componente que use `react-pdf` (depende de APIs del navegador).
- **Manejo de errores uniforme**: los hooks de mutación repiten el patrón de castear el error a `AxiosError<{message}>` y caer a un mensaje genérico en español, mostrado con `react-hot-toast`.
- **Idioma**: todo el copy de UI en español; nombres de variables/funciones en inglés.

---

## 7. Levantar el proyecto

```bash
npm install
npm run dev     # levanta en modo desarrollo (Turbopack)
```

Requiere `NEXT_PUBLIC_API_BASE_URL` apuntando al backend (`signature-server`) corriendo.

---

## 8. Pendientes / trabajo futuro

### Resuelto recientemente
- **Flujo de documentos duplicado**: el prototipo en memoria de `/dashboard` (`DocumentUploadFlow`/`DocumentPrepareModal`/`SignerFormCard`/`SpectatorFormCard`/`DocumentPreviewPane`) fue eliminado. `/dashboard` ahora renderiza el mismo `CreateDocumentView` real que `/documents/create` (mismos hooks, mismo `lib/api`, misma validación Zod de `documents/create/_schemas.ts`).
- **Duplicados en la creación de documentos**: el backend ahora rechaza (`400`) seleccionar al mismo usuario dos veces entre firmantes/espectadores, y rechaza crear un documento con el mismo nombre de archivo que otro documento propio en estatus `CREATED`/`PENDING` (`DocumentService.create`).
- **Edición de información personal**: `/personal-documents` (`UserInfoCard`) permite editar `phoneNumber` y `secondaryEmail` vía `PATCH /user/personal-information`. `name`, `lastName`, `curp` y `rfc` son campos de identidad y **no son editables por diseño**: el backend los quitó de `UpdatePersonalInformationDto` (no solo el frontend deja de mandarlos, el endpoint los rechaza si algún otro cliente los envía). El CURP tampoco es editable vía `PATCH /user/:id` (se quitó de `UpdateUserDto`) — se fija una sola vez al crear/registrar el usuario.
- **Firma electrónica avanzada vs simple**: se eliminó del proyecto (landing y cualquier mención de "e.firma"/firma avanzada). El producto solo ofrece firma electrónica simple, resuelta por la credencial (rúbrica + INE) registrada en `/personal-documents`.
- **Previews unificados**: se eliminó `DocumentPreviewPane` (duplicado); todo el proyecto usa `PdfPreview` (`documents/_components/`), que ya soporta ancho responsivo y `File | string`.
- **`useSubmitForAuthorization`**: confirmado como código muerto (la lógica real vive en `useCreateDocument`) y eliminado.
- **Puerto por defecto**: el fallback de `lib/axios.ts` ahora es `http://localhost:3000`, consistente con `.env.local` y con el backend.
- **`console.log` de depuración**: eliminado de `app/login/_requests.ts`.
- **Seguridad del JWT en `middleware.ts`**: se confirmó que el backend valida la firma del JWT en cada request (`JwtAuthGuard` usa `jwtService.verifyAsync`, no solo decodifica) salvo en rutas `@Public()`/`@SkipJwtAuth()`. El decode sin verificar en el frontend sigue siendo solo una optimización de UX (evitar flashes de contenido protegido) — no es ni pretende ser una capa de seguridad real.
- **Nombre de documento duplicado**: `useCreateDocument` ya mostraba un toast de error con el mensaje del backend; se agregó además un mensaje inline debajo del botón "Firmar" en `CreateDocumentView` para que el error de nombre duplicado (o de participante repetido) quede visible junto al formulario, no solo en el toast.
- **Usuario duplicado (CURP/email)**: el backend ya rechazaba emails duplicados; ahora también rechaza (`409`) un CURP ya registrado por otro usuario activo, tanto en `POST /auth/register` como en `POST /user`. Como el CURP ya no es editable después de crear el usuario (ver punto anterior), esta validación solo aplica al crear/registrar, no a ninguna actualización. El **nombre y apellido sí pueden repetirse entre usuarios distintos** — solo CURP y correo son campos de unicidad. `useRegister` ahora muestra tanto el mensaje inline (ya existía) como un toast de error con el mensaje del backend.
- **Modal de confirmación al eliminar INE/firma**: se reemplazó el `window.confirm` nativo en `PersonalDocumentsCompleted` y `PersonalDocumentsPartial` por un componente `DeleteConfirmDialog` (basado en `components/ui/dialog`), consistente con el resto de la UI.
- **Toasts de éxito**: se auditaron todos los `useMutation` del proyecto. Solo faltaba en `useRegister` (creación de cuenta) — se agregó `toast.success('Cuenta creada correctamente')`. El resto de flujos de creación/actualización (`useCreateDocument`, `useSignDocument`, `useRejectDocument`, `useUploadPersonalDocuments`, `useUpdatePersonalDocument`, `useUpdatePersonalInformation`) ya tenían su toast de éxito. `useLogin`/`useLogout` (no son creación/actualización) y `useCreateCheckoutSession` (redirige de inmediato a Stripe) se dejaron sin toast a propósito.

### Ideas descartadas junto con el prototipo del dashboard
El prototipo mock incluía UI para "recordatorios" (frecuencia de reenvío), "mensaje para participantes" y "fecha de expiración" del documento. Ninguna tiene respaldo en el backend actual (no hay campos ni jobs para esto), así que se descartaron junto con el resto del mock. Si el producto las requiere, hay que diseñarlas end-to-end (entidad/DTO en `signature-server`, job de recordatorios, UI) desde cero — no es simplemente "reconectar" código existente.
