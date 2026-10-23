'use client';

import { isAxiosError } from 'axios';
import { Loader2 } from 'lucide-react';
import { useWatch, type Control } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { FormSelect } from '@/components/form/form-select';
import { FieldError } from '@/components/ui/field';

import { useDocumentApprovers } from '../_hooks/useDocumentApprovers';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

/** Lo que ve el usuario cuando su organización no tiene a nadie que pueda aprobar. */
export const NO_APPROVERS_MESSAGE = 'No hay usuarios aprobadores disponibles';

export const APPROVERS_LOADING_MESSAGE = 'Cargando usuarios aprobadores...';

/**
 * El fallo de la consulta no se confunde con el vacío: "no hay aprobadores" es una respuesta sobre
 * la organización —y la salida es desmarcar la opción o repartir el permiso—, mientras que esto es
 * un problema de la petición y la salida es reintentar.
 */
export const APPROVERS_ERROR_MESSAGE =
  'No se pudieron cargar los usuarios aprobadores. Intenta de nuevo.';

/**
 * Un 403 no se arregla reintentando: el rol del usuario no le deja crear documentos en esta
 * organización, y por lo tanto tampoco configurarles aprobación.
 */
export const APPROVERS_FORBIDDEN_MESSAGE =
  'No tienes permiso para configurar aprobaciones en esta organización.';

/**
 * Selector del usuario que aprobará el documento, dependiente de "Requiere aprobación" (historia
 * "Implementar flujo de aprobación previo al proceso de firma").
 *
 * Vive montado siempre junto al checkbox y es él quien decide no pintarse: así la regla "la
 * consulta sólo corre con la opción activa" es una sola —el `enabled` de la consulta y lo que se
 * renderiza salen del mismo valor observado— en vez de quedar repartida entre este componente y
 * quien lo monta, donde una de las dos podría cambiar sin la otra.
 *
 * Los cuatro estados se muestran y ninguno se omite: cargando, error, sin aprobadores y la lista.
 * El vacío es la respuesta más informativa de las cuatro —dice que la organización todavía no le
 * ha dado a nadie el permiso de aprobar documentos— y por eso no se disfraza de selector vacío.
 */
export default function ApproverUserField({
  control,
}: {
  control: Control<CreateDocumentSignaturesFormValues>;
}) {
  const requiresApproval = useWatch({ control, name: 'requiresApproval' });
  const approversQuery = useDocumentApprovers(requiresApproval);

  if (!requiresApproval) {
    return null;
  }

  if (approversQuery.isLoading) {
    return (
      <p
        role="status"
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {APPROVERS_LOADING_MESSAGE}
      </p>
    );
  }

  if (approversQuery.isError) {
    const isForbidden =
      isAxiosError(approversQuery.error) &&
      approversQuery.error.response?.status === 403;

    if (isForbidden) {
      return <FieldError>{APPROVERS_FORBIDDEN_MESSAGE}</FieldError>;
    }

    return (
      <div className="flex flex-col items-start gap-2">
        <FieldError>{APPROVERS_ERROR_MESSAGE}</FieldError>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void approversQuery.refetch()}
          disabled={approversQuery.isFetching}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  const approvers = approversQuery.data ?? [];

  if (approvers.length === 0) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {NO_APPROVERS_MESSAGE}
      </p>
    );
  }

  return (
    <FormSelect
      control={control}
      name="reviewerUserId"
      id="reviewerUserId"
      label="Usuario aprobador"
      required
      options={approvers}
      placeholder="Selecciona un aprobador"
    />
  );
}
