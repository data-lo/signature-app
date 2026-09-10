'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { TextField } from '@/components/form/text-field';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ORGANIZATION_ACCOUNT_TOOLTIP,
  useCanCreateOrganization,
} from '@/lib/hooks/useCanCreateOrganization';
import {
  createOrganizationSchema,
  type CreateOrganizationFormValues,
} from '../_schemas';
import { useCreateOrganization } from '../_hooks/useCreateOrganization';
import { Form } from '@/components/form/form';

export default function CreateOrganizationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CreateOrganizationFormValues>({
    resolver: zodResolver(createOrganizationSchema),
    mode: 'onChange',
  });

  const createOrganizationMutation = useCreateOrganization();
  const puedeCrearOrganizacion = useCanCreateOrganization();

  /**
   * El formulario también se bloquea, y no sólo la opción del menú que lleva hasta él: a esta
   * pantalla se llega igual escribiendo la URL, y ahí un botón que envía para recibir un 403 le
   * hace escribir a la cuenta gratuita el nombre y la razón social de una organización que nunca
   * se va a crear.
   *
   * Va en `aria-disabled` y no en `disabled` por lo de siempre: un botón deshabilitado de verdad
   * no recibe puntero ni foco, así que el tooltip que explica el bloqueo no se vería nunca.
   * `handleSubmit` lo vuelve a comprobar porque el botón no es la única forma de enviar —Enter en
   * cualquier campo también lo hace— y prevenir el clic no cubre ese camino.
   */
  const botonBloqueado = (
    <Button
      type="submit"
      className="w-full aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
      aria-disabled={true}
      onClick={(event) => event.preventDefault()}
    >
      Crear organización
    </Button>
  );

  return (
    <Card className="max-w-xl w-full">
      <CardHeader>
        <CardTitle>Crear organización</CardTitle>
        <CardDescription>
          Crea un nuevo espacio de trabajo para tu organización. Podrás
          alternar entre tu cuenta personal y la de la organización desde el
          selector de cuentas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form
          onSubmit={handleSubmit((values) => {
            if (!puedeCrearOrganizacion) {
              return;
            }
            createOrganizationMutation.mutate(values);
          })}
        >
          <FieldGroup>
            <TextField
              id="name"
              label="Nombre de visualización"
              placeholder="Acme"
              error={errors.name}
              {...register('name')}
            />

            <TextField
              id="organizationName"
              label="Razón social"
              placeholder="Acme Corp S.A. de C.V."
              error={errors.organizationName}
              {...register('organizationName')}
            />

            {puedeCrearOrganizacion ? (
              <Button
                type="submit"
                className="w-full"
                disabled={!isValid || createOrganizationMutation.isPending}
              >
                {createOrganizationMutation.isPending
                  ? 'Creando organización...'
                  : 'Crear organización'}
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger className="w-full" render={botonBloqueado} />
                <TooltipContent>{ORGANIZATION_ACCOUNT_TOOLTIP}</TooltipContent>
              </Tooltip>
            )}
          </FieldGroup>
        </Form>
      </CardContent>
    </Card>
  );
}
