# Signature App

Frontend en Next.js (App Router) para la plataforma de firma electrónica de documentos. Consume el backend [`signature-server`](../signature-server/README.md) vía REST.

## 1. Stack técnico

| Categoría | Librería | Uso |
|---|---|---|
| Framework | Next.js 15 (App Router, Turbopack) + React 19 | Base del proyecto |
| Componentes | `@base-ui/react` + `shadcn` (estilo `base-nova`) + `lucide-react` | `components/ui/*`, iconografía |
| Estilos | Tailwind CSS v4, `class-variance-authority`, `tailwind-merge` | Utilidades y variantes de componentes |
| Data fetching | `@tanstack/react-query` v5 | Todo el fetching (queries y mutations) |
| Estado global | `zustand` v5 (Slices Pattern) | `useAuthStore` — sesión, perfil de onboarding y tenant activo multi-cuenta (ver sección 3) |
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
- **Sin nada subido** → formulario que sube ambos archivos juntos (`PUT /api/v1/users/me/signature`).
- **Falta uno de los dos** → formulario para completar el que falta (`PATCH /signature/:id`) + opción de eliminar el existente.
- **Ambos completos** → solo visualización + opción de eliminar cada archivo (`DELETE /signature/:id/official-file` o `/signature-image`).

### Paso 2 — Crear un documento y enviarlo a firma (`/documents/create`)

1. Selección del PDF con `DocumentFilePicker` (FilePond, valida tipo `application/pdf` y tamaño ≤20MB) + previsualización en vivo (`PdfPreview`, react-pdf).
2. Selección de participantes con `ParticipantPicker` (dos instancias: firmantes y espectadores), poblado desde `GET /user`. Mínimo un firmante; un mismo usuario no puede ser firmante y espectador a la vez. El orden de selección de firmantes define el **orden de firma**.
3. Al enviar, `useCreateDocument` encadena dos llamadas: `POST /document` (crea el documento) y luego `PATCH /document/:id/submit-for-authorization` (lo envía a firma). Al terminar, navega a `/documents`.
4. Debajo del formulario, `DocumentsTable` lista los documentos ya creados por el usuario (`GET /document?email=...`).

### Paso 3 — Firmar o rechazar (`/documents/[documentId]`)

1. `SignDocumentView` carga el detalle (`GET /document/:id`): PDF (`secureUrl`), lista de participantes con su estado, y los flags `canSign`/`canReject`/`canRequestCancellation`/`canConfirmCancellation`/`myRole`/`myStatus` que calcula el backend según el turno y rol del usuario.
2. El PDF se muestra con `PdfPreview`. Los participantes se listan con su estado (verde=firmado, rojo=rechazado, ámbar=pendiente).
3. Si `canSign` es `true`, el botón **"Continuar a firmar"** llama directamente `PATCH /document/:id/sign` — no hay ningún paso intermedio de captura de firma en el frontend (la firma visual se compone en el backend a partir de la credencial ya guardada en el paso 1).
4. "Rechazar documento" abre un textarea de motivo (mínimo 5 caracteres) y llama `PATCH /document/:id/reject`.
5. Si no es el turno del usuario, o ya actuó, se muestra un mensaje contextual en vez de los botones de acción.
6. **Cancelación** (misma pantalla): si `canRequestCancellation` (el creador, con el documento ya `SIGNED`), un botón "Solicitar cancelación" abre `CancellationConfirmDialog` y llama `PATCH /document/:id/submit-for-cancellation`. Si `canConfirmCancellation` (cualquier firmante, con el documento en `CANCELLATION_PENDING`), un botón "Confirmar cancelación" llama `PATCH /document/:id/confirm-cancellation`. Ambos usan el mismo diálogo de confirmación (no `window.confirm`).

### Paso 4 — Consultar documentos (`/documents`)

`DocumentsListView`: pestañas "Pendientes"/"Firmados", lista documentos donde el usuario es participante (`GET /document?participantEmail=...`) con filtros por nombre, participante, estado y fechas, y un toggle "solo mi turno". Para documentos firmados, un ícono abre `DocumentPreviewDialog` con el PDF final. Para documentos firmados, en cancelación pendiente o cancelados, un botón "Ver detalle" (`onViewDetail`) navega a `/documents/:id`, donde `SignDocumentView` decide qué mostrar según los flags de arriba.

