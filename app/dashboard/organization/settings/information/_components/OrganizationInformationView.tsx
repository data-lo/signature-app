'use client';

import { Loader2 } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TextField } from '@/components/form/text-field';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useOrganization } from '@/lib/hooks/useOrganization';
import type { OrganizationProfile } from '@/lib/api/organizations';

/** Lo que se lee donde la organización todavía no capturó un dato. */
export const EMPTY_FIELD_LABEL = 'Sin capturar';

/** Texto del error. Dice qué hacer, no qué falló por dentro. */
export const ORGANIZATION_LOAD_ERROR_MESSAGE =
  'No pudimos cargar la información de la organización. Vuelve a intentarlo en un momento.';

/**
 * Los campos del perfil, en el orden en que se leen: primero cómo se llama la organización
 * —dentro y fuera de la aplicación—, después sus datos fiscales y de contacto.
 *
 * Es una lista de datos y no seis campos escritos a mano para que el orden y el rótulo de cada
 * uno se lean de un vistazo, y añadir uno sea una línea.
 */
const PROFILE_FIELDS: {
  key: Exclude<keyof OrganizationProfile, 'id' | 'isActive'>;
  label: string;
}[] = [
  { key: 'displayName', label: 'Nombre de visualización' },
  { key: 'name', label: 'Razón social' },
  { key: 'taxId', label: 'RFC' },
  { key: 'phoneNumber', label: 'Teléfono' },
  { key: 'address', label: 'Domicilio' },
  { key: 'domainAllowed', label: 'Dominio permitido' },
];

/**
 * Tarjeta con el perfil de la organización, con la misma estructura que "Mi información" en
 * Información personal (`UserInfoCard`).
 *
 * Toma de aquella el contenedor (`max-w-3xl`, centrado por la vista), el encabezado con
 * `CardTitle`, la rejilla de dos columnas que en móvil se apila en una, y la presentación de cada
 * dato como `TextField` deshabilitado con su etiqueta. Es exactamente como "Mi información"
 * enseña los datos que no se editan desde ahí (nombre, correo, CURP, RFC), así que las dos
 * pantallas se leen igual.
 *
 * Un dato vacío deja el campo en blanco con "Sin capturar" como marcador —el mismo recurso que
 * usa "Mi información" con el RFC ("No registrado")—: un hueco sin rótulo no distingue entre un
 * dato que falta y uno que la pantalla no supo pintar.
 *
 * @param props.organization - Perfil de la organización a mostrar.
 * @returns La tarjeta con los seis campos del perfil.
 *
 * @example
 * ```tsx
 * <OrganizationInfoCard organization={organizationQuery.data} />
 * ```
 */
function OrganizationInfoCard({
  organization,
}: {
  organization: OrganizationProfile;
}) {
  return (
    <Card id="organization-info" className="w-full max-w-3xl scroll-mt-6">
      <CardHeader>
        <CardTitle>Información de la organización</CardTitle>
        <CardDescription>
          Los datos con los que tu organización se identifica dentro y fuera de
          Firmalo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-5 md:grid-cols-2">
          {PROFILE_FIELDS.map((field) => (
            <TextField
              key={field.key}
              id={`organization-${field.key}`}
              label={field.label}
              value={organization[field.key] ?? ''}
              placeholder={EMPTY_FIELD_LABEL}
              disabled
            />
          ))}
        </div>
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
 * Los estados siguen el patrón de Información personal (`PersonalDocumentsView`): mientras carga,
 * el indicador giratorio con su texto; si falla, el mensaje en rojo; con datos, la tarjeta
 * centrada. Los avisos de cuenta personal y de falta de permiso no tienen equivalente allá y se
 * pintan con el mismo texto secundario.
 *
 * @returns La tarjeta con el perfil, el indicador de carga o el motivo por el que no hay nada que
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
    return (
      <div
        role="status"
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Cargando la información de la organización...
      </div>
    );
  }

  if (organizationQuery.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {ORGANIZATION_LOAD_ERROR_MESSAGE}
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <OrganizationInfoCard organization={organizationQuery.data} />
    </div>
  );
}
