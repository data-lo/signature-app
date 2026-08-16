/** Convierte nombres capturados en formularios a formato legible: “ISAAY SOSA” → “Isaay Sosa”. */
export function formatPersonName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es-MX')
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (word) =>
        `${word.charAt(0).toLocaleUpperCase('es-MX')}${word.slice(1)}`,
    )
    .join(' ');
}
