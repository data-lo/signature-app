import type { SignerFormValues, ViewerFormValues } from '../_schemas';

/**
 * Configuración de los campos de texto de un participante (`CollaboratorFormItem`). Existe para
 * quitar la repetición de bloques `<Controller>` idénticos por campo, sin perder tipado: `name`
 * está acotado a las llaves reales del colaborador, así que renombrar un campo del esquema
 * rompe la compilación aquí en vez de fallar en silencio en tiempo de ejecución. Se arma sobre la
 * UNIÓN de llaves de firmante y espectador (no sobre `keyof CollaboratorFormValues`, que al ser
 * unión discriminada solo expone las llaves comunes): `rfc` ya solo existe en el espectador.
 */
export interface CollaboratorFieldConfig {
  name: Extract<
    keyof SignerFormValues | keyof ViewerFormValues,
    'firstName' | 'lastName' | 'email' | 'rfc'
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

/**
 * El RFC solo se pide a los espectadores, y ahí es obligatorio (de ahí `required: true`; la
 * decisión de mostrarlo o no es del componente, ver `CollaboratorFormItem`). A los firmantes ya no
 * se les pide en ningún flujo — ver historia "Selección de tipo de firma al crear documentos".
 */
export const COLLABORATOR_RFC_FIELD: CollaboratorFieldConfig = {
  name: 'rfc',
  label: 'RFC',
  type: 'text',
  placeholder: 'PEAJ800101ABC',
  required: true,
};
