import type { CollaboratorFormValues } from '../_schemas';

/**
 * Configuración de los campos de texto de un participante (`CollaboratorFormItem`). Existe para
 * quitar la repetición de bloques `<Controller>` idénticos por campo, sin perder tipado: `name`
 * está acotado a las llaves reales del colaborador, así que renombrar un campo del esquema
 * rompe la compilación aquí en vez de fallar en silencio en tiempo de ejecución.
 */
export interface CollaboratorFieldConfig {
  name: Extract<
    keyof CollaboratorFormValues,
    'firstName' | 'lastName' | 'email'
  >;
  label: string;
  type: 'text' | 'email';
  placeholder?: string;
  required: boolean;
}

/** Nombre y apellido: se renderizan juntos en una grilla de dos columnas. */
export const COLLABORATOR_NAME_FIELDS: readonly CollaboratorFieldConfig[] = [
  {
    name: 'firstName',
    label: 'Nombre(s)',
    type: 'text',
    placeholder: 'Juan',
    required: true,
  },
  {
    name: 'lastName',
    label: 'Apellido',
    type: 'text',
    placeholder: 'Pérez',
    required: true,
  },
];

export const COLLABORATOR_EMAIL_FIELD: CollaboratorFieldConfig = {
  name: 'email',
  label: 'Email',
  type: 'email',
  placeholder: 'juan.perez@correo.com',
  required: true,
};