> `/dashboard` (primer punto de entrada tras login) renderiza el mismo componente `CreateDocumentView` que `/documents/create` — ya no existe un flujo mock/en memoria separado.

---

## 3. Autenticación, onboarding y multi-tenancy (Zustand)

### 3.1 Login, registro y aterrizaje en `/home`

`POST /auth/login` guarda el JWT en cookie (`setAuthToken`) y redirige a `/home`. El store (`useAuthStore`) **no** se llena en ese momento — `AuthProvider` (envuelve todo el route group `(app)`, ver `app/(app)/layout.tsx`) es quien lo hidrata al montar, leyendo `GET /api/v1/users/me` (perfil cacheado en Redis por CURP) y `GET /api/v1/accounts/me` (catálogo de cuentas). Si es la primera vez que el usuario entra (no hay `activeAccount` persistido), `AuthProvider` cae automáticamente a la cuenta de tipo `PERSONAL` del catálogo.

### 3.2 Onboarding (`personalConfigured` / `signatureConfigured`)

`OnboardingBanner` (en `/home`) lee `user.personalConfigured`/`user.signatureConfigured` del store y bloquea con **"Es requerido configurar tu usuario"** mientras cualquiera de las dos sea `false`, con accesos independientes a `/personal-documents` para completar cada una.

Cada mini-flujo muta **solo su propia bandera**, sin esperar a un refetch:
- `useUpdatePersonalInformation` (`PUT /api/v1/users/me/personal-information`) → al éxito, `updateOnboardingStatus('personal', true)`.
- `useUploadPersonalDocuments` (`PUT /api/v1/users/me/signature`) → al éxito, `updateOnboardingStatus('signature', true)`.

`AuthProvider` se suscribe (`useAuthStore.subscribe`) y, en cuanto ambas banderas quedan en `true` (y el usuario aún no está `isConfigured`), dispara automáticamente `PATCH /api/v1/users/me/status` (`usePatchUserStatus`) y al éxito llama `markConsolidated()` — el banner desaparece de inmediato porque ya se cumplió la condición local, sin esperar la respuesta del PATCH.

### 3.3 Organizaciones y el switcher de cuentas (multi-tenant)

`/organization/create` (`CreateOrganizationForm` + `useCreateOrganization`) llama `POST /api/v1/organizations`. Al éxito, **sin ninguna petición extra a la red**: `addAccount(account)` inserta la cuenta nueva en `accountsList` y `setActiveAccount(...)` la vuelve el tenant activo de inmediato; luego toast de éxito y redirección a `/home`.

`AccountSwitcher` (en el header, `app/_components/AccountSwitcher.tsx`) lee `accountsList`/`activeAccount` **directamente del store** — no vuelve a pedir el catálogo por su cuenta; `AuthProvider` ya lo carga una sola vez para toda la app autenticada.

`lib/axios.ts` inyecta en cada request `X-Account-Id` (si hay `activeAccount`) y `X-Organization-Id` (solo si `activeAccount.accountType === 'ORGANIZATION'`) — es plomería lista del lado del cliente; el backend todavía no lee estos headers para nada (ver Pendientes).

### 3.4 Store global (`useAuthStore`) — Slices Pattern

El store vive en `lib/store/` partido en 3 slices + un archivo de tipos, unidos en un solo hook:

| Archivo | Responsabilidad |
|---|---|
| `types/auth-store.types.ts` | Tipos centrales: `AuthUser` (con `personalConfigured`/`signatureConfigured` anidados), `AccountListEntry`, `ActiveAccount`, `AuthState = AuthSlice & AccountsListSlice & ActiveAccountSlice` |
| `auth.slice.ts` | `authToken`, `user`, `setAuth(token, profile)`, `updateOnboardingStatus(step, value)`, `logout()`, más `consolidationInFlight`/`markConsolidating`/`markConsolidated` (guard interno para el disparador automático, no forma parte del contrato "de negocio" del store) |
| `accounts-list.slice.ts` | `accountsList`, `setAccountsList(accounts)` (reemplaza todo el catálogo), `addAccount(account)` (inserta una sola cuenta sin refetch), y el mapper `toAccountListEntry` que normaliza la `Account` cruda del backend (`type`→`accountType`, deriva `organizationId`, `organizationName` desde `organizationDetail.name`) |
| `active-account.slice.ts` | `activeAccount`, `setActiveAccount(account)` — se queda solo con `{id, accountType, organizationId, roleId}`, ignorando cualquier campo extra del objeto que reciba |
| `useAuthStore.ts` | Une los 3 slices con `create()(persist(...))`. Solo `activeAccount` se persiste en `localStorage` (el JWT sigue viviendo únicamente en la cookie, para no duplicarlo en un storage más expuesto a XSS; `user` se recarga siempre fresco desde `/users/me`) |

