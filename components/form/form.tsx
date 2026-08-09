'use client';

import type { ComponentProps } from 'react';

/**
 * `<form>` de la aplicación. Su única diferencia con el elemento nativo es `noValidate`, y es
 * deliberada:
 *
 * Bug corregido: ningún formulario lo declaraba, así que la validación nativa del navegador se
 * adelantaba a la del formulario. Con un correo mal escrito en un `input type="email"`, el
 * navegador cancelaba el envío y mostraba su propio globo —en inglés, con estilos del sistema—
 * antes de que react-hook-form llegara a validar: el usuario no veía **ningún** mensaje de la
 * aplicación, ni siquiera los de los otros campos que también estaban mal (se reproducía en
 * `/signup` y `/login`). Todos los formularios de la app validan con Zod vía `zodResolver`, que
 * cubre lo mismo y más, en español y junto al campo.
 *
 * Es un componente y no una convención a recordar en cada `<form>` nuevo: así la regla vive en un
 * solo lugar. Si alguna vez hiciera falta el comportamiento nativo, basta con pasar
 * `noValidate={false}` (las props se aplican después).
 */
export function Form({ ...props }: ComponentProps<'form'>) {
  return <form noValidate data-slot="form" {...props} />;
}
