'use client';

import { Loader2 } from 'lucide-react';
import { useWatch, type Control } from 'react-hook-form';
import { FormSelect } from '@/components/form/form-select';
import { FieldError } from '@/components/ui/field';
import { useDocumentApprovers } from '../_hooks/useDocumentApprovers';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

/** Lo que ve el usuario cuando su organización no tiene a nadie que pueda aprobar. */
export const NO_APPROVERS_MESSAGE = 'No hay usuarios aprobadores disponibles';

export const APPROVERS_LOADING_MESSAGE = 'Cargando usuarios aprobadores...';

/**
 * El fallo de la consulta no se confunde con el vacío: "no hay aprobadores" es una respuesta
 * sobre la organización —y la salida es desmarcar la opción o repartir el permiso—, mientras que
 * esto es un problema de la petición y la salida es reintentar.
 */
export const APPROVERS_ERROR_MESSAGE =
  'No se pudieron cargar los usuarios aprobadores. Intenta de nuevo.';

/**
 * Selector del usuario que aprobará el documento, dependiente de "Requiere aprobación" (ver
 * historia "Selección de aprobador al requerir aprobación en nuevo documento").
 *
 * Vive montado siempre junto al checkbox y es él quien decide no pintarse: así la regla "la
 * consulta sólo corre con la opción activa" es una sola —el `enabled` de la consulta y lo que se
 * renderiza salen del mismo valor observado— en vez de quedar repartida entre este componente y
 * quien lo monta, donde una de las dos podría cambiar sin la otra.
 *
 * Los cuatro estados se muestran, ninguno se omite: cargando, error, sin aprobadores y la lista.
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
    return <FieldError>{APPROVERS_ERROR_MESSAGE}</FieldError>;
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
      name="approverUserId"
      id="approverUserId"
      label="Usuario aprobador"
      required
      options={approvers}
      placeholder="Selecciona un aprobador"
    />
  );
}
