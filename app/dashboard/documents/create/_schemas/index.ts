/**
 * Punto de entrada de los esquemas de la pantalla de carga y configuración de documentos. Cada
 * sección tiene su propio archivo de esquema (`document-*.schema.ts`) y el formulario completo se
 * compone en `create-document-signatures.schema.ts`; este barril existe para que el resto de la
 * ruta siga importando desde `'../_schemas'` sin conocer esa separación interna.
 */
export {
  signaturePositionSchema,
  type SignaturePosition,
} from './signature-position.schema';

export {
  signerSchema,
  witnessSchema,
  collaboratorSchema,
  emptySigner,
  emptyWitness,
  countSigners,
  countWitnesses,
  isSelfSigner,
  findSelfSignerIndex,
  type SignerFormValues,
  type WitnessFormValues,
  type CollaboratorFormValues,
} from './collaborator.schema';

export {
  documentParticipantsSchema,
  type DocumentParticipantsFormValues,
} from './document-participants.schema';

export {
  documentConfigurationSchema,
  REVIEWER_REQUIRED_MESSAGE,
  DOCUMENT_SIGNATURE_TYPES,
  type DocumentSignatureType,
  type DocumentConfigurationFormValues,
} from './document-configuration.schema';

export {
  createDocumentSignaturesSchema,
  CREATE_DOCUMENT_DEFAULT_VALUES,
  type CreateDocumentSignaturesFormValues,
} from './create-document-signatures.schema';
