'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import { TextField } from '@/components/form/text-field';
import { Form } from '@/components/form/form';
import type { DirectoryContact } from '../_requests';
import {
  directoryContactFormValuesOf,
  directoryContactSchema,
  type DirectoryContactFormValues,
} from '../_schemas';

interface DirectoryContactFormDialogProps {
  open: boolean;
  /** Contacto que se edita; `null` abre el modal en modo alta. */
  contact: DirectoryContact | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: DirectoryContactFormValues) => void;
  /** La mutación está en curso: bloquea el envío y el cierre por botón. */
  submitting?: boolean;
}

/**
 * Modal de alta y edición de un contacto del Directorio: el mismo formulario y el mismo esquema
 * Zod (`directoryContactSchema`) para los dos casos.
 *
 * El modo lo decide `contact`: sin contacto es un alta con los campos vacíos; con contacto abre
 * con sus datos para editarlos. Cada vez que se abre, el formulario se reinicia con los valores
 * de ese modo, así que lo escrito en un alta cancelada no reaparece al editar otro contacto.
 *
 * No llama a la API: entrega los valores ya validados (y recortados) a `onSubmit`, y quien lo
 * monta decide qué mutación correr y cuándo cerrarlo.
 *
 * @param props - Apertura, contacto a editar, envío y estado de la mutación.
 * @returns El modal con el formulario.
 *
 * @example
 * ```tsx
 * <DirectoryContactFormDialog
 *   open={dialogOpen}
 *   contact={editingContact}
 *   onOpenChange={setDialogOpen}
 *   onSubmit={handleSubmit}
 *   submitting={mutation.isPending}
 * />
 * ```
 */
export default function DirectoryContactFormDialog({
  open,
  contact,
  onOpenChange,
  onSubmit,
  submitting = false,
}: DirectoryContactFormDialogProps) {
  const isEditing = contact !== null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<DirectoryContactFormValues>({
    resolver: zodResolver(directoryContactSchema),
    mode: 'onChange',
    defaultValues: directoryContactFormValuesOf(contact),
  });

  useEffect(() => {
    if (open) {
      reset(directoryContactFormValuesOf(contact));
    }
  }, [open, contact, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Actualizar contacto' : 'Crear contacto'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Cambia los datos de ${contact.firstName} ${contact.lastName}.`
              : 'Guarda un contacto para reutilizarlo como firmante o testigo.'}
          </DialogDescription>
        </DialogHeader>

        <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup>
            <TextField
              id="directory-contact-first-name"
              label="Nombre"
              placeholder="Ana"
              autoComplete="off"
              error={errors.firstName}
              {...register('firstName')}
            />
            <TextField
              id="directory-contact-last-name"
              label="Apellido"
              placeholder="García"
              autoComplete="off"
              error={errors.lastName}
              {...register('lastName')}
            />
            <TextField
              id="directory-contact-email"
              label="Correo electrónico"
              type="email"
              placeholder="ana@example.com"
              autoComplete="off"
              error={errors.email}
              {...register('email')}
            />
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || submitting}>
              {submitting
                ? 'Guardando...'
                : isEditing
                  ? 'Guardar cambios'
                  : 'Crear contacto'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
