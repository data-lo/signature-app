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
| Drag and drop | `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` | Colocación de firmas sobre el PDF (`SignaturePageDropZone`/`SignatureBox`) y reordenamiento de firmantes (`SortableCollaboratorItem`) en `documents/create` |
| OTP | `input-otp` | `components/ui/input-otp.tsx`, usado en `/signup/verify` y el wizard de `/forgot-password` |

`next.config.ts`: `output: 'standalone'` (Dockerfile multi-stage) + alias que desactiva `canvas` (pdf.js lo intenta resolver en Node, no aplica en navegador).

> ⚠️ **Bug crítico activo, ya documentado dos veces como "resuelto" en la sección 9 y aparentemente recurrente por tercera vez**: `lib/axios.ts` tiene hoy `baseURL: '/api'` (hardcodeado, no lee `NEXT_PUBLIC_API_BASE_URL`) y `next.config.ts` vuelve a traer un bloque `rewrites()` que reenvía `/api/:path*` a `${process.env.BACKEND_API_URL || 'http://backend:3000'}/:path*` — `BACKEND_API_URL` no está definida en `.env.local`, y `backend:3000` solo resuelve dentro de la red de Docker Compose, no en `next dev` local. El test dedicado a esta regresión (`lib/axios.spec.ts`) está fallando ahora mismo (`npm run test` → 1 suite roja). Si esto no fue un cambio intencional (p. ej. para probar contra un `docker-compose` con el frontend containerizado), es el mismo bug crítico de siempre: ninguna llamada real del navegador llega al backend. Ver sección 9, entradas "bug crítico: el frontend no llegaba al backend", para el fix ya aplicado dos veces antes.

### Middleware de autenticación (`middleware.ts`)

Reescrito desde la versión que protegía por lista simple. Ahora:
- **Rutas públicas** (`AUTH_ROUTES`): `/login`, `/signup`, `/signup/verify`, `/forgot-password`. **`/error` ya no está excluida** — sin token, un request a `/error` redirige a `/login`. Tampoco existe ya una landing pública en `/` (ver sección 4, hallazgo) — no hay `app/page.tsx`, así que la ruta ni siquiera tiene qué renderizar.
- **Redirects legacy (308, permanentes)**: cualquier URL bajo los prefijos viejos `/home`, `/documents`, `/organization`, `/dashboard/personal-documents`, `/plans` (la estructura que describía este README antes de esta ronda) se redirige a su equivalente bajo `/dashboard/*` — evidencia de que el prefijo `/dashboard` fue una migración real, no un rediseño desde cero.
- El `matcher` excluye `api`, `_next/static`, `_next/image`, `favicon.ico`, `public/` y extensiones de imagen — a propósito para que `/public/documents/:id` (visor público de documentos firmados, ver sección 4) nunca pase por el guard de sesión.
- Lee la cookie `token`, **decodifica el payload del JWT sin verificar la firma** (solo para chequear `exp`) y redirige a `/login` si no existe o expiró. No refresca el token — es una optimización de UX para evitar flashes de contenido protegido; la validación de seguridad real ocurre en el backend en cada request.
- Login exitoso redirige a `/dashboard/documents/create` (antes `/documents/create`).

---

## 2. Proceso de firmado de documentos (desde la UI)

> El backend distingue entre la **credencial de firma** del usuario (rúbrica + INE, se registra una vez) y el **acto de firmar un documento concreto**. En el frontend esto se refleja en dos secciones separadas: `/dashboard/personal-documents` (credencial) y `/dashboard/documents/*` (documentos a firmar).

### Paso 1 — Registrar la credencial de firma (`/dashboard/personal-documents`)

Antes de poder firmar cualquier documento, el usuario debe subir su rúbrica (PNG) e identificación oficial (PDF/JPG/PNG). La pantalla se adapta según el estado actual:
- **Sin nada subido** → formulario que sube ambos archivos juntos (`PUT /api/v1/users/me/signature`).
- **Falta uno de los dos** → formulario para completar el que falta (`PATCH /signature/:id`) + opción de eliminar el existente.
- **Ambos completos** → solo visualización + opción de eliminar cada archivo (`DELETE /signature/:id/official-file` o `/signature-image`).

### Paso 2 — Crear un documento y enviarlo a firma (`/dashboard/documents/create`)

Rediseñado por completo respecto al flujo original de `ParticipantPicker` (ver sección 9 para el detalle histórico del cambio) — hoy es un solo formulario con colaboradores de datos libres, no un picker de usuarios existentes.

`CreateDocumentView` es solo composición: monta las secciones y les reparte el estado que producen los hooks especializados. **Ninguna sección decide por su cuenta si otra está habilitada** — eso lo resuelve `_section-rules.ts` (función pura, testeada) y cada sección recibe su `SectionState` (`isEnabled`/`isLoading`/`hasError`/`errorMessage`/`missingRequirementMessage`).

**Las tres primeras secciones viven en acordeones independientes** (`components/ui/accordion.tsx`, sobre `@base-ui/react`, con `multiple` activado): arrancan abiertas, se contraen y se vuelven a abrir en cualquier orden, y **ninguna se bloquea por el estado de otra**. El encabezado de cada una muestra su número de paso, una palomita verde cuando ya está configurada y —solo mientras está contraída— el resumen de lo que contiene. Qué está completo, qué dice cada encabezado contraído y qué muestra el resumen lo decide `_section-progress.ts` (función pura, testeada), separada de `_section-rules.ts`: aquella responde "¿esta sección se puede usar?" y esta "¿ya está configurada?".

Debajo de los acordeones, fijos: el **resumen de la solicitud** (`DocumentRequestSummary` — documento, páginas, tipo de firma, firmantes y espectadores, con "Pendiente" en lo que falte) y el botón **"Firmar"**, que se habilita solo con las tres secciones completas (PDF cargado, tipo de firma elegido y al menos un firmante) y ejecuta el mismo envío de siempre. El conteo de páginas no vuelve a leer el PDF: lo publica el visor de ubicación de firmas, que es quien ya lo tiene parseado.

| Sección | Qué hace | Regla de activación |
|---|---|---|
| `DocumentUploadSection` (acordeón 1, "Cargar documento") | Selección del PDF (`DocumentFilePicker` → `FormFileUpload`, valida `application/pdf` ≤20MB) | Siempre habilitada: es el punto de entrada. Reporta "procesando" mientras FilePond lee el archivo |
| `DocumentConfigurationSection` (acordeón 2, "Configurar firma") | `SignatureTypeField` (obligatorio), `RequiresApprovalField` (solo cuentas ORGANIZATION) y `RequiresOrderField` (solo con >2 firmantes) | Siempre habilitada: no depende del PDF; las restricciones son de campo, con su propio contexto |
| `DocumentParticipantsSection` (acordeón 3, "Añadir participantes") | `CollaboratorsFieldArray`/`CollaboratorFormItem` (`useFieldArray`) + `IncludeMeAsSignerField`. Cada colaborador se captura como datos libres (nombre/apellido/email/RFC), con `collaboratorType` `SIGNER`/`VIEWER`; un SIGNER `ADVANCED` exige RFC y puede requerir 2FA, SIMPLE siempre fuerza 2FA. `SortableCollaboratorItem` (`@dnd-kit`) reordena firmantes cuando "Requiere firmas en orden" está activo — define el `signingOrder` | Siempre habilitada; muestra el error general "agrega al menos un firmante" (el único que no pertenece a un campo) |
| `DocumentSignaturePlacementSection` | `SignaturePlacementField`/`SignaturePageDropZone`/`SignatureBox` (`@dnd-kit`, `lib/signature-geometry.ts`): coloca por arrastre la posición de cada firma sobre el PDF | **Requisito duro**: un PDF completamente cargado. Sin él se muestra deshabilitada explicando qué falta |
| `CreatedDocumentsSection` | Documentos que el usuario ya envió a firma (`GET /document?email=...`) | Solo cuando `showCreatedDocuments`; esta lista también vive en su propia ruta, `/dashboard/documents/sent` ("Enviados para firma") |

La lógica vive fuera de los componentes:

- `_hooks/useDocumentFileSelection` — el PDF, su estado de carga y su número de páginas (fuera de react-hook-form: lo gobierna FilePond).
- `_hooks/useCreateDocumentForm` — formulario, validación, composición de colaboradores y limpieza tras el envío; expone `currentUserQuery` y `createDocumentSignaturesMutation` como instancias con nombre.
- `_hooks/useCreatedDocuments` — paginación, filtros, consulta del listado y publicación del conteo global.
- `_mappers/` — `buildSubmissionCollaborators` (agrega al usuario en sesión si marcó "Incluirme como firmante") y `toCollaboratorPayloads`/`computeRequiresDifferentSignatures` (traducción al payload del backend).

Al enviar, `useCreateDocumentSignatures` hace **una sola llamada multipart**: `POST /api/v1/documents/signatures` (archivo + `documentData` + `collaborators` + `requiresDifferentSignatures`, todo serializado como JSON dentro de campos de texto) — ya no son dos llamadas encadenadas (`POST /document` + `submit-for-authorization`). Al terminar, invalida `['myDocuments']` y limpia el formulario y el widget de carga.

### Paso 3 — Firmar o rechazar (`/dashboard/documents/[documentId]`)

1. `SignDocumentView` carga el detalle (`GET /document/:id`): PDF (`secureUrl`), lista de colaboradores con su estado, y los flags `canSign`/`canReject`/`canRequestCancellation`/`canConfirmCancellation`/`myRole`/`myStatus` que calcula el backend según el turno y rol del usuario.
2. El PDF se muestra con `PdfPreview`. Los colaboradores se listan con su estado (verde=firmado, rojo=rechazado, ámbar=pendiente).
3. Si el documento exige verificación (`requiresVerification`/2FA), `useRequestVerificationCode`/`useVerifyCode` corren un paso previo (`POST /document/:id/verification-codes` + `/verify`) antes de habilitar la firma.
4. Si `canSign` es `true`, el botón **"Continuar a firmar"** llama `PATCH /document/:id/sign` — la firma visual se compone en el backend a partir de la credencial guardada en el paso 1 y la posición elegida en el paso 2.
5. "Rechazar documento" abre un textarea de motivo (mínimo 5 caracteres) y llama `PATCH /document/:id/reject`.
6. Si no es el turno del usuario, o ya actuó, se muestra un mensaje contextual en vez de los botones de acción.
7. **Cancelación** (misma pantalla): "Solicitar cancelación" (`canRequestCancellation`, el creador con el documento `SIGNED`) llama `PATCH /document/:id/submit-for-cancellation`; "Confirmar cancelación" (`canConfirmCancellation`, cualquier firmante con el documento en `CANCELLATION_PENDING`) llama `PATCH /document/:id/confirm-cancellation`. Ambos usan `CancellationConfirmDialog` (no `window.confirm`).

### Paso 3.5 — Vincular cuenta desde el correo (`/access-document`) y ver un documento firmado sin sesión (`/public/documents/[id]`)

- **`/access-document`**: entry point del link que llega por correo a un colaborador invitado solo por email (sin `userId`/cuenta todavía). Guarda el contexto (`docId`/`collabId`/`email`) en `localStorage` (`lib/pending-signature-context.ts`) y, si hay sesión activa, llama `PATCH /document/:id/link-collaborator` para vincular al colaborador con la cuenta ya logueada; si no hay sesión, redirige a `/login` (o registro) y retoma el contexto guardado después.
- **`/public/documents/[id]`** (route group `(public)`, fuera del middleware de auth): visor de solo lectura del PDF final vía `GET /document/public/:id` — solo responde si el documento está `SIGNED`, sin JWT.

