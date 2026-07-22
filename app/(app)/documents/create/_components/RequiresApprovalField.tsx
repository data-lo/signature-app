'use client';

import { Controller, type Control } from 'react-hook-form';
import { Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

const HELP_TEXT =
  'Si este documento requiere aprobación, será enviado a un usuario con los permisos necesarios dentro de su organización. Una vez que este usuario lo apruebe, se enviará la notificación a los colaboradores para su firma.';

export default function RequiresApprovalField({
  control,
}: {
  control: Control<CreateDocumentSignaturesFormValues>;
}) {
  return (
    <Controller
      control={control}
      name="requiresApproval"
      render={({ field }) => (
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
      )}
    />
  );
}
