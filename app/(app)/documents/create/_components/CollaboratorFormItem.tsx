'use client';

import { Controller, useWatch, type Control, type FieldErrors } from 'react-hook-form';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

interface CollaboratorFormItemProps {
  index: number;
  control: Control<CreateDocumentSignaturesFormValues>;
  errors: FieldErrors<CreateDocumentSignaturesFormValues>;
  onRemove: () => void;
}

/**
 * Un bloque del arreglo unificado `collaborators` (ver historia "Frontend: Carga de Documentos
 * y Configuración de Firmantes") — el mismo componente renderiza SIGNER y VIEWER, mostrando
 * solo los campos que aplican a cada uno:
 *  - SIGNER: nombre/apellido/email siempre; checkbox "¿firma avanzada?" que revela RFC
 *    (obligatorio) y el checkbox de 2FA (interactivo) cuando está activo; si no, RFC
 *    desaparece y 2FA se fuerza a true sin mostrarse (ver toBackendCollaboratorPayload).
 *  - VIEWER: nombre/apellido/email/RFC siempre, sin nada de firma/2FA/posición.
 */
export default function CollaboratorFormItem({
  index,
  control,
  errors,
  onRemove,
}: CollaboratorFormItemProps) {
  const collaboratorType = useWatch({
    control,
    name: `collaborators.${index}.collaboratorType`,
  });
  const signatureType = useWatch({
    control,
    name: `collaborators.${index}.signatureType` as `collaborators.${number}.signatureType`,
  });

  const isSigner = collaboratorType === 'SIGNER';
  const isAdvanced = isSigner && signatureType === 'ADVANCED';
  const itemError = errors.collaborators?.[index] as
    | Record<string, { message?: string } | undefined>
    | undefined;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-input p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {isSigner ? 'Firmante' : 'Espectador'}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          aria-label="Quitar participante"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Controller
          control={control}
          name={`collaborators.${index}.firstName`}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor={`collab-${index}-firstName`}>
                Nombre(s)
              </FieldLabel>
              <Input id={`collab-${index}-firstName`} {...field} />
              <FieldError errors={[itemError?.firstName]} />
            </Field>
          )}
        />

        <Controller
          control={control}
          name={`collaborators.${index}.lastName`}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor={`collab-${index}-lastName`}>
                Apellido
              </FieldLabel>
              <Input id={`collab-${index}-lastName`} {...field} />
              <FieldError errors={[itemError?.lastName]} />
            </Field>
          )}
        />
      </div>

      <Controller
        control={control}
        name={`collaborators.${index}.email`}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={`collab-${index}-email`}>Email</FieldLabel>
            <Input id={`collab-${index}-email`} type="email" {...field} />
            <FieldError errors={[itemError?.email]} />
          </Field>
        )}
      />

      {isSigner && (
        <Controller
          control={control}
          name={`collaborators.${index}.signatureType`}
          render={({ field }) => (
            <Field orientation="horizontal">
              <Checkbox
                id={`collab-${index}-advanced`}
                checked={field.value === 'ADVANCED'}
                onCheckedChange={(checked) => {
                  field.onChange(checked ? 'ADVANCED' : 'SIMPLE');
                }}
              />
              <FieldLabel htmlFor={`collab-${index}-advanced`}>
                ¿Requiere firma avanzada (FIEL)?
              </FieldLabel>
            </Field>
          )}
        />
      )}

      {(isAdvanced || collaboratorType === 'VIEWER') && (
        <Controller
          control={control}
          name={`collaborators.${index}.rfc`}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor={`collab-${index}-rfc`}>RFC</FieldLabel>
              <Input id={`collab-${index}-rfc`} {...field} value={field.value ?? ''} />
              <FieldError errors={[itemError?.rfc]} />
            </Field>
          )}
        />
      )}

      {isAdvanced && (
        <Controller
          control={control}
          name={`collaborators.${index}.requiresTwoFactorAuth`}
          render={({ field }) => (
            <Field orientation="horizontal">
              <Checkbox
                id={`collab-${index}-2fa`}
                checked={field.value === true}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
              <FieldLabel htmlFor={`collab-${index}-2fa`}>
                Código de verificación (2FA)
              </FieldLabel>
            </Field>
          )}
        />
      )}
    </div>
  );
}