### Paso 4 — Consultar documentos (`/dashboard/documents/to-sign`, `/sent`, `/completed`)

Cada sección del módulo tiene su propia ruta y su propio `page.tsx`, pero **una sola vista compartida**: `DocumentsView` (`documents/_components/DocumentsView.tsx`), que recibe el `type` de la sección y saca de él la consulta y las acciones visibles. Tabla, filtros, paginación y estados visuales no se duplican por sección.

| Ruta | `type` | Consulta | Breadcrumb |
|---|---|---|---|
| `/dashboard/documents/create` | — (vista propia) | — | Documentos / Nuevo documento |
| `/dashboard/documents/to-sign` | `to-sign` | `GET /document?participantEmail=…&status=pending` | Documentos / Por firmar |
| `/dashboard/documents/sent` | `sent` | `GET /document?email=…` | Documentos / Enviados para firma |
| `/dashboard/documents/completed` | `completed` | `GET /document?participantEmail=…&status=signed` | Documentos / Completados |

Nombres, rutas, iconos y la configuración de consulta de cada sección viven en **`documents/_config/sections.ts`** (`DOCUMENTS_SECTIONS`, `DOCUMENTS_NAV_SECTIONS`, `DOCUMENTS_LIST_CONFIG`), la fuente única que consumen `AppSidebar`, `DashboardBreadcrumbs` y los `page.tsx` — el nombre del sidebar y el del breadcrumb no pueden divergir. "Documentos" es solo un **agrupador**: no tiene página propia y se muestra sin enlace en el breadcrumb; el último nivel es siempre la página actual y no es interactivo.

Todas las secciones ofrecen filtros por nombre, participante, estado y fechas (y un toggle "solo mi turno" en las secciones de participante).

**Estructura de la tabla (idéntica en las tres secciones, `DocumentsTable`):**

| Columna | Contenido |
|---|---|
| Documento | Nombre del archivo, con el punto de color del estatus cuando aplica (único encabezado con indicador de orden) |
| Creado por | Nombre de quien lo creó y, debajo en gris claro, `RFC: …` (`creatorRfc`; la línea completa se omite si aún no lo registró) |
| Fecha de creación | Fecha legible y contextual — "Domingo 15 de marzo, 11:55 PM" (`lib/format-datetime.ts`) |
| Tipo de firma | `Simple` o `E.Firma` (`signatureType` del listado). Un guion cuando el documento no lo tiene registrado — los creados por el endpoint antiguo `POST /document` nunca asignaron tipo, y suponer "Simple" sería inventar |
| Estado de firma | Estatus actual del documento |
| Acciones | Botón de tres puntos por fila (`DocumentRowActions`) |

La tabla va dentro de una tarjeta con borde redondeado y encabezado gris; `components/ui/table.tsx` se deja intacto porque también lo consume `MembersTable`.

Las acciones por documento se concentran en ese menú, con ícono y texto, y son **exactamente tres en todos los estatus**: **Descargar** (misma `useDownloadDocument` de siempre), **Ver detalle** (navega a `/dashboard/documents/:id`, donde `SignDocumentView` decide qué mostrar según los flags de arriba) y **Compartir**. La única acción que conserva botón propio es **FIRMAR**, por ser la acción primaria de "Por firmar" — el diseño lo contempla explícitamente ("si una acción es la más frecuente, puede conservarse como botón visible y el resto ir en ⋯").

**Compartir** (`ShareDocumentDialog`) no llama al backend: arma el enlace del visor público a partir del id (`lib/document-public-url.ts` → `<origin>/public/documents/:id`, la única vista consultable sin sesión), lo muestra en un campo de solo lectura y lo copia al portapapeles con confirmación "Enlace copiado". El origen sale de `window.location.origin` porque el frontend no publica ninguna base URL propia al cliente. Qué se ve al abrir el enlace lo sigue decidiendo el backend según el estatus (`GET /document/public/:id`).

**Rutas anteriores (solo redirigen, para no romper bookmarks):** `/dashboard/documents` → `/dashboard/documents/to-sign` (o `/completed` si traía `?status=signed`, que era como se distinguían ambas secciones antes) y `/dashboard/documents/created` → `/dashboard/documents/sent` (308).

> `/dashboard` (primer punto de entrada tras login) hace `redirect()` a `/dashboard/documents/create` — ya no renderiza contenido propio.

---

## 3. Autenticación, onboarding y multi-tenancy (Zustand)

### 3.1 Login, registro y aterrizaje en `/dashboard/documents/create`

`POST /auth/login` guarda el JWT en cookie (`setAuthToken`) y redirige a `/dashboard/documents/create` — la ruta por defecto del dashboard (`/dashboard` a secas hace `redirect()` a esta misma ruta). El store (`useAuthStore`) **no** se llena en ese momento — `AuthProvider` (`app/dashboard/_components/AuthProvider.tsx`, envuelve todo el prefijo `/dashboard`, ver `app/dashboard/layout.tsx`) es quien lo hidrata al montar, leyendo `GET /api/v1/users/me` (perfil cacheado en Redis por CURP) y `GET /api/v1/accounts/me` (catálogo de cuentas). Si es la primera vez que el usuario entra (no hay `activeAccount` persistido) — o si el `activeAccount` persistido ya no aparece en el catálogo fresco (acceso revocado, organización eliminada) —, `AuthProvider` cae automáticamente a la cuenta de tipo `PERSONAL` del catálogo.

**Registro con OTP** (`/signup` → `/signup/verify`): a diferencia de lo anterior, el registro ya no deja al usuario autenticado de inmediato — `POST /auth/register` crea una pre-cuenta (`isEmailVerified: false`) y envía un código; `/signup/verify` (`VerifyOtpForm`) lo confirma y recién ahí autentica. **Recuperación de contraseña** (`/forgot-password`, `ForgotPasswordWizard`): wizard de 3 pasos sin cambiar de URL (email → OTP → nueva contraseña), contra `POST /auth/forgot-password` / `/auth/verify-reset-code` / `/auth/reset-password`.

### 3.2 Onboarding (`personalConfigured` / `signatureConfigured`)

`OnboardingBanner` (en `/dashboard/documents/create`, montado por `CreateDocumentGuard`) lee `user.personalConfigured`/`user.signatureConfigured` del store y bloquea con **"Es requerido configurar tu usuario"** mientras cualquiera de las dos sea `false`, con accesos independientes a `/dashboard/personal-documents` para completar cada una.

**Estas dos banderas ya no vienen tal cual del backend** — `auth.slice.ts` las deriva en el propio frontend: `personalConfigured = !!user.phoneNumber && !!user.secondaryEmail`, `signatureConfigured = user.signatureId != null` (`derivePersonalConfigured`/`deriveSignatureConfigured`).

Cada mini-flujo muta **solo su propia bandera**, sin esperar a un refetch:
- `useUpdatePersonalInformation` (`PUT /api/v1/users/me/personal-information`) → al éxito, `updateOnboardingStatus('personal', true)`.
- `useUploadPersonalDocuments` (`PUT /api/v1/users/me/signature`) → al éxito, `updateOnboardingStatus('signature', true)`.

`AuthProvider` se suscribe (`useAuthStore.subscribe`) y, en cuanto ambas banderas quedan en `true` (y el usuario aún no está `isConfigured`), dispara automáticamente `PATCH /api/v1/users/me/status` (`usePatchUserStatus`) y al éxito llama `markConsolidated()` — el banner desaparece de inmediato porque ya se cumplió la condición local, sin esperar la respuesta del PATCH.

### 3.3 Organizaciones y el switcher de cuentas (multi-tenant)

`/dashboard/organization/create` (`CreateOrganizationForm` + `useCreateOrganization`) llama `POST /api/v1/organizations`. Al éxito, **sin ninguna petición extra a la red**: `addAccount(account)` inserta la cuenta nueva en `accountsList` y `setActiveAccount(...)` la vuelve el tenant activo de inmediato; luego toast de éxito y redirección a `/dashboard/documents/create`.

`AccountSwitcher` (en el footer del sidebar, `app/_components/AccountSwitcher.tsx`, ver sección 4) lee `accountsList`/`activeAccount` **directamente del store** — no vuelve a pedir el catálogo por su cuenta; `AuthProvider` ya lo carga una sola vez para toda la app autenticada. `logout()` (`auth.slice.ts`) limpia también `accountsList`/`activeAccount`, no solo `authToken`/`user` — evita que una sesión nueva en la misma pestaña herede el tenant de la sesión anterior.

`lib/axios.ts` inyecta en cada request `X-Account-Id` (si hay `activeAccount`) y `X-Organization-Id` (solo si `activeAccount.accountType === 'ORGANIZATION'`). El backend ya lee y valida `X-Account-Id` para `POST /document`/`GET /document` (documentos scopeados por la cuenta activa) y para todo el módulo `organizations`/`account-member` (ver README de `signature-server`) — el resto de los endpoints de documento (detalle, firma/rechazo/cancelación) todavía no lo leen. `X-Organization-Id` no lo lee ningún endpoint del backend todavía (ver Pendientes).

**Gestión de miembros y permisos de la organización activa** (`/dashboard/organization/settings/`, accesible solo si `activeAccount.accountType === 'ORGANIZATION'`): un `layout.tsx` propio con tabs "Miembros"/"Permisos" envuelve dos rutas —
- **`members/`** (`MembersView`): tabla de miembros (correo/RFC/rol/fecha de ingreso) con menú de acciones ("Editar Rol"/"Eliminar"/"Configurar permisos" vía `ConfigureMemberPermissionsModal`), gateada por `useIsOrganizationAdmin()`.
- **`permissions/`** (`PermissionsView`): catálogo de "permisos" **administrativos de la organización** (`OrganizationPermissionEntity`/`AccountPermissionEntity` en el backend) — nombres libres definidos por el ADMIN (p. ej. "puede aprobar gastos") que **no otorgan ningún acceso técnico real**; son un sistema deliberadamente paralelo al RBAC (`roles`/`role_permissions`) que sí gobierna la autorización de cada endpoint (ver README de `signature-server`). `PermissionsTable` + `CreatePermissionModal`/`EditPermissionModal`/`DeletePermissionDialog`, hooks en `_hooks/` (`useCreateOrganizationPermission`/`useUpdateOrganizationPermission`/`useDeleteOrganizationPermission`) contra `lib/api/organization-permissions.ts`. La asignación por miembro (`ConfigureMemberPermissionsModal`, en la pestaña Miembros) comparte el hook `useOrganizationPermissions` (vive en `lib/hooks/`, no en `_hooks/` de una sola ruta, porque lo consumen ambas pestañas) y usa `useMemberPermissions`/`useUpdateMemberPermissions` para leer/reemplazar (`GET`/`PATCH /api/v1/organizations/members/:accountId/permissions`) la lista de permisos de un miembro.

**Invitar miembros a la organización activa** (`/dashboard/documents/create`, `InviteMemberModal` — solo se renderiza si `activeAccount.accountType === 'ORGANIZATION'`): al abrir el modal, `useSystemRoles()` consulta `GET /api/v1/roles` (deshabilitada hasta que el modal está abierto) para poblar el `Select` de rol. Al enviar, `useInviteMember()` llama `POST /api/v1/organizations/invite` (`{email, roleId}`) y cierra el modal al éxito. **Ya no es un alcance delimitado que solo valida**: el backend hoy persiste la invitación (`OrganizationInvitationEntity`), publica el evento en Kafka y envía el correo real con el link a `/join` — ver README de `signature-server`, este README quedó desactualizado en ese punto hasta esta ronda.