Dos detalles de implementación no obvios, ambos ya resueltos (ver Pendientes por si generan dudas al tocar el store):
- **SSR**: Next.js evalúa este store también en el servidor, donde no existe `localStorage`. `createJSONStorage` usa un storage no-op cuando `typeof window === 'undefined'`, y el store se crea con `skipHydration: true` — la rehidratación real ocurre en un efecto de `AuthProvider` (`useAuthStore.persist.rehydrate()`), gateada por `useAuthStore.persist.hasHydrated()` para no pisar una cuenta activa persistida con el fallback a la cuenta personal.
- **`roleId`/`status` en `accountsList`**: el tipo los declara (`roleId: string | null`, `status: 'ACTIVE' | 'INACTIVE'`), pero el backend todavía no expone el rol/vigencia de la membresía en el catálogo cacheado — `toAccountListEntry` los rellena con `null`/`'ACTIVE'` por defecto. Ver Pendientes.

---

## 4. Estructura de rutas (App Router)

```
app/
├── page.tsx                  → "/" landing pública
├── layout.tsx / providers.tsx → layout raíz (QueryClientProvider + ThemeProvider + Toaster)
├── error/page.tsx            → "/error" — pantalla de error genérica (?code=&message=)
├── login/                    → "/login" (LoginForm, useLogin → POST /auth/login)
├── signup/                   → "/signup" (SignupForm, useRegister → POST /auth/register)
├── _components/               → compartidos entre landing y el flujo mock del dashboard
└── (app)/                    → route group protegido por middleware
    ├── layout.tsx             → AuthProvider (hidrata useAuthStore) + DocumentsCountProvider + DashboardNavbar (con AccountSwitcher)
    ├── home/                  → "/home" — aterrizaje post-login: OnboardingBanner + acceso a las demás secciones
    ├── organization/create/   → "/organization/create" — CreateOrganizationForm → POST /api/v1/organizations
    ├── dashboard/             → "/dashboard" — renderiza el mismo flujo real que "/documents/create" (ver Pendientes)
    ├── documents/
    │   ├── page.tsx           → "/documents" — listado real (GET /document)
    │   ├── create/            → "/documents/create" — flujo real de creación ⭐
    │   └── [documentId]/      → "/documents/:id" — pantalla de firma real ⭐
    ├── personal-documents/    → "/personal-documents" — credencial de firma (signature/INE) + datos de contacto del onboarding
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

## 5. Integración con el backend

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
| `getCurrentUserRequest` | `GET /auth/me` (perfil completo, incluye URLs prefirmadas de firma/INE; usado por `/personal-documents`) |
| `getOnboardingProfileRequest` | `GET /api/v1/users/me` (snapshot cacheado en Redis por CURP; usado por `AuthProvider` para hidratar `useAuthStore`) |

*(`loginRequest` y `registerRequest` viven en `app/login/_requests.ts` y `app/signup/_requests.ts` respectivamente, no en `lib/api/` — inconsistencia menor de ubicación.)*

**`lib/api/accounts.ts`**

| Función | Endpoint |
|---|---|
| `getAccountsCatalogRequest` | `GET /api/v1/accounts/me` (catálogo cacheado en Redis; usado por `AuthProvider` para poblar `accountsList`, no por `AccountSwitcher` directamente) |
| `createOrganizationRequest` | `POST /api/v1/organizations` |

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
| `uploadPersonalDocumentsRequest` | `PUT /api/v1/users/me/signature` (multipart: officialFile + signatureImage) |
| `updateIneFileRequest` / `updateSignatureFileRequest` | `PATCH /signature/:id` |
| `deleteIneFileRequest` / `deleteSignatureFileRequest` | `DELETE /signature/:id/official-file` \| `/signature-image` |

Todas las respuestas del backend siguen el sobre `{ success, message, data }` (y `meta` en listados paginados).

---

## 6. Componentes reutilizables

- **`components/ui/`** — librería base tipo shadcn sobre `@base-ui/react`: `button`, `card`, `checkbox`, `dialog`, `dropdown-menu`, `input`, `label`, `popover`, `select`, `switch`, `table`, `textarea`, `field`, `separator`. `button.tsx` define las variantes propias (`default`, `brand` — CTA principal verde esmeralda, `outline`, `secondary`, `ghost`, `destructive`, `link`).
- **`components/form/text-field.tsx`** — único helper de formulario reutilizable: envuelve `Field` + `FieldLabel` + `Input` + `FieldError` para usarse directamente con `register()` de react-hook-form. Usado en `LoginForm`/`SignupForm`; el resto de formularios (documentos, personal-documents) construyen sus campos ad-hoc.
- **`lib/utils.ts`** — `cn()` (clsx + tailwind-merge), usado en todo el proyecto para clases condicionales.

---

## 7. Convenciones de estructura

- **Co-locación por ruta**: cada ruta trae su propia lógica en `_components/`, `_hooks/`, `_requests.ts`, `_schemas.ts` — evita un `lib/` monolítico.
- **Rutas anidadas reutilizan tipos/componentes del padre**: p. ej. `documents/create/_components` importa desde `documents/_components/`.
- **Route group `(app)`**: agrupa todas las rutas autenticadas bajo un layout común sin afectar la URL.
- **`next/dynamic({ ssr: false })`** para cualquier componente que use `react-pdf` (depende de APIs del navegador).
- **Manejo de errores uniforme**: los hooks de mutación repiten el patrón de castear el error a `AxiosError<{message}>` y caer a un mensaje genérico en español, mostrado con `react-hot-toast`.
- **Idioma**: todo el copy de UI en español; nombres de variables/funciones en inglés.

---

## 8. Levantar el proyecto

```bash
npm install
npm run dev     # levanta en modo desarrollo (Turbopack)
```

Requiere `NEXT_PUBLIC_API_BASE_URL` apuntando al backend (`signature-server`) corriendo.

### Tests

```bash
npm run test        # corre toda la suite con Jest
npm run test:watch  # modo watch
```

Jest configurado vía `next/jest` (`jest.config.mjs`, ESM — consistente con `eslint.config.mjs`/`postcss.config.mjs`) + React Testing Library + `jest-dom`. `test-utils.tsx` en la raíz expone `renderWithProviders()`, que envuelve en un `QueryClientProvider` de prueba (retries desactivados) para componentes que usan React Query. Los specs están co-localizados junto a su componente/schema (`*.spec.ts`/`*.spec.tsx`), igual que en `signature-server`.

---

## 9. Pendientes / trabajo futuro

### Pendientes reales (lo que queda abierto hoy)
- **`roleId`/`status` de `accountsList` siempre vienen con valor por defecto**: `toAccountListEntry` (`lib/store/accounts-list.slice.ts`) rellena `roleId: null` y `status: 'ACTIVE'` porque `GET /api/v1/accounts/me` todavía no expone el rol/vigencia real de la membresía — ver README de `signature-server`. El switcher funciona, pero no puede (todavía) diferenciar visualmente roles ni ocultar cuentas con acceso revocado.
- **`X-Account-Id`/`X-Organization-Id` no tienen efecto real todavía**: `lib/axios.ts` los manda en cada request, pero el backend no los lee ni los usa para nada — es solo la plomería del lado del cliente. No hay aislamiento de datos por tenant activo todavía; cambiar de cuenta en el switcher hoy solo actualiza la UI local, no filtra ninguna respuesta del backend.
- **`activeAccount` persistido nunca se revalida contra el catálogo fresco**: si el usuario pierde acceso a la cuenta que tenía activa (o la organización se elimina), `AuthProvider` no lo detecta — solo cae a la cuenta personal cuando `activeAccount` es `null`, nunca cuando apunta a una cuenta que ya no aparece en `accountsList`.
- **Sin UI para asignar el `roleId` de una organización recién creada**: `POST /api/v1/organizations` deja el rol del creador en `NULL` a propósito (ver historia de creación de organización); el backend tiene `PATCH /account-member/:id` para asignarlo después, pero ningún flujo del frontend lo llama todavía.
- **Cobertura de tests desigual**: 46 tests en 10 suites, pero casi toda la cobertura nueva de esta ronda es a nivel de store (`useAuthStore.spec.ts`, 12 tests de las acciones de los 3 slices) — **no hay tests de componente** para `AuthProvider` (la orquestación entre slices: hidratación, fallback a cuenta personal, disparador automático de `/me/status`), `AccountSwitcher`, `OnboardingBanner`, `CreateOrganizationForm`/`useCreateOrganization`, ni para los hooks de `personal-documents` que mutan el onboarding. Tampoco hay tests para `PersonalDocumentsView`/`UserInfoCard`, `DocumentsListView`, ni los flujos de `plans`/Stripe. Sin tests end-to-end (Playwright/Cypress) — todo lo actual es unitario/de integración con mocks.
- **Reminders / mensaje para participantes / fecha de expiración**: sigue **deliberadamente pendiente** (decisión del equipo) — ver "Ideas descartadas" más abajo. Si el producto los pide más adelante, hay que diseñarlos end-to-end (no es reconectar código existente).

### Resuelto en esta ronda (invalidación del cache de Redis del onboarding)
- **Ya no hay ventana de regresión visual al refrescar a medias del onboarding**: `PUT /api/v1/users/me/personal-information` y `PUT /api/v1/users/me/signature` ahora refrescan el cache de Redis por CURP en el backend (antes solo lo hacía `PATCH /me/status`) — ver README de `signature-server` para el detalle del fix. `GET /api/v1/users/me` ya no puede devolver un snapshot viejo tras completar un solo paso del onboarding.
- **`ParticipantPicker` (`/documents/create`) confirmado visualmente**: los dos fixes de estilo del popup (ancho fijo cortando texto largo, `alignItemWithTrigger` dejando el popup pegado al trigger) ya se verificaron en navegador real.

### Resuelto en esta ronda (organizaciones, onboarding con Zustand, switcher multi-tenant)
- **Store global consolidado con Slices Pattern**: los dos stores independientes que existían antes (uno para `authToken`/`activeAccount`, otro para el perfil de onboarding) se unificaron en `useAuthStore` (`lib/store/`), partido en `auth.slice.ts`/`accounts-list.slice.ts`/`active-account.slice.ts` + `types/auth-store.types.ts` — ver sección 3.4 arriba.
- **`AuthProvider` reemplaza a los dos providers viejos** (`AccountProvider`+`OnboardingProvider`): hidrata el store completo (perfil + catálogo de cuentas) al entrar a `/home`, resuelve el fallback a la cuenta personal, y contiene el disparador automático de consolidación del onboarding.
- **Creación de organización y switcher multi-tenant**: `/organization/create` + `AccountSwitcher` en el header, con inserción local (`addAccount`/`setActiveAccount`) sin refetch extra al crear una organización — ver sección 3.3.
- **Onboarding con `isConfigured`/`personalConfigured`/`signatureConfigured`**: banner bloqueante en `/home`, mutación aislada por mini-flujo, disparador automático de `PATCH /me/status` — ver sección 3.2.
- **Fix de build en producción**: `next build` fallaba prerenderizando cualquier página (`TypeError: Cannot read properties of undefined (reading 'hasHydrated')`) porque `createJSONStorage(() => localStorage)` se evalúa de forma inmediata al crear el store, y `localStorage` no existe en el entorno de build de Next.js (Node). Se corrigió con un storage no-op condicional a `typeof window !== 'undefined'` — este bug ya existía en el store viejo, simplemente nadie había corrido `next build` hasta que apareció en CI.

### Resuelto en esta ronda
- **Tests automatizados con Jest + React Testing Library**: configurado vía `next/jest` (`jest.config.mjs`) + `jest-dom` + `@testing-library/user-event`. `test-utils.tsx` centraliza un `renderWithProviders()` con `QueryClientProvider` de prueba. 27 tests en 8 suites cubriendo: schemas Zod (`loginSchema`, `registerSchema` incluyendo el RFC nuevo, `selectParticipantsSchema`, `rejectDocumentSchema`), `LoginForm` (validación, envío, estado de carga), `SignupForm` (validación del RFC, envío completo), `SignDocumentView` (firmar, rechazar con motivo, mensaje de "no es tu turno", solicitar y confirmar cancelación) y `CreateDocumentView` (botón deshabilitado sin archivo/firmante, envío con archivo + firmante seleccionado, mensaje de error del backend). Los hooks de datos (`useLogin`, `useRegister`, `useSignDocument`, etc.) se mockean en los tests de componente — no se prueban por separado los mismos hooks todavía.
- **RFC en el registro**: `SignupForm` (`/signup`) agrega el campo "RFC" (12-13 caracteres alfanuméricos, mismo patrón que el mock viejo usaba para validar el campo homónimo). `registerSchema` lo valida y `useRegister` lo envía tal cual al `POST /auth/register`, que ahora lo exige. El backend rechaza (`409`) un RFC duplicado igual que ya hacía con el CURP — el manejo de error en `SignupForm` no cambió (ya mostraba el mensaje genérico del backend vía toast + inline).
- **CURP ahora también es constraint de base de datos** en el backend (antes solo se validaba a nivel de aplicación) — no requirió ningún cambio en este proyecto, el contrato de la API (`409` en duplicado) sigue siendo el mismo.

### Resuelto recientemente
- **Flujo de documentos duplicado**: el prototipo en memoria de `/dashboard` (`DocumentUploadFlow`/`DocumentPrepareModal`/`SignerFormCard`/`SpectatorFormCard`/`DocumentPreviewPane`) fue eliminado. `/dashboard` ahora renderiza el mismo `CreateDocumentView` real que `/documents/create` (mismos hooks, mismo `lib/api`, misma validación Zod de `documents/create/_schemas.ts`).
- **Duplicados en la creación de documentos**: el backend ahora rechaza (`400`) seleccionar al mismo usuario dos veces entre firmantes/espectadores, y rechaza crear un documento con el mismo nombre de archivo que otro documento propio en estatus `CREATED`/`PENDING` (`DocumentService.create`).
- **Edición de información personal**: `/personal-documents` (`UserInfoCard`) permite editar `phoneNumber` y `secondaryEmail` vía `PUT /api/v1/users/me/personal-information`. `name`, `lastName`, `curp` y `rfc` son campos de identidad y **no son editables por diseño**: el backend los quitó de `UpdatePersonalInformationDto` (no solo el frontend deja de mandarlos, el endpoint los rechaza si algún otro cliente los envía). El CURP tampoco es editable vía `PATCH /user/:id` (se quitó de `UpdateUserDto`) — se fija una sola vez al crear/registrar el usuario.
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
- **Flujo de cancelación de documentos**: `SignDocumentView` ahora expone "Solicitar cancelación" (creador, documento `SIGNED`) y "Confirmar cancelación" (cualquier firmante, documento `CANCELLATION_PENDING`) usando los nuevos flags `canRequestCancellation`/`canConfirmCancellation` del backend, con `CancellationConfirmDialog` en vez de `window.confirm`. `DocumentsTable` gana un botón "Ver detalle" (`onViewDetail`) para navegar a `/documents/:id` desde cualquier tab cuando el documento está firmado, en cancelación pendiente o cancelado — antes no había forma de llegar a esa pantalla salvo para documentos pendientes de firma.

### Ideas descartadas junto con el prototipo del dashboard
El prototipo mock incluía UI para "recordatorios" (frecuencia de reenvío), "mensaje para participantes" y "fecha de expiración" del documento. Ninguna tiene respaldo en el backend actual (no hay campos ni jobs para esto), así que se descartaron junto con el resto del mock. Si el producto las requiere, hay que diseñarlas end-to-end (entidad/DTO en `signature-server`, job de recordatorios, UI) desde cero — no es simplemente "reconectar" código existente.
