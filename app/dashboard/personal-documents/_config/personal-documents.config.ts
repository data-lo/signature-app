/**
 * Definición de los dos documentos que componen "Identidad y firma". Las tres vistas de la
 * sección (sin documentos, incompleta y completa) muestran las mismas dos tarjetas, así que sus
 * etiquetas, formatos y límites viven aquí y no repetidos en cada una.
 */

/** Nombre del documento en la API (`PATCH`/`DELETE` de documentos personales). */
export type PersonalDocumentField = 'ine' | 'signature';

export interface PersonalDocumentConfig {
  field: PersonalDocumentField;
  /** Id del input; coincide con el campo del formulario de alta (ver `_schemas.ts`). */
  inputId: 'ineFile' | 'signatureFile';
  label: string;
  /** Formatos y peso admitidos; espeja los límites del backend validados en `_schemas.ts`. */
  hint: string;
  accept: string;
  maxFileSizeMB: number;
  /** El documento dentro de una frase: "Falta tu firma digital", "¿Eliminar tu firma digital?". */
  possessiveName: string;
}

export const INE_DOCUMENT: PersonalDocumentConfig = {
  field: 'ine',
  inputId: 'ineFile',
  label: 'Identificación (INE)',
  hint: 'PDF, JPG o PNG. Máximo 20MB.',
  accept: 'application/pdf,image/jpeg,image/png',
  maxFileSizeMB: 20,
  possessiveName: 'tu identificación (INE)',
};

export const SIGNATURE_DOCUMENT: PersonalDocumentConfig = {
  field: 'signature',
  inputId: 'signatureFile',
  label: 'Firma digital',
  hint: 'Formato PNG. Máximo 10MB.',
  accept: 'image/png',
  maxFileSizeMB: 10,
  possessiveName: 'tu firma digital',
};

export function getPersonalDocumentConfig(
  field: PersonalDocumentField,
): PersonalDocumentConfig {
  return field === 'ine' ? INE_DOCUMENT : SIGNATURE_DOCUMENT;
}