### 3.4 Store global (`useAuthStore`) — Slices Pattern

El store vive en `lib/store/` partido en 3 slices + un archivo de tipos, unidos en un solo hook:

| Archivo | Responsabilidad |
|---|---|
| `types/auth-store.types.ts` | Tipos centrales: `AuthUser` (con `personalConfigured`/`signatureConfigured` anidados), `AccountListEntry`, `ActiveAccount`, `AccountKind` (`'PERSONAL' \| 'ORGANIZATION'`), `AccountStatus` (`'ACTIVE' \| 'INACTIVE'`), `AuthState = AuthSlice & AccountsListSlice & ActiveAccountSlice` |
| `auth.slice.ts` | `authToken`, `user`, `setAuth(token, profile)`, `updateOnboardingStatus(step, value)`, `logout()`, más `consolidationInFlight`/`markConsolidating`/`markConsolidated` (guard interno para el disparador automático, no forma parte del contrato "de negocio" del store) |
| `accounts-list.slice.ts` | `accountsList`, `setAccountsList(accounts)` (reemplaza todo el catálogo), `addAccount(account)` (inserta una sola cuenta sin refetch), y el mapper `toAccountListEntry` que normaliza la `Account` cruda del backend (`type`→`accountType`, deriva `organizationId`, `organizationName` desde `organizationDetail.name`) |
| `active-account.slice.ts` | `activeAccount`, `setActiveAccount(account)` — se queda solo con `{id, accountType, organizationId, roleId}`, ignorando cualquier campo extra del objeto que reciba |
| `useAuthStore.ts` | Une los 3 slices con `create()(persist(...))`. Solo `activeAccount` se persiste en `localStorage` (el JWT sigue viviendo únicamente en la cookie, para no duplicarlo en un storage más expuesto a XSS; `user` se recarga siempre fresco desde `/users/me`) |

Un detalle de implementación no obvio, ya resuelto (ver Pendientes por si genera dudas al tocar el store):
- **SSR**: Next.js evalúa este store también en el servidor, donde no existe `localStorage`. `createJSONStorage` usa un storage no-op cuando `typeof window === 'undefined'`, y el store se crea con `skipHydration: true` — la rehidratación real ocurre en un efecto de `AuthProvider` (`useAuthStore.persist.rehydrate()`), gateada por `useAuthStore.persist.hasHydrated()` para no pisar una cuenta activa persistida con el fallback a la cuenta personal.

`roleId`/`status` en `accountsList` (`roleId: string | null`, `status: 'ACTIVE' | 'INACTIVE'`) ya reflejan el rol/vigencia real de la membresía — `toAccountListEntry` los mapea 1:1 desde `roleId`/`isActive` del backend, que ahora es una FK real al catálogo RBAC (`GET /api/v1/roles` en `signature-server`), no un enum-array (ver Pendientes → Resuelto más abajo).

---

## 4. Estructura de rutas (App Router)

> ⚠️ **Ya no existe una landing pública en `/`**: no hay `app/page.tsx`. `app/layout.tsx` trae metadata de "Visualizador de documentos" en vez de branding de landing, y `/join`/`/signup/verify` todavía enlazan `<Link href="/">` a una ruta sin página. El middleware (sección 1) tampoco excluye ya `/` del guard de sesión. No quedó claro en esta auditoría si fue intencional (¿la landing se movió a `signature-site`, el otro proyecto del monorepo?) o una regresión — vale confirmarlo con el equipo antes de decidir si hay que restaurar `app/page.tsx`.

El prefijo `/documents`, `/organization`, `/personal-documents`, `/plans`, `/home` (route group `(app)`) que describía este README se migró por completo a un prefijo único `/dashboard/*`, con redirects 308 automáticos desde las rutas viejas (ver `middleware.ts`, sección 1). Árbol real:

```
app/
├── layout.tsx / providers.tsx    → layout raíz (QueryClientProvider + ThemeProvider + Toaster); metadata "Visualizador de documentos"
├── error/page.tsx                → "/error" — pantalla de error genérica (?code=&message=)
├── login/                        → "/login" (LoginForm, useLogin → POST /auth/login)
├── signup/
│   ├── page.tsx                   → "/signup" (SignupForm, useRegister → POST /auth/register; acepta ?rfc=&token= desde /join)
│   └── verify/page.tsx            → "/signup/verify" — VerifyOtpForm, confirma el OTP de registro
├── forgot-password/              → "/forgot-password" — ForgotPasswordWizard, 3 pasos sin cambiar de URL (email → OTP → nueva contraseña)
├── join/                         → "/join" — aceptar invitación a una organización (JoinView/JoinExistingUser/RfcForm)
├── access-document/              → "/access-document" — entry point del link de correo de firma; vincula el colaborador a la sesión activa o redirige a /login
├── (public)/public/documents/[id]/ → "/public/documents/:id" — visor de PDF firmado sin sesión (GET /document/public/:id), fuera del middleware de auth
├── _components/
│   ├── AppSidebar.tsx             → navegación del dashboard (reemplaza al viejo DashboardNavbar) + AccountSwitcher en el footer
│   ├── AccountSwitcher.tsx
│   └── DocumentsCountContext.tsx
└── dashboard/                    → prefijo real de todo lo autenticado (ya no es el route group "(app)")
    ├── layout.tsx                 → AuthProvider (hidrata useAuthStore) + DocumentsCountProvider + SidebarProvider + AppSidebar
    ├── page.tsx                    → "/dashboard" → redirect() a /dashboard/documents/create
    ├── _components/AuthProvider.tsx
    ├── organization/
    │   ├── create/                 → "/dashboard/organization/create" — CreateOrganizationForm → POST /api/v1/organizations
    │   └── settings/
    │       ├── layout.tsx           → tabs "Miembros"/"Permisos"
    │       ├── members/             → "/dashboard/organization/settings/members" — MembersView/MembersTable/EditRoleModal/RemoveMemberDialog/ConfigureMemberPermissionsModal
    │       └── permissions/         → "/dashboard/organization/settings/permissions" — PermissionsView, catálogo de permisos administrativos de la organización (ver sección 3.3)
    ├── documents/
    │   ├── _config/sections.ts      → fuente única de nombres/rutas/consulta de cada sección (la usan AppSidebar, DashboardBreadcrumbs y los page.tsx)
    │   ├── _components/DocumentsView.tsx → vista compartida de listado (tabla + filtros + paginación); las secciones solo varían por `type`
    │   ├── page.tsx                 → "/dashboard/documents" — ruta anterior: redirect a /to-sign (o /completed con ?status=signed)
    │   ├── create/                  → "/dashboard/documents/create" — ruta por defecto del dashboard: CreateDocumentGuard monta OnboardingBanner + InviteMemberModal (solo con Org activa) + el flujo real de creación (colaboradores libres + colocación de firma por drag&drop) ⭐
    │   ├── to-sign/                 → "/dashboard/documents/to-sign" — "Por firmar": DocumentsView type="to-sign" (GET /document?participantEmail=…&status=pending)
    │   ├── sent/                    → "/dashboard/documents/sent" — "Enviados para firma": DocumentsView type="sent" (GET /document?email=…)
    │   ├── completed/               → "/dashboard/documents/completed" — "Completados": DocumentsView type="completed" (GET /document?participantEmail=…&status=signed)
    │   ├── created/                 → ruta anterior de "Enviados para firma": solo redirect (308) a /dashboard/documents/sent
    │   └── [documentId]/            → "/dashboard/documents/:id" — pantalla de firma real (SignDocumentView) ⭐
    ├── personal-documents/          → "/dashboard/personal-documents" — credencial de firma (signature/INE) + datos de contacto del onboarding
    └── plans/                       → "/dashboard/plans", "/dashboard/plans/success", "/dashboard/plans/cancel" — suscripciones Stripe
```

Cada ruta con lógica propia trae sus propias carpetas privadas (no forman parte del routing, prefijo `_`):

| Carpeta | Contenido |
|---|---|
| `_components/` | Componentes de presentación específicos de esa ruta (los que representan una sección completa de la pantalla usan el sufijo `Section`) |
| `_hooks/` | Hooks de React Query o de estado, un archivo por operación (`useCreateDocumentSignatures.ts`, `useSignDocument.ts`, ...) |
| `_requests.ts` | Funciones de acceso a la API específicas de esa ruta |
| `_schemas.ts` | Esquemas Zod + tipos inferidos para los formularios de esa ruta (una carpeta `_schemas/` con un archivo por sección + `index.ts` cuando la pantalla tiene varias — ver `documents/create`) |
| `_interfaces/` | Contratos de datos que no son del formulario: `*.request.interface.ts`, `*.response.interface.ts`, entidades. Una interfaz explícita por respuesta con estructura propia, sin `any` ni genéricos anónimos declarados en línea |
| `_mappers/` | Traducción entre los valores del formulario y los payloads del backend (`*.mapper.ts`), fuera de los componentes y de los esquemas |
| `_config/` | Configuración declarativa de campos y restricciones (`*.config.ts`), para no repetir la misma definición en cada campo |

`lib/api/` centraliza la capa de API de todo lo que no es exclusivo de una sola ruta o que consumen varias rutas a la vez (`auth`, `accounts`, `roles`, `plans`, `users`, `organization-invitations`, `organization-members`, `organization-permissions`); el resto (creación/detalle/firma de documentos, personal-documents, forgot-password) vive co-localizado junto a su ruta (ver sección 5). `lib/hooks/` (sin prefijo `_`, a propósito) reúne hooks de React Query compartidos entre rutas distintas (p. ej. `useOrganizationPermissions`, consumido tanto por `organization/settings/members` como por `organization/settings/permissions`).

---

## 5. Integración con el backend

### Cliente HTTP (`lib/axios.ts`)

- **Estado actual (confirmado en código, ver aviso en la sección 1): `baseURL: '/api'` hardcodeado**, no `NEXT_PUBLIC_API_BASE_URL`. Documentado aquí como está, no como debería estar — este README ya narró este mismo bug crítico como "resuelto" dos veces (ver sección 9); si en el momento de leer esto sigue así, es una tercera recurrencia real, confírmalo corriendo `npm run test -- axios` (el spec dedicado a esto está fallando en esta auditoría).
- Interceptor de request: agrega `Authorization: Bearer <token>` leyendo la cookie.
- Interceptor de response: loggea cada llamada (`console.log('[API Success]', ...)` / `console.error('[API Error]', ...)`, no documentado antes, revisar si debe ir a producción) y, si `401`, limpia la cookie y fuerza redirección a `/login`. No hay refresh token.
- `next.config.ts` trae un bloque `rewrites()` que reenvía `/api/:path*` a `${process.env.BACKEND_API_URL || 'http://backend:3000'}/:path*` — coherente con el `baseURL: '/api'` de arriba, pero `BACKEND_API_URL` no está definida en `.env.local` y `backend:3000` solo resuelve dentro de la red de Docker Compose.

### Sesión (`lib/cookies.ts`, `lib/auth.ts`)

Cookie `token` (1 día, `sameSite: 'lax'`, `secure` solo en producción). `logout()` llama `POST /auth/logout` y siempre limpia la cookie localmente en el `finally`, incluso si la llamada falla.

