'use client';

import { useEffect } from 'react';
import { useController, type Control } from 'react-hook-form';
import { Info } from 'lucide-react';
import { FormCheckbox } from '@/components/form/form-checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';
import ApproverUserField from './ApproverUserField';

const HELP_TEXT =
  'Si este documento requiere aprobación, será enviado a un usuario con los permisos necesarios dentro de su organización. Una vez que este usuario lo apruebe, se enviará la notificación a los colaboradores para su firma.';

/**
 * Bug corregido: "Requiere aprobación" depende de que exista alguien con permisos dentro de una
 * organización para aprobar el documento (ver HELP_TEXT) — una cuenta PERSONAL no tiene
 * miembros ni permisos, así que la opción no debe ni mostrarse ahí. No solo se oculta: si el
 * usuario ya la había activado y cambia a su cuenta personal sin recargar (AccountSwitcher no
 * desmonta este formulario), se fuerza el valor a false para que el submit nunca la arrastre.
 *
 * Desde la historia "Selección de aprobador al requerir aprobación en nuevo documento" la opción
 * ya no viaja sola: marcarla obliga a elegir a QUIÉN se le pide la aprobación, y ese selector
 * (`ApproverUserField`) se monta aquí porque su existencia depende por completo de este
 * checkbox.
 */
export default function RequiresApprovalField({
  control,
}: {
  control: Control<CreateDocumentSignaturesFormValues>;
}) {
  const isOrganization =
    useAuthStore((state) => state.activeAccount?.accountType) ===
    'ORGANIZATION';
  const { field } = useController({ control, name: 'requiresApproval' });
  const { field: reviewerField } = useController({
    control,
    name: 'reviewerUserId',
  });
  const requiresApproval = field.value;
  const reviewerUserId = reviewerField.value;

  useEffect(() => {
    if (!isOrganization && field.value) {
      field.onChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOrganization]);

  /**
   * El aprobador elegido se descarta en cuanto la aprobación deja de estar activa, la desmarque el
   * usuario o la fuerce el efecto de arriba al cambiar a una cuenta personal. Sin esto, un
   * `reviewerUserId` viejo seguiría en los valores del formulario y viajaría con un documento que
   * ya no requiere aprobación — invisible en pantalla, porque el selector desaparece con el
   * checkbox, y rechazado por el backend, que no admite las dos cosas a la vez.
   */
  useEffect(() => {
    if (!requiresApproval && reviewerUserId !== null) {
      reviewerField.onChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiresApproval]);

  if (!isOrganization) {
    return null;
  }

  return (
    <>
      <FormCheckbox
        control={control}
        name="requiresApproval"
        id="requiresApproval"
        label={
          <span className="flex items-center gap-1.5">
            Requiere aprobación
            <Tooltip>
              <TooltipTrigger
                aria-label="¿Qué significa 'Requiere aprobación'?"
                className="text-muted-foreground hover:text-foreground"
              >
                <Info className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>{HELP_TEXT}</TooltipContent>
            </Tooltip>
          </span>
        }
      />
      <ApproverUserField control={control} />
    </>
  );
}
