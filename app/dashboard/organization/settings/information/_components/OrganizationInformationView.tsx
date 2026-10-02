'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { Form } from '@/components/form/form';
import { TextField } from '@/components/form/text-field';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useOrganization } from '@/lib/hooks/useOrganization';
import type { OrganizationProfile } from '@/lib/api/organizations';

import {
  organizationInformationSchema,
  toOrganizationFormValues,
  toUpdateOrganizationPayload,
  type OrganizationInformationField,
  type OrganizationInformationFormValues,
} from '../_schemas';
import { useUpdateOrganization } from '../_hooks/useUpdateOrganization';

import SmartSearchSettingsCard from './SmartSearchSettingsCard';

/** Lo que se lee donde la organización todavía no capturó un dato. */
export const EMPTY_FIELD_LABEL = 'Sin capturar';

/** Texto del error. Dice qué hacer, no qué falló por dentro. */
export const ORGANIZATION_LOAD_ERROR_MESSAGE =
  'No pudimos cargar la información de la organización. Vuelve a intentarlo en un momento.';

/**
 * Los campos del perfil, en el orden en que se leen: primero cómo se llama la organización
 * —dentro y fuera de la aplicación—, después sus datos fiscales y de contacto.
 *
 * Es una lista de datos y no seis campos escritos a mano para que el orden, el rótulo y el
 * ejemplo de cada uno se lean de un vistazo, y añadir uno sea una línea. El ejemplo es el
 * `placeholder` en modo edición; en sólo lectura se usa `EMPTY_FIELD_LABEL`.
 */
const PROFILE_FIELDS: {
  key: OrganizationInformationField;
  label: string;
  example: string;
  type?: string;
}[] = [
  { key: 'displayName', label: 'Nombre de visualización', example: 'Acme' },
  { key: 'name', label: 'Razón social', example: 'Acme Corp S.A. de C.V.' },
  { key: 'taxId', label: 'RFC', example: 'ACM010101AAA' },
  { key: 'phoneNumber', label: 'Teléfono', example: '5512345678', type: 'tel' },
  { key: 'address', label: 'Domicilio', example: 'Av. Reforma 123, CDMX' },
  { key: 'domainAllowed', label: 'Dominio permitido', example: 'empresa.com' },
];

/**
 * Formulario editable del perfil, para quien tiene `ORGANIZATION.UPDATE`.
 *
 * Valida con el mismo esquema que el backend (`organizationInformationSchema`), muestra cada
 * error junto a su campo y guarda sólo lo que se modificó. El botón se habilita en cuanto hay un
 * cambio; la validación completa corre al presionarlo, para que un dato guardado antes de que
 * existieran estas reglas no deje el botón apagado sin explicación. Al guardar, el formulario se
 * reinicia con lo que devolvió el backend (ver `useUpdateOrganization`).
 *
 * @param props.organization - Perfil de la organización a editar.
 * @returns El formulario con los seis campos y el botón de guardar.
 *
 * @example
 * ```tsx
 * <OrganizationInfoForm organization={organizationQuery.data} />
 * ```
 */
function OrganizationInfoForm({
  organization,
}: {
  organization: OrganizationProfile;
}) {
  const updateMutation = useUpdateOrganization(organization.id);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<OrganizationInformationFormValues>({
    resolver: zodResolver(organizationInformationSchema),
    mode: 'onChange',
    values: toOrganizationFormValues(organization),
  });

  function onSubmit(values: OrganizationInformationFormValues) {
    // El botón ya se deshabilita mientras guarda; esto cubre el envío con Enter desde un campo,
    // que no pasa por el botón.
    if (updateMutation.isPending) return;

    const payload = toUpdateOrganizationPayload(values, dirtyFields);
    if (Object.keys(payload).length === 0) return;

    updateMutation.mutate(payload);
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <div className="grid gap-5 md:grid-cols-2">
          {PROFILE_FIELDS.map((field) => (
            <TextField
              key={field.key}
              id={`organization-${field.key}`}
              label={field.label}
              type={field.type}
              placeholder={field.example}
              error={errors[field.key]}
              readOnly={updateMutation.isPending}
              {...register(field.key)}
            />
          ))}
        </div>

        <div>
          <Button
            type="submit"
            size="sm"
            disabled={!isDirty || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </FieldGroup>
    </Form>
  );
}

/**
 * Tarjeta con el perfil de la organización, con la misma estructura que "Mi información" en
 * Información personal (`UserInfoCard`).
 *
 * Toma de aquella el contenedor (`max-w-3xl`, centrado por la vista), el encabezado con
 * `CardTitle` y la rejilla de dos columnas que en móvil se apila en una.
 *
 * **Con `ORGANIZATION.UPDATE` el contenido es el formulario** (`OrganizationInfoForm`). **Sin él
 * es de sólo lectura**: cada dato como `TextField` deshabilitado, igual que "Mi información"
 * enseña los datos que no se editan desde ahí. Un dato vacío deja el campo en blanco con "Sin
 * capturar" como marcador: un hueco sin rótulo no distingue entre un dato que falta y uno que la
 * pantalla no supo pintar.
 *
 * @param props.organization - Perfil de la organización a mostrar.
 * @param props.canEdit - Si quien la ve tiene `ORGANIZATION.UPDATE`.
 * @returns La tarjeta con los seis campos del perfil.
 *
 * @example
 * ```tsx
 * <OrganizationInfoCard organization={organizationQuery.data} canEdit={canUpdateOrganization} />
 * ```
 */
function OrganizationInfoCard({
  organization,
  canEdit,
}: {
  organization: OrganizationProfile;
  canEdit: boolean;
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
        {canEdit ? (
          <OrganizationInfoForm organization={organization} />
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Los datos de la organización activa: editables con `ORGANIZATION.UPDATE`, de sólo lectura sin él.
 *
 * Carga el perfil con `GET /organizations/:organizationId` y lo guarda con
 * `PATCH /organizations/:organizationId` (ver `useUpdateOrganization`). Los permisos se deciden
 * aquí con `usePermissions`, igual que el backend los decide en `PermissionsGuard`: la pantalla
 * sólo evita ofrecer lo que el servidor va a rechazar.
 *
 * Debajo del perfil va la tarjeta "Búsqueda inteligente" (`SmartSearchSettingsCard`), que sale
 * de la misma consulta y sigue la misma regla de permisos: se ve con lectura y se cambia con
 * `ORGANIZATION.UPDATE`.
 *
 * Los estados siguen el patrón de Información personal (`PersonalDocumentsView`): mientras carga,
 * el indicador giratorio con su texto; si falla, el mensaje en rojo; con datos, las tarjetas
 * centradas. Los avisos de cuenta personal y de falta de permiso no tienen equivalente allá y se
 * pintan con el mismo texto secundario.
 *
 * @returns Las tarjetas del perfil y de Búsqueda inteligente, el indicador de carga o el motivo
 *   por el que no hay nada que mostrar.
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
  const canUpdateOrganization = can('ORGANIZATION.UPDATE');
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
      <OrganizationInfoCard
        organization={organizationQuery.data}
        canEdit={canUpdateOrganization}
      />
      <SmartSearchSettingsCard
        organization={organizationQuery.data}
        canEdit={canUpdateOrganization}
      />
    </div>
  );
}