### Funciones de API por módulo

**`lib/api/auth.ts`**

| Función | Endpoint |
|---|---|
| `getCurrentUserRequest` | `GET /auth/me` (perfil completo, incluye URLs prefirmadas de firma/INE; usado por `/dashboard/personal-documents`) |
| `getOnboardingProfileRequest` | `GET /api/v1/users/me` (snapshot cacheado en Redis por CURP; usado por `AuthProvider` para hidratar `useAuthStore`) |

*(`loginRequest` y `registerRequest` viven en `app/login/_requests.ts` y `app/signup/_requests.ts` respectivamente, no en `lib/api/` — inconsistencia menor de ubicación.)*

**`lib/api/accounts.ts`**

| Función | Endpoint |
|---|---|
| `getAccountsCatalogRequest` | `GET /api/v1/accounts/me` (catálogo cacheado en Redis; usado por `AuthProvider` para poblar `accountsList`, no por `AccountSwitcher` directamente) |
| `createOrganizationRequest` | `POST /api/v1/organizations` |
| `inviteMemberRequest` | `POST /api/v1/organizations/invite` (persiste de verdad — ver sección 3.3) |

**`lib/api/roles.ts`**

| Función | Endpoint |
|---|---|
| `getSystemRolesRequest` | `GET /api/v1/roles` — usado por `useSystemRoles` para poblar el `Select` de `InviteMemberModal` |

**`lib/api/users.ts`**

| Función | Endpoint |
|---|---|
| `checkRfcRequest` | `GET /api/v1/users/check-rfc?rfc=` (público, sin JWT) — bifurca `/join`/`/signup` según si el RFC ya tiene cuenta |

**`lib/api/organization-invitations.ts`**

| Función | Endpoint |
|---|---|
| `getInvitationPreviewRequest` | `GET /api/v1/organizations/invitations/:token` (público) |
| `acceptInvitationRequest` | `POST /api/v1/organizations/invitations/:token/accept` (público, `{rfc}`) |

**`lib/api/organization-members.ts`**

| Función | Endpoint |
|---|---|
| `getOrganizationMembersRequest` | `GET /api/v1/organizations/:organizationId/members` |
| `updateMemberRoleRequest` | `PATCH /api/v1/organizations/members/:accountId/role` |
| `removeMemberRequest` | `DELETE /api/v1/organizations/members/:accountId` |

**`lib/api/organization-permissions.ts`**

| Función | Endpoint |
|---|---|
| `getOrganizationPermissionsRequest` | `GET /api/v1/organizations/:organizationId/permissions` |
| `createOrganizationPermissionRequest` | `POST /api/v1/organizations/:organizationId/permissions` (`{name}`) |
| `updateOrganizationPermissionRequest` | `PATCH /api/v1/organizations/:organizationId/permissions/:permissionId` (`{name?, isActive?}`) |
| `deleteOrganizationPermissionRequest` | `DELETE /api/v1/organizations/:organizationId/permissions/:permissionId` |
| `getMemberPermissionsRequest` | `GET /api/v1/organizations/members/:accountId/permissions` |
| `updateMemberPermissionsRequest` | `PATCH /api/v1/organizations/members/:accountId/permissions` (`{permissionIds}`) |

**`lib/api/plans/`**

| Función | Endpoint |
|---|---|
| `getPlansRequest` | `GET /stripe/plans` |
| `createCheckoutSessionRequest(planId)` | `POST /stripe/checkout/session` |
| `getSubscriptionStateRequest` | `GET /stripe/subscription` |

**`app/dashboard/documents/_requests.ts`**

| Función | Endpoint |
|---|---|
| `getParticipantDocumentsRequest` | `GET /document?participantEmail=&status=&page=&limit=...` (con más filtros vía `buildDocumentsFilterParams`) |
| `getDocumentFileUrlRequest` | `GET /document/file/:id` |

**`app/dashboard/documents/create/_requests.ts`**

| Función | Endpoint |
|---|---|
| `createDocumentSignaturesRequest` | `POST /api/v1/documents/signatures` (multipart: `file` + `documentData` + `collaboratorsdata` + `requiresDifferentSignatures`) — reemplazó el patrón viejo `POST /document` + `submit-for-authorization` |
| `getMyDocumentsRequest` | `GET /document?email=&page=&limit=...` |

**`app/dashboard/documents/[documentId]/_requests.ts`**

| Función | Endpoint |
|---|---|
| `getDocumentDetailRequest` | `GET /document/:id` |
| `signDocumentRequest` | `PATCH /document/:id/sign` |
| `rejectDocumentRequest` | `PATCH /document/:id/reject` |
| `requestCancellationRequest` / `confirmCancellationRequest` | `PATCH /document/:id/submit-for-cancellation` \| `/confirm-cancellation` |
| `requestVerificationCodeRequest` / `verifyCodeRequest` | `POST /document/:id/verification-codes` \| `/verify` — 2FA de firma |
| `linkCollaboratorRequest` | `PATCH /document/:id/link-collaborator` — usado por `/access-document` |

**`app/dashboard/personal-documents/_requests.ts`**

| Función | Endpoint |
|---|---|
| `uploadPersonalDocumentsRequest` | `PUT /api/v1/users/me/signature` (multipart: officialFile + signatureImage) |
| `updateIneFileRequest` / `updateSignatureFileRequest` | `PATCH /signature/:id` |
| `deleteIneFileRequest` / `deleteSignatureFileRequest` | `DELETE /signature/:id/official-file` \| `/signature-image` |
| `updatePersonalInformationRequest` | `PUT /api/v1/users/me/personal-information` |

**`app/forgot-password/_requests.ts`**

| Función | Endpoint |
|---|---|
| `forgotPasswordRequest` | `POST /auth/forgot-password` |
| `verifyResetCodeRequest` | `POST /auth/verify-reset-code` |
| `resetPasswordRequest` | `POST /auth/reset-password` |

Todas las respuestas del backend siguen el sobre `{ success, message, data }` (y `meta` en listados paginados).

**`lib/hooks/`** (compartidos entre rutas, no co-localizados): `useAccountsCatalog`, `useCreateCheckoutSession`, `useCurrentUser`, `useIsOrganizationAdmin`, `useLogout`, `useOnboardingProfile`, `useOnboardingReady`, `useOrganizationPermissions`, `usePatchUserStatus`, `usePlans`, `useSubscriptionState`, `useSystemRoles`.

**Otros helpers en `lib/`**: `lib/error-handler.ts` (`getErrorMessage`, formaliza el patrón de manejo de error repetido en todos los hooks de mutación — ver sección 7), `lib/signature-geometry.ts` (constantes de proporción para la colocación de firmas por drag&drop), `lib/pending-signature-context.ts`/`lib/pending-registration-context.ts` (contexto en `localStorage` para `/access-document` y registro con invitación pendiente), `lib/enums/document.ts` (`DocumentStatus`, `ParticipantStatus`, `ParticipantRole`, `SignatureType`).

---

## 6. Componentes reutilizables

- **`components/ui/`** — librería base tipo shadcn sobre `@base-ui/react`: `button`, `card`, `checkbox`, `dialog`, `dropdown-menu`, `input`, `input-otp`, `label`, `popover`, `select`, `separator`, `sheet`, `sidebar` (el más grande, soporta `AppSidebar` — `Sidebar`/`SidebarProvider`/`SidebarTrigger`/etc.), `skeleton`, `switch`, `table`, `tabs` (usado en `organization/settings/layout.tsx`), `textarea`, `field`, `tooltip`. `button.tsx` define las variantes propias (`default`, `brand` — CTA principal verde esmeralda, `outline`, `secondary`, `ghost`, `destructive`, `link`).
- **`components/form/`** — kit de formulario reutilizable, agnóstico del dominio (no conoce documentos ni miembros): recibe `control` + `name` de react-hook-form, resuelve el error del propio campo con `useController` y mantiene los estilos de `components/ui/field`.

  | Componente | Uso |
  |---|---|
  | `FormInput` / `FormTextarea` | Texto de una o varias líneas; aceptan las props nativas del elemento (`type`, `placeholder`, `autoComplete`, ...) |
  | `FormSelect` | Selector con las opciones como datos (`options`), para poder declararlas desde una configuración de campos |
  | `FormCheckbox` / `FormSwitch` | Booleanos; `FormCheckbox` acepta `checkedValue`/`uncheckedValue` para gobernar campos que no son booleanos (p. ej. `'SIMPLE'`/`'ADVANCED'`) |
  | `FormFileUpload` | Carga de archivos (FilePond + validación de tipo/tamaño); compatible con `<Controller>` (`name`/`value`/`onChange`/`onBlur`) |
  | `FormSection` | Envoltura de una sección: título, carga, deshabilitado (con el requisito que falta, `inert`) y error general |
  | `FormFieldShell` / `FormToggleShell` | Envolturas internas que comparten los anteriores (etiqueta + obligatorio + control + descripción + error) |

  `components/form/text-field.tsx` es el hermano basado en `register()` (y el único con el ojo de mostrar/ocultar contraseña); se conserva para `LoginForm`/`SignupForm`.
- **`lib/utils.ts`** — `cn()` (clsx + tailwind-merge), usado en todo el proyecto para clases condicionales.

---

## 7. Convenciones de estructura

- **Co-locación por ruta**: cada ruta trae su propia lógica en `_components/`, `_hooks/`, `_requests.ts`, `_schemas.ts` — evita un `lib/` monolítico.
- **Rutas anidadas reutilizan tipos/componentes del padre**: p. ej. `documents/create/_components` importa desde `documents/_components/`.
- **Prefijo `/dashboard`**: agrupa todas las rutas autenticadas bajo un layout común (`AuthProvider` + `AppSidebar`) — ya no es un route group `(app)` sin URL propia, es un segmento real de la URL (ver sección 4).
- **`next/dynamic({ ssr: false })`** para cualquier componente que use `react-pdf` (depende de APIs del navegador).
- **Manejo de errores uniforme**: los hooks de mutación repiten el patrón de castear el error a `AxiosError<{message}>` y caer a un mensaje genérico en español, mostrado con `react-hot-toast`.
- **Consultas y mutaciones como instancias con nombre**: cuando un componente o hook usa más de un `useQuery`/`useMutation`, no se desestructuran — se asignan a una instancia descriptiva con sufijo `Query`/`Mutation` (`documentQuery.isLoading`, `createDocumentSignaturesMutation.mutate()`). Evita alias artificiales para diferenciar `data`/`error`/`isLoading`/`isPending` repetidos y deja claro a qué operación pertenece cada propiedad.
- **Presentación separada de la lógica**: los componentes de sección (`*Section`) reciben su estado (`isEnabled`/`isLoading`/`hasError`/`errorMessage`) y solo lo dibujan; la carga de datos, las validaciones, las transformaciones y las reglas de activación viven en hooks, mappers y funciones puras (ver `documents/create` como referencia).
- **Idioma**: todo el copy de UI en español; nombres de variables/funciones en inglés.

---

## 8. Levantar el proyecto

```bash
npm install
npm run dev     # levanta en modo desarrollo (Turbopack)
```

Requiere `NEXT_PUBLIC_API_BASE_URL` apuntando al backend (`signature-server`) corriendo — ver el aviso de la sección 1/5 sobre el estado actual de `lib/axios.ts`/`next.config.ts` antes de asumir que esta variable se está usando de verdad.

