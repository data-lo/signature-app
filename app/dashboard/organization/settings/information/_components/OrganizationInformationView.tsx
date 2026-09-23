'use client';

import { AlertCircle } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useOrganization } from '@/lib/hooks/useOrganization';
import type { OrganizationProfile } from '@/lib/api/organizations';

/** Lo que se pinta donde la organización todavía no capturó un dato. */
export const EMPTY_FIELD_LABEL = 'Sin capturar';

/** Texto del error. Dice qué hacer, no qué falló por dentro. */
export const ORGANIZATION_LOAD_ERROR_MESSAGE =
  'No pudimos cargar la información de la organización. Vuelve a intentarlo en un momento.';

/**
 * Los campos del perfil, en el orden en que se leen: primero cómo se llama la organización
 * —dentro y fuera de la aplicación—, después sus datos fiscales y de contacto.
 *
 * Es una lista de datos y no seis bloques escritos a mano para que el orden y el rótulo de cada
 * campo se lean de un vistazo, y añadir uno sea una línea.
 */
const PROFILE_FIELDS: {
  key: keyof OrganizationProfile;
  label: string;
}[] = [
  { key: 'displayName', label: 'Nombre de visualización' },
  { key: 'name', label: 'Razón social' },
  { key: 'rfc', label: 'RFC' },
  { key: 'phoneNumber', label: 'Teléfono' },
  { key: 'address', label: 'Domicilio' },
  { key: 'domainAllowed', label: 'Dominio permitido' },
];

/**
 * Silueta del perfil mientras llega, con una fila por campo real.
 *
 * @returns El esqueleto de la tarjeta, anunciado como región ocupada.
 *
 * @example
 * ```tsx
 * if (organizationQuery.isPending) return <OrganizationInformationSkeleton />;
 * ```
 */
function OrganizationInformationSkeleton() {
  return (
    <Card
      role="status"
      aria-busy="true"
      aria-label="Cargando la información de la organización"
    >
      <CardContent className="grid gap-6 sm:grid-cols-2">
        {PROFILE_FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-4 w-48 max-w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Los datos de la organización activa, en sólo lectura.
 *
 * **Sólo lectura a propósito.** El backend sabe escribir estos campos desde siempre
 * (`PATCH /account/:id`), pero ninguna respuesta los devolvía: se podía guardar un domicilio y no
 * volver a verlo. Esta pantalla cierra ese hueco por el lado de la lectura; editarlos desde aquí
 * es una historia aparte.
 *
 * Un campo vacío se rotula "Sin capturar" en vez de dejarse en blanco: un hueco no distingue
 * entre un dato que falta y un dato que la pantalla no supo pintar.
 *
 * @returns La tarjeta con el perfil, su esqueleto de carga o el motivo por el que no hay nada que
 *   mostrar.
 *
 * @example
 * ```tsx
 * <OrganizationInformationView />
 * ```
 */
export default function OrganizationInformationView() {
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const { can } = usePermissions();
  const canReadOrganization = can('ORGANIZATION.READ');
  const organizationId = activeAccount?.organizationId ?? null;
  const organizationQuery = useOrganization(
    organizationId,
    canReadOrganization,
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">
          Información de la organización
        </h1>
        <p className="text-sm text-muted-foreground">
          Los datos con los que tu organización se identifica dentro y fuera de
          Firmalo.
        </p>
      </div>

      {renderBody()}
    </div>
  );

  function renderBody() {
    if (activeAccount?.accountType !== 'ORGANIZATION') {
      return (
        <p className="text-sm text-muted-foreground">
          Selecciona una organización para ver su información.
        </p>
      );
    }

    if (!canReadOrganization) {
      return (
        <p className="text-sm text-muted-foreground">
          No tienes permisos para ver la información de esta organización.
        </p>
      );
    }

    if (organizationQuery.isPending) {
      return <OrganizationInformationSkeleton />;
    }

    if (organizationQuery.isError) {
      return (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{ORGANIZATION_LOAD_ERROR_MESSAGE}</span>
        </div>
      );
    }

    const organization = organizationQuery.data;

    return (
      <Card>
        <CardContent>
          {/* Una lista de definiciones y no una tabla: son pares dato-valor de UNA entidad, y en
              móvil se apilan sin el desplazamiento horizontal que arrastraría una tabla. */}
          <dl className="grid gap-6 sm:grid-cols-2">
            {PROFILE_FIELDS.map((field) => {
              const value = organization[field.key];
              const isEmpty = value === null || value === '';

              return (
                <div key={field.key} className="flex flex-col gap-1">
                  <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {field.label}
                  </dt>
                  <dd
                    className={
                      isEmpty
                        ? 'text-sm break-words text-muted-foreground italic'
                        : 'text-sm break-words text-foreground'
                    }
                  >
                    {isEmpty ? EMPTY_FIELD_LABEL : String(value)}
                  </dd>
                </div>
              );
            })}
          </dl>
        </CardContent>
      </Card>
    );
  }
}
