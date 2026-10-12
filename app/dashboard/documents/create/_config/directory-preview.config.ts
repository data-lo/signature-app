/**
 * Un contacto del Directorio tal como lo pinta el modal de selección: sólo nombre y apellido.
 *
 * Es la forma mínima que necesita la interfaz. Cuando el modal se conecte a
 * `GET /api/v1/directory/contacts`, la respuesta trae más campos (correo, RFC, teléfono) que el
 * modal puede ignorar o empezar a mostrar.
 */
export interface DirectoryPreviewContact {
  id: string;
  firstName: string;
  lastName: string;
}

/**
 * Contactos SIMULADOS para visualizar el modal del Directorio.
 *
 * La historia de esta pantalla es sólo de interfaz: no consulta la API ni guarda nada. Esta lista
 * existe para que el modal tenga algo que mostrar y se reemplaza por la respuesta real del
 * directorio de la cuenta activa al integrarlo. Los nombres y apellidos se muestran tal como
 * llegan: normalizarlos es responsabilidad exclusiva del backend.
 */
export const DIRECTORY_PREVIEW_CONTACTS: readonly DirectoryPreviewContact[] = [
  { id: 'preview-1', firstName: 'Ana', lastName: 'García López' },
  { id: 'preview-2', firstName: 'Carlos', lastName: 'Hernández Ruiz' },
  { id: 'preview-3', firstName: 'María José', lastName: 'Martínez Soto' },
  { id: 'preview-4', firstName: 'Luis', lastName: 'Ramírez Ortega' },
  { id: 'preview-5', firstName: 'Sofía', lastName: 'Torres Medina' },
];