### Tests

```bash
npm run test          # unitarias/componente (Jest + React Testing Library)
npm run test:watch    # modo watch
npm run test:e2e      # end-to-end reales (Playwright + Chromium) — ver e2e/README.md
npm run test:e2e:report
```

Jest configurado vía `next/jest` (`jest.config.mjs`, ESM — consistente con `eslint.config.mjs`/`postcss.config.mjs`) + React Testing Library + `jest-dom`. `test-utils.tsx` en la raíz expone `renderWithProviders()`, que envuelve en un `QueryClientProvider` de prueba (retries desactivados) para componentes que usan React Query. Los specs están co-localizados junto a su componente/schema (`*.spec.ts`/`*.spec.tsx`), igual que en `signature-server`.

**Estado real de la suite (`npx jest --silent`, tras el refactor de la pantalla de carga y configuración)**: **57 suites / 327 tests**, con **1 suite / 2 tests en rojo** — exactamente `lib/axios.spec.ts`, el spec dedicado a la regresión de `baseURL` descrita en la sección 1/5 (espera una URL absoluta y recibe `/api`). Cualquier cifra de tests reportada en entradas anteriores de la sección 9 (p. ej. "116 tests", "101 tests en 21 suites") quedó desactualizada — usa esta cifra como la vigente hasta la próxima ronda.

**Suite E2E (`e2e/`, Playwright + Chromium)**: **34 pruebas en 6 archivos, todas en verde**, corriendo contra la aplicación real (frontend `:3001` + backend NestJS `:3000` + docker-compose de `signature-server`) — sin mocks: los documentos que crea se suben a MinIO y quedan en Postgres. Cubre rutas públicas y guardas del middleware, registro con OTP y login, onboarding, la pantalla de carga y configuración (incluida la ubicación de firmas por arrastre y el envío real), el recorrido de firma/rechazo entre dos cuentas, y organizaciones. Ver `e2e/README.md` para requisitos, decisiones del arnés y por qué la sesión se prepara por API (el login está limitado a 5 intentos por minuto). Las pruebas cuyo nombre empieza con `HALLAZGO:` documentan bugs reales encontrados (ver sección 9), no comportamiento deseado.

**`jest.setup.ts` polyfills para popups de `@base-ui/react`**: jsdom no implementa `ResizeObserver` ni `PointerEvent` (ni `hasPointerCapture`/`setPointerCapture`/`scrollIntoView` en `Element`), y `Select`/`Popover`/`dropdown-menu` los usan para posicionarse y para abrir con click. Sin estos stubs, un popup se queda montado con `hidden`/`data-closed` sin importar cuántas veces se le haga `userEvent.click()` al trigger — no es un bug del componente, es la ausencia de estas APIs en jsdom. Con el polyfill, `click` sigue sin abrir el popup de forma confiable (aparentemente porque base-ui espera una secuencia de eventos de puntero más específica que la que dispara `userEvent` incluso con el polyfill) — el camino confiable que sí funciona es teclado: `trigger.focus()` + `userEvent.keyboard('{Enter}')` para abrir, luego `userEvent.click()` sobre la opción (`role="option"`) para seleccionar y cerrar (ver `InviteMemberModal.spec.tsx` para el patrón completo).

---

## 9. Pendientes / trabajo futuro

### Resuelto en esta ronda (tablas estandarizadas de Documentos + enlace público para compartir) — 2026-08-17

- **Una sola estructura de tabla en las tres secciones** (Por firmar / Enviados para firma / Completados): Documento, Creado por, Fecha de creación, Tipo de firma, Estado de firma, Acciones (ver el detalle en la sección 2, Paso 4). Las tres ya compartían componente (`DocumentsTable`), así que el cambio fue de columnas y jerarquía visual, no de arquitectura. Se retiró la columna "Participantes" —los firmantes siguen siendo filtrables desde el panel de filtros— y la fecha pasó de `dd/mm/aaaa` al formato legible con hora. La tabla se envolvió en una tarjeta con borde y encabezado gris, y el indicador de orden quedó solo en "Documento".
- **`lib/format-datetime.ts`** (nuevo): `formatLongDateTime()` → "Domingo 15 de marzo, 11:55 PM". Se compone a mano en vez de con `Intl.DateTimeFormat('es-MX')` porque ICU devuelve "domingo, 15 de marzo, 11:55 p. m." y su salida exacta varía entre runtimes (Node del build, navegador, jsdom) — el formato de la tabla no puede depender de eso.
- **`DocumentRowActions`** (nuevo): las acciones sueltas por fila (botón DESCARGAR, ícono de ojo, botón "Ver detalle", cada uno visible bajo condiciones distintas según el estatus) se concentraron en un menú de tres puntos con ícono y texto — Descargar, Ver detalle y Compartir, las mismas tres en todos los estatus. FIRMAR conserva botón propio por ser la acción primaria de "Por firmar". Descarga y detalle mantienen exactamente el mismo comportamiento (`useDownloadDocument`, `/dashboard/documents/:id`), incluido el estado "Descargando..." acotado al documento en curso.
- **`DocumentPreviewDialog` se eliminó**: era el ícono de ojo que abría el PDF firmado en un diálogo, y solo lo usaba esta tabla. "Ver detalle" ya lleva a `/dashboard/documents/:id`, que renderiza el mismo PDF, así que eran dos caminos al mismo visor y el diseño fija tres acciones.
- **`ShareDocumentDialog` + `lib/document-public-url.ts`** (nuevos): "Compartir" arma `<origin>/public/documents/:id` y lo copia con confirmación "Enlace copiado". El enlace es determinista a partir del id, así que no hay endpoint nuevo ni token que emitir; el visor público ya existía y sigue siendo quien decide qué mostrar según el estatus. La copia tiene respaldo con `document.execCommand('copy')`: `navigator.clipboard` solo existe en contextos seguros y los despliegues internos por IP corren en HTTP plano.
- **Backend (`signature-server`)**: `GET /document` ahora devuelve `creatorRfc`. El RFC no vive en `users` sino en `personal_information`, así que `findWithFilters` agrega un `leftJoinAndSelect` a `requester.personalInformation` — en el mismo query, no una consulta por documento. Llega `null` si el creador todavía no registró su RFC y la columna simplemente lo omite.
- **Tests nuevos**: `format-datetime.spec.ts` (6), `document-public-url.spec.ts` (5), `DocumentsTable.spec.tsx` reescrito (12, incluye estructura de columnas, RFC secundario rotulado, formato de fecha, que el menú tenga exactamente las tres acciones —también en documentos firmados— y el flujo de copiado) y 2 en `document.service.spec.ts` del backend.

### Resuelto en esta ronda (solicitud de firma con acordeones independientes y resumen fijo) — 2026-08-15

Rediseño de `/dashboard/documents/create` sin tocar la lógica de negocio del envío (mismo payload, mismo endpoint, mismas validaciones):

- **Se eliminó la tarjeta exterior** que envolvía el formulario y la vista previa: la pantalla usa el ancho completo y el visor del PDF crece con el alto disponible (`lg:h-[calc(100dvh-8rem)]`, `sticky`) en vez de quedar fijo en 640px dentro de otra tarjeta.
- **Tres acordeones independientes** (Cargar documento / Configurar firma / Añadir participantes) con `components/ui/accordion.tsx`, nuevo, sobre el primitivo de `@base-ui/react`. Arrancan abiertos y **ninguno se bloquea por el estado de otro**. El encabezado lleva número de paso, palomita verde cuando la sección está configurada y, contraído, su resumen (nombre de archivo + páginas / tipo de firma / conteo de firmantes y espectadores).
- **Trampa del primitivo**: `Accordion.Root` trae `multiple: false` por defecto, así que cada clic cerraba todo lo que el usuario tenía abierto — exactamente el "se bloquean entre sí" que la historia pedía evitar. El wrapper lo activa por defecto. Se detectó con una prueba de tres ítems, no a ojo: con un solo ítem el comportamiento es idéntico.
- **Resumen fijo + botón fijo** debajo de los acordeones (`DocumentRequestSummary`): documento, páginas, tipo de firma, firmantes y espectadores, con "Pendiente" en lo que falta. "Firmar" se habilita solo con las tres secciones completas.
- **`_section-progress.ts`** (nuevo, función pura) decide qué está completo, qué dice cada encabezado contraído y qué muestra el resumen; `_section-rules.ts` pasa a recibir `isReadyToSubmit` en vez de deducir el envío del archivo. Las etiquetas del tipo de firma salieron de `SignatureTypeField` a `_config/signature-type.config.ts`: el selector y el resumen no pueden discrepar.
- **El número de páginas no se calcula aparte**: lo publica `SignaturePlacementPdfPreview` (`onLoadSuccess`), que ya parsea el PDF para renderizarlo — contarlas por separado significaba leer y decodificar el archivo dos veces.
- **Pruebas**: +1 suite (`_section-progress.spec.ts`, 15 casos) y +5 casos en `CreateDocumentView.spec.tsx` (abrir/contraer independiente, palomitas, encabezados contraídos, resumen reactivo, resumen y botón visibles con todo contraído). Suite completa: **66 suites / 419 tests en verde**. En E2E, `e2e/create-document-accordions.e2e.ts` (6 pruebas) cubre lo mismo contra el stack real, incluido que el botón siga creando la solicitud (se verifica en Postgres) y que "Requiere aprobación" exista dentro de una organización y no fuera.

### Hallazgos de la auditoría E2E (Playwright + Chromium, aplicación real) — 2026-08-08

Corrida completa del producto en Chromium contra el backend y la infraestructura reales. Los bugs de abajo están **reproducidos y fijados en pruebas** (las que empiezan con `HALLAZGO:` en `e2e/`), así que fallarán solas cuando se corrijan y haya que actualizarlas.

**Bloqueantes del flujo de firma**

1. ~~**El firmante no puede abrir un documento desde su propio listado (403).**~~ **CORREGIDO (2026-08-08).** `GET /document/:id` y `GET /document/file/:id` autorizaban por `accountId` del colaborador, que queda en `NULL` hasta que el firmante entra por el enlace del correo (`/access-document` → `PATCH /document/:id/link-collaborator`); el listado "Por firmar", en cambio, filtra por correo, así que **mostraba documentos que la pantalla de detalle después rechazaba** con "No se pudo cargar el documento". Ahora el backend resuelve al colaborador por cuenta vinculada o, si la invitación sigue pendiente, por correo — el mismo criterio que `sign()`/`reject()` ya usaban, sin vincular nada en una lectura (ver `signature-server/README.md`, sección 7). Las pruebas E2E que documentaban el 403 ahora verifican el detalle y el visor del PDF cargando para el firmante invitado.
2. ~~**Un fallo de correo bloquea la firma aunque el código ya exista.**~~ **CORREGIDO (2026-08-09).** `POST /document/:id/verification-codes` persistía el código y *después* intentaba enviarlo; si el proveedor de correo fallaba respondía 500 y la pantalla nunca mostraba el campo para capturarlo — el firmante no podía avanzar aunque el código estuviera emitido. Ahora el envío es no fatal (mismo criterio que ya usaba el OTP de registro) y el endpoint reporta `data.emailDelivered`: el hook cambia el toast por una advertencia y `SignDocumentView` muestra un aviso persistente junto a "Reenviar código", de modo que el firmante siempre puede continuar. Ver `signature-server/README.md`, sección 7.
3. ~~**Sin código validado, el firmante tampoco puede rechazar.**~~ **CORREGIDO (2026-08-09).** En `SignDocumentView` el bloque de acciones —incluido "Rechazar documento"— solo se renderizaba cuando `verificationConfirmed` era true; combinado con el punto 2, el firmante se quedaba literalmente sin ninguna acción. Era una puerta puramente de UI: `PATCH /document/:id/reject` nunca exigió el código (ver `reject()` en signature-server, que sí valida estatus, turno y firma en archivo). El botón salió de esa condición y ahora se ofrece según `canReject`, manteniéndose dentro del bloque de "firma no configurada" porque el backend sí exige firma en archivo para rechazar.

