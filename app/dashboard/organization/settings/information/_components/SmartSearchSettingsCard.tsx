'use client';

import { Loader2 } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FormToggleShell } from '@/components/form/form-field';
import { Switch } from '@/components/ui/switch';
import type { OrganizationProfile } from '@/lib/api/organizations';

import {
  DOCUMENT_INDEXING_ERROR_MESSAGE,
  useUpdateDocumentIndexing,
} from '../_hooks/useUpdateDocumentIndexing';

/** Rótulo del interruptor; también es su nombre accesible. */
export const DOCUMENT_INDEXING_LABEL = 'Habilitar indexación de documentos';

/** Advertencia fija bajo el interruptor: qué se pierde al apagarlo. */
export const DOCUMENT_INDEXING_WARNING =
  'Si desactivas esta opción, no podrás usar nuestra búsqueda inteligente.';

/** Aviso para quien ve la tarjeta sin poder cambiarla. */
export const DOCUMENT_INDEXING_READ_ONLY_MESSAGE =
  'Sólo quien puede editar la información de la organización puede cambiar esta opción.';

/** Id del interruptor, que enlaza su etiqueta. */
const SWITCH_ID = 'organization-indexDocuments';

/**
 * Tarjeta "Búsqueda inteligente": el interruptor que decide si los documentos de la organización
 * pueden entrar a la búsqueda.
 *
 * Va debajo de "Información de la organización" y en tarjeta aparte porque no es un dato de la
 * organización sino una preferencia sobre sus documentos: se guarda sola, al cambiar el
 * interruptor, sin pasar por el botón "Guardar cambios" del perfil.
 *
 * **El interruptor nunca muestra un valor que no esté guardado.** Mientras la petición corre
 * enseña el valor pedido, deshabilitado y con "Guardando..."; al terminar, lo que manda es el
 * perfil en caché. Si la petición falla la caché no cambió, así que vuelve solo al valor
 * persistido y se avisa del error (toast y mensaje en la tarjeta).
 *
 * Quien tiene `ORGANIZATION.READ` la ve; sólo con `ORGANIZATION.UPDATE` el interruptor se puede
 * cambiar.
 *
 * @param props.organization - Perfil de la organización; de él sale el valor persistido.
 * @param props.canEdit - Si quien la ve tiene `ORGANIZATION.UPDATE`.
 * @returns La tarjeta con el interruptor, la advertencia y el estado del guardado.
 *
 * @example
 * ```tsx
 * <SmartSearchSettingsCard organization={organizationQuery.data} canEdit={canUpdateOrganization} />
 * ```
 */
export default function SmartSearchSettingsCard({
  organization,
  canEdit,
}: {
  organization: OrganizationProfile;
  canEdit: boolean;
}) {
  const indexingMutation = useUpdateDocumentIndexing(organization.id);

  const isSaving = indexingMutation.isPending;
  const checked = isSaving
    ? indexingMutation.variables
    : organization.indexDocuments;

  function handleCheckedChange(nextValue: boolean) {
    if (!canEdit || isSaving || nextValue === organization.indexDocuments) {
      return;
    }
    indexingMutation.mutate(nextValue);
  }

  return (
    <Card
      id="organization-smart-search"
      className="w-full max-w-3xl scroll-mt-6"
    >
      <CardHeader>
        <CardTitle>Búsqueda inteligente</CardTitle>
        <CardDescription>
          Analizamos el contenido de tus documentos para que puedas encontrarlos
          por lo que dicen y no sólo por su nombre.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <FormToggleShell
          id={SWITCH_ID}
          label={DOCUMENT_INDEXING_LABEL}
          description={DOCUMENT_INDEXING_WARNING}
        >
          <Switch
            id={SWITCH_ID}
            checked={checked}
            onCheckedChange={(isChecked) =>
              handleCheckedChange(isChecked === true)
            }
            disabled={!canEdit || isSaving}
            aria-describedby={`${SWITCH_ID}-status`}
          />
        </FormToggleShell>

        <div id={`${SWITCH_ID}-status`} className="text-sm">
          {isSaving ? (
            <span
              role="status"
              className="flex items-center gap-2 text-muted-foreground"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Guardando...
            </span>
          ) : indexingMutation.isError ? (
            <span role="alert" className="text-destructive">
              {DOCUMENT_INDEXING_ERROR_MESSAGE}
            </span>
          ) : !canEdit ? (
            <span className="text-muted-foreground">
              {DOCUMENT_INDEXING_READ_ONLY_MESSAGE}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
