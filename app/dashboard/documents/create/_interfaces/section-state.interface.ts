/**
 * Estado con el que cada sección visual de la pantalla de carga y configuración se dibuja a sí
 * misma. Es un contrato de presentación, no de datos del backend: quién decide estos valores es
 * `_section-rules.ts` (reglas explícitas), y las secciones solo los reciben — así una sección
 * nunca tiene que averiguar por su cuenta si el documento ya se cargó o si otra sección está en
 * error.
 */
export interface SectionState {
  /** `false` deshabilita la interacción con la sección (se dibuja atenuada e `inert`). */
  isEnabled: boolean;
  /** Hay una operación en curso que afecta el contenido de la sección. */
  isLoading: boolean;
  /** Hay un error propio de la sección que el usuario debe ver. */
  hasError: boolean;
  /** Mensaje del error; solo tiene sentido junto con `hasError`. */
  errorMessage?: string;
  /**
   * Qué le falta al usuario para que la sección se habilite (p. ej. "carga un PDF"). Solo tiene
   * sentido junto con `isEnabled: false`, y es opcional: hay secciones que se deshabilitan sin
   * que haya nada que el usuario pueda hacer al respecto.
   */
  missingRequirementMessage?: string;
}