**Validación e inconsistencias de UI**

4. **La validación nativa del navegador tapa los mensajes de la aplicación.** Ningún `<form>` declara `noValidate`, así que con un correo mal escrito el navegador corta el envío y muestra su globo en inglés; react-hook-form nunca llega a validar y **no se muestra ningún mensaje en español**, ni siquiera el de los otros campos que también están mal. Se reproduce en `/signup` y `/login`. Arreglo: `noValidate` en los formularios que ya validan con Zod.
5. **`/error` no es alcanzable.** La pantalla genérica de error queda detrás del guard de sesión (no está en `AUTH_ROUTES` ni excluida del matcher del middleware): sin token, cualquier visita termina en `/login`.
6. **Branding inconsistente entre pantallas públicas.** `/login` y el dashboard dicen "Firmalo"; `/signup` y `/access-document` dicen "Signature".
7. **Accesibilidad**: `CardTitle` se renderiza como `div`, así que pantallas como `/login` no tienen ningún encabezado real; y la caja de firma colocada sobre el PDF (`SignatureBox`) expone `role="button"` (de dnd-kit) sin nombre propio, por lo que un lector de pantalla anuncia dos botones "Eliminar firma" indistinguibles. Un `aria-label` explícito (`Firma de {nombre} en la página N`) resuelve el segundo.

10. ~~**Modal fantasma "Firma no configurada".**~~ **CORREGIDO (2026-08-09).** Detectado por la intermitencia de la suite E2E: `needsSimpleSignatureSetup` en `SignDocumentView` evaluaba `!user?.signatureConfigured` mientras el store todavía no hidrataba el perfil, así que el modal bloqueaba la pantalla completa a usuarios que sí tenían su firma lista, según lo que tardara `/auth/me`. Ahora "todavía no sé" se distingue de "sé que falta" (mismo criterio que `useOnboardingReady`).

**Operación**

8. **El límite de 5 peticiones por minuto por IP en `/auth/*` es agresivo para IP compartida** (oficina/NAT): basta que tres personas se equivoquen de contraseña para dejar sin login a toda la red durante un minuto. La suite E2E tuvo que preparar sesiones por API justamente por esto. Vale considerar la ventana por IP+correo.
9. **Intermitente (1 de ~4 corridas)**: tras crear una organización, la pantalla de creación quedó bloqueada por "onboarding incompleto" para un usuario que sí estaba configurado, y el switcher seguía mostrando la cuenta personal; se recuperó al recargar. Apunta a una carrera entre la creación de la cuenta de organización y el perfil cacheado que hidrata `useAuthStore`. No se pudo reproducir de forma determinista — queda anotado con la evidencia (`expectCreateScreenReady` en `e2e/helpers/ui.ts` recarga una vez por esta razón).

**Lo que sí funciona de punta a punta** (verificado en la corrida): registro con OTP → login → onboarding → carga de PDF → configuración de participantes → ubicación de firmas por arrastre → envío multipart real (MinIO + Kafka + Postgres) → listado de creados → enlace del correo → verificación → firma → rechazo → organizaciones e invitaciones.

### Resuelto en esta ronda (refactor de la pantalla de carga y configuración de documentos) — 2026-08-08

`CreateDocumentView` concentraba la carga de datos, la transformación de respuestas, las validaciones, el manejo de errores, la habilitación de secciones y el render completo de los formularios en un solo componente. Se separó en presentación, lógica, esquemas y contratos de datos, sin cambiar el comportamiento del flujo (mismo payload, mismas validaciones, mismo orden de campos en pantalla):

- **Secciones con responsabilidad única**: `DocumentUploadSection`, `DocumentConfigurationSection`, `DocumentParticipantsSection`, `DocumentSignaturePlacementSection` y `CreatedDocumentsSection` (ver la tabla del paso 2 en la sección 2). El componente principal quedó como composición.
- **Reglas de activación explícitas y testeadas**: `_section-rules.ts` (función pura) produce el `SectionState` de cada sección. Cada regla está justificada en el código, incluidas las secciones que están siempre habilitadas (que no dependan de nada es una decisión, no un olvido). El único requisito duro es el de la ubicación de firmas: sin PDF cargado no hay nada sobre lo que arrastrar.
- **Lógica en hooks y mappers**: `useDocumentFileSelection`, `useCreateDocumentForm`, `useCreatedDocuments`, `_mappers/collaborator-payload.mapper.ts` y `_mappers/submission-collaborators.mapper.ts`.
- **Esquemas por sección**: `_schemas.ts` pasó a ser `_schemas/` con un archivo por sección más el esquema compuesto; la regla cruzada ("al menos un firmante, o incluirme") vive en la composición, que es donde se conocen ambas secciones.
- **Contratos de datos separados**: `_interfaces/` distingue solicitud, respuesta y entidad (`CreateDocumentSignaturesRequest`, `CreateDocumentSignaturesResponse`, `CreatedDocumentSignatures`) — antes el sobre de la respuesta era un genérico anónimo escrito en línea dentro de `_requests.ts`.
- **Kit de formulario reutilizable** en `components/form/` (`FormInput`, `FormSelect`, `FormTextarea`, `FormCheckbox`, `FormSwitch`, `FormFileUpload`, `FormSection`), adoptado por `CollaboratorFormItem`, los campos de configuración, `DocumentFilePicker` e `InviteMemberModal`. Cada campo resuelve su propio error con `useController`: `CollaboratorFormItem` ya no recibe ni recorre `formState.errors` con casts.
- **Configuración de campos** en `_config/collaborator-fields.config.ts` (sin perder tipado: `name` está acotado a las llaves reales del colaborador) y `_config/document-file.config.ts` (el límite de 20 MB se escribía a mano en tres lugares).
- **Efecto secundario del kit**: `FormFileUpload` se vacía solo cuando el consumidor limpia el valor, así que desapareció el `filePondKey` que la pantalla incrementaba a mano para remontar el widget.
- **Pruebas**: +5 suites y +39 tests — reglas de activación, mappers, `useDocumentFileSelection`, el kit de formulario, y casos nuevos en `CreateDocumentView.spec` (sección deshabilitada, archivo procesándose, error general de participantes, error del listado).

**Pendiente relacionado**: `FormTextarea` es el único componente del kit sin consumidor todavía — el candidato natural es el formulario de rechazo de `SignDocumentView`, que hoy arma su `Textarea` + error a mano (queda fuera de esta historia por ser otra pantalla).

### Auditoría de documentación (README vs. código real) — 2026-08-06
Este README había quedado desactualizado en varios puntos estructurales desde la migración de rutas a `/dashboard/*` y desde que se agregaron los módulos de permisos de organización, OTP de registro/recuperación de contraseña, y el visor público de documentos — ninguno tenía una sola línea de documentación. Se hizo una auditoría de solo lectura (dos agentes en paralelo, uno por proyecto del monorepo, más lectura directa) contra el código real y se reescribieron las secciones 1-8 (referencia técnica) para reflejar el estado actual; la sección 9 (este changelog) se dejó intacta salvo esta entrada nueva.

**Hallazgos que NO se corrigieron en esta ronda** (auditoría de documentación únicamente, no de código — se dejan documentados como pendientes reales en vez de arreglarse de paso):
- **Bug crítico recurrente (3ra vez)**: `lib/axios.ts` tiene `baseURL: '/api'` hardcodeado y `next.config.ts` trae de vuelta el `rewrites()` roto (`BACKEND_API_URL` sin definir, fallback a un host que solo resuelve en Docker) — el mismo bug que este README ya documentó como "resuelto" dos veces (ver las dos entradas de "bug crítico: el frontend no llegaba al backend" más abajo), incluyendo una donde se agregó `lib/axios.spec.ts` explícitamente para que esto "no vuelva a colarse en silencio una tercera vez". Ese spec está fallando ahora mismo. Si esto no fue un cambio intencional (p. ej. para probar el frontend containerizado contra un backend en el mismo `docker-compose`), hay que revertirlo — ninguna llamada real del navegador está llegando al backend mientras esté así.
- **No existe landing pública en `/`**: falta `app/page.tsx` por completo, y el middleware ya no la excluye del guard de sesión. Hay que confirmar con el equipo si la landing se movió a otro lado (`signature-site`, el tercer proyecto del monorepo) o si es una regresión.
- **Cifras de tests desactualizadas en entradas anteriores de este changelog**: no se corrigieron retroactivamente (el changelog es un registro histórico) — la cifra vigente hoy es la que aparece en la sección 8.

### Resuelto en esta ronda ([STORY] Frontend: Carga de Documentos y Configuración de Firmantes)
Rediseño completo de `/documents/create` (`app/(app)/documents/create/`) — reemplaza el picker de usuarios existentes por un formulario donde cada colaborador se captura como datos libres (nombre/apellido/email/RFC), y cambia el endpoint consumido de `POST /document` + `POST /document/:id/submit-for-authorization` a `POST /api/v1/documents/signatures` (ver README de `signature-server`, que se ajustó en la misma ronda para matchear el JSON exacto de esta historia).

- **`_schemas.ts` reescrito**: `collaboratorSchema` es un discriminated union por `collaboratorType` (`SIGNER`/`VIEWER`) con reglas propias — SIGNER exige `signatureType`, y `rfc` solo si es `ADVANCED`; VIEWER exige `rfc` siempre, sin nada de firma. `toBackendCollaboratorPayload()` inyecta `signaturePosition` por defecto (`{page:1,x:100,y:100}`, sin UI todavía, tal como pide la historia) y **fuerza `requiresTwoFactorAuth: true` para SIMPLE en el propio frontend** (no solo confía en que el checkbox oculto lo haya dejado así) — el backend además lo refuerza de su lado, defensa en profundidad.
- **`CollaboratorsFieldArray`/`CollaboratorFormItem`** (nuevos, con `useFieldArray` de react-hook-form): un solo arreglo `collaborators`, botones "Firmante"/"Espectador" que agregan el tipo correspondiente — mismo componente renderiza ambos, mostrando solo los campos que aplican (RFC aparece/desaparece según `collaboratorType`+`signatureType`; el checkbox de 2FA solo existe para SIGNER+ADVANCED).
- **`RequiresApprovalField`** (nuevo): checkbox + ícono de ayuda con el texto exacto de la historia. Necesitó un componente `Tooltip` nuevo (`components/ui/tooltip.tsx`, no existía) — `@base-ui/react` (la librería de primitivos que ya usa el resto de `components/ui/*`, no Radix) ya trae `tooltip` como submódulo, así que fue agregar el wrapper siguiendo el mismo patrón que `popover.tsx`, sin instalar ninguna dependencia nueva.
- **`IncludeMeAsSignerField`** (nuevo): al marcarlo, `CreateDocumentView` agrega un SIGNER auto-completado con los datos de `useCurrentUser()` al payload en el submit (no como una fila editable del arreglo) y muestra la leyenda "Estás firmando este documento en representación de **tu perfil personal**" (o el nombre de la organización activa, resuelto de `useAuthStore`).
- **`useCreateDocumentSignatures`** (nuevo, reemplaza `useCreateDocument`): un solo request multipart (ya no dos llamadas encadenadas create→submit-for-authorization). `onSuccess` invalida `['myDocuments']` (refresca la tabla) y el caller (`CreateDocumentView`) hace `reset(DEFAULT_VALUES)` + remonta `DocumentFilePicker` cambiándole el `key` (FilePond es no controlado, así se limpia).
- **Retirado**: `ParticipantPicker.tsx`, `useUsers.ts`, `useCreateDocument.ts` y `SelectableUser`/`getUsersRequest` de `_requests.ts` — el picker de usuarios existentes ya no aplica (todos los colaboradores son invitación por datos libres, ver decisión del backend).

