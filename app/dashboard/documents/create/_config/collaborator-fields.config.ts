import type { SignerFormValues, WitnessFormValues } from '../_schemas';

/**
 * Configuración de los campos de texto de un participante (`CollaboratorFormItem`). Existe para
 * quitar la repetición de bloques `<Controller>` idénticos por campo, sin perder tipado: `name`
 * está acotado a las llaves reales del colaborador, así que renombrar un campo del esquema
 * rompe la compilación aquí en vez de fallar en silencio en tiempo de ejecución. Se arma sobre la
 * UNIÓN de llaves de firmante y testigo (no sobre `keyof CollaboratorFormValues`, que al ser
 * unión discriminada solo expone las llaves comunes): `signerTaxId` solo existe en el firmante.
 */
export interface CollaboratorFieldConfig {
  name: Extract<
    keyof SignerFormValues | keyof WitnessFormValues,
    'firstName' | 'lastName' | 'email' | 'signerTaxId'
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
 * RFC opcional del firmante, sólo con firma FIEL (la decisión de mostrarlo es del componente, ver
 * `CollaboratorFormItem`). Si se captura, al firmar debe coincidir con el del certificado.
 */
export const COLLABORATOR_SIGNER_TAX_ID_FIELD: CollaboratorFieldConfig = {
  name: 'signerTaxId',
  label: 'RFC (opcional)',
  type: 'text',
  placeholder: 'PEAJ800101ABC',
  required: false,
};
