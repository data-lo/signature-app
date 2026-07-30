'use client';

import { useEffect } from 'react';
import { useController, type Control } from 'react-hook-form';
import { Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

const HELP_TEXT =
  'Si este documento requiere aprobación, será enviado a un usuario con los permisos necesarios dentro de su organización. Una vez que este usuario lo apruebe, se enviará la notificación a los colaboradores para su firma.';

/**
 * Bug corregido: "Requiere aprobación" depende de que exista alguien con permisos dentro de una
 * organización para aprobar el documento (ver HELP_TEXT) — una cuenta PERSONAL no tiene
 * miembros ni permisos, así que la opción no debe ni mostrarse ahí. No solo se oculta: si el
 * usuario ya la había activado y cambia a su cuenta personal sin recargar (AccountSwitcher no
 * desmonta este formulario), se fuerza el valor a false para que el submit nunca la arrastre.
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

  useEffect(() => {
    if (!isOrganization && field.value) {
      field.onChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOrganization]);

  if (!isOrganization) {
    return null;
  }

  return (
    <Field orientation="horizontal" className="items-center">
      <Checkbox
        id="requiresApproval"
        checked={field.value}
        onCheckedChange={(checked) => field.onChange(checked === true)}
      />
      <FieldLabel htmlFor="requiresApproval" className="flex items-center gap-1.5">
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
      </FieldLabel>
    </Field>
  );
}