**Bug crítico encontrado de nuevo, ya documentado como resuelto antes en este mismo README** (ver la entrada "bug crítico: el frontend no llegaba al backend" más abajo): `lib/axios.ts` volvió a tener `baseURL: '/api'` y `next.config.ts` volvió a tener el `rewrites()` roto — exactamente la regresión ya descrita ahí, con el mismo síntoma (login y cualquier llamada real rotos, toda la suite de Jest en verde porque mockea la red). Se corrigió de nuevo (mismo fix) y se agregó `lib/axios.spec.ts` — que no existía — para que esta regresión específica no vuelva a colarse en silencio una tercera vez: verifica que `apiClient.defaults.baseURL` sea una URL absoluta por defecto y que respete `NEXT_PUBLIC_API_BASE_URL` cuando está definida.

Verificado en un navegador real (Playwright headless, no solo Jest): login → `/documents/create` → subir PDF por FilePond → tooltip de "Requiere aprobación" visible al hover → firmante con FIEL (RFC aparece, 2FA visible y marcable) → espectador (solo nombre/apellido/email/RFC) → "Incluirme como firmante" (leyenda de contexto visible) → submit → `201` real del backend con `collaboratorsCount: 3`, `verificationCodesCount: 2` → FilePond y el formulario se limpiaron → la tabla de documentos y el contador del navbar se actualizaron solos (sin recargar) mostrando el documento recién creado. Typecheck, lint y 116 tests (22 suites, incluyendo `_schemas.spec.ts` y `CreateDocumentView.spec.tsx` reescritos) pasan.

### Resuelto en esta ronda (auditoría general: revisión de las 6 historias del README + búsqueda de bugs)
Auditoría completa contra las 6 historias del README raíz (`C:/Signature/README.md`) — la mayoría de los hallazgos y fixes de esta ronda fueron del lado de `signature-server` (ver su README: firma corrupta silenciosa al desactivar la firma después de firmar, suscripciones de Stripe que nunca se activaban, condiciones de carrera en firma/rechazo/cancelación y en eliminación de documentos personales, rate limiting nunca aplicado, validación de onboarding faltante). Del lado del frontend:

- **`/home` ya bloquea de verdad la sección operativa mientras el onboarding está incompleto** (bug real vs. el README, Historia 2: pedía "bloqueando el dashboard", pero `CreateDocumentView`/`InviteMemberModal` se renderizaban siempre sin importar `personalConfigured`/`signatureConfigured`). `HomeContent.tsx` (nuevo, client component) hace el gateo: si `!isConfigured && !(personalConfigured && signatureConfigured)`, muestra un mensaje en vez del contenido operativo. `home/page.tsx` queda como server component trivial que solo compone `OnboardingBanner` + `HomeContent`.
- **Tests nuevos**: `HomeContent.spec.tsx` (sin usuario no renderiza nada, bloquea con cualquiera de las dos sub-banderas en false, desbloquea con ambas en true o con `isConfigured` ya true). 101 tests en total (antes 96).

### Resuelto en esta ronda (Gestión de Miembros: listado, edición de rol y eliminación en organización)
- **Nueva vista `/organization/settings/members`** (`app/(app)/organization/settings/members/`): tabla con correo/RFC/rol/fecha de ingreso de cada miembro activo de la organización, con menú de acciones por fila ("Editar Rol"/"Eliminar") — mismo patrón de `Table`/`DropdownMenu` que `DocumentsTable`/`AccountSwitcher`. Acceso desde el dropdown "CUENTA" del `DashboardNavbar` (nuevo ítem "Miembros"), visible solo si la cuenta activa es `ORGANIZATION`.
- **`lib/hooks/useIsOrganizationAdmin.ts`** (nuevo): resuelve si `activeAccount.roleId` corresponde al rol de sistema `ADMIN` consultando el mismo catálogo `GET /api/v1/roles` que ya usa `InviteMemberModal`. `MembersView` lo usa para decidir si renderiza la tabla o un mensaje de "no tienes permisos" — sin esto, un `MEMBER` vería un 403 crudo del backend en vez de una UI que oculta la sección de entrada (ver Escenario 4 de la historia).
- **`EditRoleModal`/`RemoveMemberDialog`** (nuevos): el primero reutiliza el patrón `Select` poblado por `useSystemRoles()` (igual que `InviteMemberModal`); el segundo es un diálogo de confirmación dedicado (no se reutilizó `DeleteConfirmDialog` de `personal-documents` porque su copy es específico a archivos — "Tendrás que volver a subir el archivo..." no aplica aquí).
- **Endpoints consumidos**: `GET /api/v1/organizations/:organizationId/members`, `PATCH /api/v1/organizations/members/:accountId/role`, `DELETE /api/v1/organizations/members/:accountId` (ver README de `signature-server`) — los dos últimos son alias sobre los mismos `AccountMemberService.update()`/`remove()` que ya existían, incluyendo la protección nueva contra dejar una organización sin ningún ADMIN activo (backend responde `409`, la UI solo lo refleja vía toast).
- **Actualización de estado**: `useUpdateMemberRole`/`useRemoveMember` invalidan la query `['organizationMembers', organizationId]` en `onSuccess`, así que la tabla se refresca sola tras editar o eliminar — no hay estado duplicado en Zustand para esto (los miembros de la organización no son parte del store global, a diferencia de `accountsList`/`activeAccount`).
- **Tests nuevos**: `MembersTable.spec.tsx` (render de datos, columna de acciones oculta sin `canManage`, delegación de "Editar Rol"/"Eliminar" al miembro de la fila correcta) y `MembersView.spec.tsx` (mensaje si la cuenta activa no es organización, mensaje de acceso restringido sin consultar el listado si no es ADMIN, flujo completo de editar rol y de eliminar hasta llamar a la mutación). 86 tests en total (antes 76).

### Resuelto en esta ronda (bug crítico: el frontend no llegaba al backend en ningún escenario real)
- **`lib/axios.ts` tenía `baseURL: '/api'`** (no `NEXT_PUBLIC_API_BASE_URL`, a pesar de que este README y `.env.local` ya documentaban/configuraban lo correcto) **y `next.config.ts` tenía un `rewrites()` que reenviaba `/api/:path*` a `process.env.BACKEND_API_URL` — variable que nunca se definió en ningún lado**, así que cada request cruzaba a su fallback hardcodeado `http://localhost:4000`, un puerto donde no corre nada. Encima, aunque se hubiera apuntado al puerto correcto, el `rewrites()` reenviaba con el prefijo `/api` intacto (`${backendUrl}/api/:path*`), que no calza con la mitad de las rutas reales del backend (`/document`, `/auth/*`, `/signature/*`, `/account*` no llevan ese prefijo) ni con la otra mitad (`/api/v1/*` ya lo trae en el path, duplicándolo). El resultado: **ninguna llamada real de la app llegaba al backend** — ni login, ni el catálogo de cuentas, ni crear documentos, nada — aunque toda la suite de Jest siguiera en verde, porque los tests mockean la capa de red y nunca ejercitan `apiClient` de verdad.
- **Por qué nadie lo había notado**: cada verificación de este proyecto hasta ahora fue típecheck/lint/tests (mockeados) + build, nunca una llamada de red real desde el navegador. Se detectó al hacer un chequeo end-to-end real (registro→login→crear organización→invitar→crear documento vía `curl`, simulando exactamente lo que haría `apiClient` desde el navegador) pedido explícitamente para buscar errores en el proyecto completo.
- **Fix**: `lib/axios.ts` vuelve a usar `NEXT_PUBLIC_API_BASE_URL` (con el fallback documentado `http://localhost:3000`) para llamar al backend directamente, cruzando orígenes — el backend ya tiene `app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3001' })` en `main.ts`, confirmando que ese es el diseño real, no el proxy same-origin. Se eliminó el `rewrites()` de `next.config.ts` (dead code irrecuperable dado el desajuste de prefijos). Verificado con una llamada cross-origin real (preflight `OPTIONS` + `GET` con header `Origin`) contra el backend vivo: 200 con los datos reales.
- **Tests**: sin cambios — el bug era invisible a Jest por diseño (mockea la red), así que no hay manera de que un test unitario lo hubiera atrapado; solo una llamada de red real (o un e2e futuro) lo detecta. Esto refuerza el pendiente de abajo sobre la falta de tests end-to-end.

### Pendientes reales (lo que queda abierto hoy)
- **"Requiere aprobación" no tiene efecto real todavía**: `/documents/create` manda `requiresApproval` correctamente y el backend lo guarda, pero nada enruta el documento a un aprobador — se notifica a los firmantes igual que si el checkbox estuviera apagado. Ver README de `signature-server`, sección de pendientes, para el detalle de lo que falta del lado del backend antes de que esto tenga sentido construir algo más en la UI (ej. una vista de "documentos por aprobar").
- **`useCreateCheckoutSession` sin manejo de error**: si `POST /stripe/checkout/session` falla, el botón "Suscribirse" solo vuelve a su estado normal sin ningún toast — a diferencia del resto de los hooks de mutación del proyecto, que sí muestran el mensaje del backend. Encontrado en la auditoría general de esta ronda.
- **De los dos headers que manda `lib/axios.ts`, solo `X-Account-Id` tiene efecto, y solo en documentos (crear + listar) y en la invitación/gestión de miembros**: cambiar de cuenta en el switcher ya filtra `/document` de verdad, y las rutas de organización ya validan contra la cuenta activa — ver README de `signature-server`. `X-Organization-Id` se manda igual en cada request (cuando la cuenta activa es una organización) pero **ningún endpoint del backend lo lee todavía**. El resto de recursos (detalle de documento, firma/rechazo/cancelación) tampoco distinguen cuenta activa; cambiar de cuenta ahí sigue sin efecto en el backend. (`GET /user` para elegir firmantes/espectadores ya no aplica: `/documents/create` dejó de usar ese picker, ver "Resuelto en esta ronda" de la historia de carga de documentos.)
- **Cobertura de tests desigual**: 101 tests en 21 suites. `AuthProvider`, `AccountSwitcher`, `OnboardingBanner`, `CreateOrganizationForm`/`useCreateOrganization`, `InviteMemberModal`/`useInviteMember`, `MembersView`/`MembersTable` y `JoinView`/`SignupForm` ya tienen tests de componente (ver "Resuelto" abajo). **Siguen sin cobertura** los hooks de `personal-documents` que mutan el onboarding (`useUpdatePersonalInformation`, `useUploadPersonalDocuments`), `PersonalDocumentsView`/`UserInfoCard`, `DocumentsView`, y los flujos de `plans`/Stripe. Sin tests end-to-end (Playwright/Cypress) — todo lo actual es unitario/de integración con mocks.
- **Reminders / mensaje para participantes / fecha de expiración**: sigue **deliberadamente pendiente** (decisión del equipo) — ver "Ideas descartadas" más abajo. Si el producto los pide más adelante, hay que diseñarlos end-to-end (no es reconectar código existente).
- **/join no distingue "invitación ya utilizada" de "ya soy miembro"**: si el backend rechaza el `accept` (409/410), la UI solo muestra el toast de error genérico del backend — no hay una pantalla dedicada por cada caso (ver README de `signature-server`, sección de la historia de Kafka/Email/Miembros).

### Resuelto en esta ronda (Eventos Kafka, Email (SendGrid) y Miembros (/join))
- **`InviteMemberModal` ya invita de verdad**: sin cambios de código de este lado — el modal ya llamaba `POST /api/v1/organizations/invite`; lo que cambió es que el backend ahora persiste la invitación, publica el evento en Kafka y el worker envía el correo (ver README de `signature-server`).
- **Ruta `/join` nueva** (`app/join/`, fuera del route group `(app)` — como `/login`/`/signup`, sin `AuthProvider` ni guard de sesión; agregada al matcher público de `middleware.ts`): lee `token`/`orgId` de la URL (server component `page.tsx`, mismo patrón que `LoginPage` con `searchParams`), consulta `GET /api/v1/organizations/invitations/:token` para mostrar "Has sido invitado a [Organización]", y pide el RFC. Estados manejados: cargando, invitación no encontrada, expirada, ya utilizada, y el flujo normal (`PENDING`).
- **Bifurcación por RFC**: `GET /api/v1/users/check-rfc?rfc=` (público, sin JWT — `lib/api/users.ts`, nuevo) decide el camino. RFC existente → pantalla de confirmación (`JoinExistingUser`) con el aviso textual exacto de la historia sobre la independencia del perfil principal, botón "Unirse" que llama `POST /api/v1/organizations/invitations/:token/accept` con `{rfc}` (sin JWT — el invitado puede no tener sesión iniciada). RFC nuevo → `router.push('/signup?rfc=...&token=...&orgId=...')`.
- **Redirección post-aceptación evaluando la sesión local**: si `getAuthToken()` (cookie) existe, se refresca el catálogo (`getAccountsCatalogRequest`), se ubica la cuenta con `organizationId` igual al de la URL, se llama `setActiveAccount`/`setAccountsList` en Zustand y se redirige a `/home` con la organización recién unida ya activa. Si no hay sesión, redirige a `/login` — la membresía ya quedó creada en el paso anterior.
- **`/signup` acepta `rfc`/`token` por query param** (Camino B — RFC nuevo en /join): `SignupPage` pasa a ser un server component que lee `searchParams` (mismo patrón que `LoginPage`) y se los pasa a `SignupForm` como `defaultRfc`/`invitationToken`. El RFC llega prellenado; `invitationToken` viaja en el payload de `POST /auth/register` (`RegisterRequestValues`, nuevo) — el backend hace el join a la organización automáticamente después de crear la cuenta (ver README de `signature-server`). Sin cambios en la redirección post-registro (`/login?registered=1`): tras registrarse y quedar unido, el usuario igual inicia sesión normal, simétrico al "si no hay sesión, a /login" de Camino A.
- **Tests nuevos**: `JoinView.spec.tsx` (enlace inválido sin consultar nada, estados expirada/ya utilizada, ambos caminos A y B completos incluyendo la actualización del store con sesión activa) y 2 casos nuevos en `SignupForm.spec.tsx` (RFC prellenado, `invitationToken` incluido en el envío). 96 tests en total (antes 86).

### Resuelto en esta ronda (Módulo de Invitación de Miembros — alcance delimitado)
- **`InviteMemberModal` nuevo** (`app/(app)/home/_components/`, montado en `/home`, solo visible si `activeAccount.accountType === 'ORGANIZATION'`): formulario con `react-hook-form` + `zod` (`_schemas.ts`), correo (`TextField`) y rol (`Select`, poblado por `useSystemRoles()` → `GET /api/v1/roles`, solo mientras el modal está abierto). Al enviar, `useInviteMember()` llama `POST /api/v1/organizations/invite` y cierra el modal + toast al éxito, igual que el patrón ya establecido por `useCreateOrganization`.
- **`lib/api/roles.ts` nuevo**: primera función de API para el catálogo RBAC del backend (`getSystemRolesRequest`). `lib/api/accounts.ts` gana `inviteMemberRequest`.
- **Polyfills nuevos en `jest.setup.ts`** (`ResizeObserver`, `PointerEvent`, `hasPointerCapture`/`setPointerCapture`/`scrollIntoView`): necesarios para poder probar de verdad la interacción con el `Select` de este modal — sin ellos, el popup se queda "cerrado" en jsdom sin importar los clics que se le hagan al trigger. Benefician a cualquier test futuro que use `Select`/`Popover`/`dropdown-menu` (ver sección 8, Tests).
- **Tests nuevos**: `useInviteMember.spec.tsx` (éxito, error con mensaje del backend, error genérico) e `InviteMemberModal.spec.tsx` (no renderiza sin cuenta de organización activa, botón deshabilitado hasta llenar correo+rol, consulta `GET /api/v1/roles` al abrir, envía `{email, roleId}`, estado de carga). 75 tests en total (antes 68).
- **Explícitamente fuera de esta ronda**: el backend no persiste la invitación (ver su README) — el modal solo confirma que el request se envió y fue aceptado por el servidor, no que alguien fue invitado de verdad todavía.

### Resuelto en esta ronda (X-Account-Id con efecto real en documentos)
- **Sin cambios de código de este lado**: `lib/axios.ts` ya mandaba `X-Account-Id`/`X-Organization-Id` desde que se construyó el interceptor (parte del trabajo de Zustand). Lo que cambió fue el backend: ahora valida el header contra una membresía real y filtra `GET /document` por la cuenta activa — ver README de `signature-server` para el detalle (nueva columna `accountId` en documentos, con backfill a la cuenta personal del creador para los documentos existentes).

### Resuelto en esta ronda (tests de componente: AccountSwitcher, OnboardingBanner, CreateOrganizationForm)
- **`AccountSwitcher.spec.tsx`** (nuevo, 6 tests): etiqueta "Cuenta" cuando `activeAccount` no coincide con ninguna entrada del catálogo, "Cuenta personal" vs. nombre de la organización según `accountType`, lista completa del dropdown marcando la cuenta "Activa", cambiar de cuenta actualiza `activeAccount` en el store, y "Crear organización" navega a `/organization/create`.
- **`OnboardingBanner.spec.tsx`** (nuevo, 6 tests): no renderiza nada sin usuario / con `isConfigured` / con ambas sub-banderas en `true`; muestra solo el link correspondiente cuando falta un solo paso, y ambos cuando faltan los dos.
- **`CreateOrganizationForm.spec.tsx`** (nuevo, 3 tests, mockeando `useCreateOrganization` igual que `SignupForm.spec.tsx`): botón deshabilitado hasta llenar ambos campos, `mutate` recibe `name`/`organizationName`, estado de carga mientras la mutación está pendiente.
- **`useCreateOrganization.spec.tsx`** (nuevo, 3 tests, con `renderHook` — primer uso en el proyecto): al éxito inserta la cuenta en `accountsList`, la vuelve `activeAccount`, dispara el toast exacto de la historia y redirige a `/home`; al fallar muestra el mensaje del backend o el genérico, sin tocar el store.

### Resuelto en esta ronda (revalidación de activeAccount + primeros tests de AuthProvider)
- **`AuthProvider` ya revalida `activeAccount` contra el catálogo fresco**: si la cuenta activa persistida ya no aparece en `accountsList` (acceso revocado, organización eliminada), cae a la cuenta personal — antes solo pasaba esto cuando `activeAccount` era `null`. La comparación usa `accountsList` (el store de Zustand, no el `accounts` de React Query) a propósito: ese caché de React Query queda sin invalidar tras crear una organización (ver Escenario 2 / `useCreateOrganization`), así que compararlo directamente habría regresado al usuario a su cuenta personal justo después de crear la organización nueva — un bug que se detectó al diseñar este fix, no en producción.
- **Primeros tests de componente para `AuthProvider`** (`AuthProvider.spec.tsx`, no existía ninguno): cubren el fallback a cuenta personal en la primera sesión, la revalidación cuando la cuenta activa ya no existe, y que NO se toque `activeAccount` cuando sigue siendo válido (el caso de "recién creaste una organización").

### Resuelto en esta ronda (roleId es ahora un UUID real del catálogo RBAC, no un shim sobre un enum)
- **`AccountData.role` (arreglo de enum) → `AccountData.roleId` (UUID único)**: el backend reemplazó el enum-array `AccountMemberEntity.role` por una FK real a su nuevo catálogo RBAC (`Role`/`Permission`/`RolePermission`, expuesto en `GET /api/v1/roles` — ver README de `signature-server`). `toAccountListEntry` (`lib/store/accounts-list.slice.ts`) ya no necesita el shim `raw.role?.[0] ?? null` para forzar un arreglo a caber en el `roleId: string | null` que la historia de Zustand siempre pidió — ahora es un mapeo directo (`roleId: raw.roleId`).
- **Motivo del cambio**: las historias de creación de organización y configuración de Zustand ya especificaban `roleId` (singular, forma de FK) desde el principio; el enum-array fue una solución de compromiso porque en ese momento el backend no tenía ninguna tabla `Role` real. Con el módulo RBAC ya implementado, se cerró esa brecha en vez de dejar el catálogo nuevo sin conectar a nada.
- **Sin cambios en el switcher ni en ninguna lógica de negocio de este lado**: nadie comparaba `roleId` contra un valor conocido (`'OWNER'`, etc.) para decidir qué mostrar, así que el swap de shape no rompió ningún flujo — solo los fixtures de test que hardcodeaban el shape viejo (`role: ['OWNER']` → `roleId: '<uuid>'`) en `useAuthStore.spec.ts`, `AuthProvider.spec.tsx` y `useCreateOrganization.spec.tsx`.
- **Ya no hace falta UI para asignar el `roleId` de una organización recién creada**: el backend asigna el rol de sistema ADMIN de inmediato al creador (ver README de `signature-server`), en vez de dejarlo en `NULL` esperando un flujo de asignación que nunca se construyó. `useCreateOrganization` no necesitó cambios — ya usaba `toAccountListEntry(account)` sobre la respuesta real del backend.

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
- **Edición de información personal**: `/dashboard/personal-documents` (`UserInfoCard`) permite editar `phoneNumber` y `secondaryEmail` vía `PUT /api/v1/users/me/personal-information`. `name`, `lastName`, `curp` y `rfc` son campos de identidad y **no son editables por diseño**: el backend los quitó de `UpdatePersonalInformationDto` (no solo el frontend deja de mandarlos, el endpoint los rechaza si algún otro cliente los envía). El CURP tampoco es editable vía `PATCH /user/:id` (se quitó de `UpdateUserDto`) — se fija una sola vez al crear/registrar el usuario.
- **Firma electrónica avanzada vs simple**: se eliminó del proyecto (landing y cualquier mención de "e.firma"/firma avanzada). El producto solo ofrece firma electrónica simple, resuelta por la credencial (rúbrica + INE) registrada en `/dashboard/personal-documents`.
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
