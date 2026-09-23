'use client';

import { Sparkles } from 'lucide-react';
import type { Control } from 'react-hook-form';

import { FormCheckbox } from '@/components/form/form-checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

interface SmartSearchCardProps {
  control: Control<CreateDocumentSignaturesFormValues>;
}

/** Da nombre al grupo: lo referencia el `aria-labelledby` de la card. */
const TITLE_ID = 'smart-search-card-title';

/**
 * Si el documento entra o no a Búsqueda Inteligente, como una card debajo del botón de enviar.
 *
 * **Reemplaza al modal que antes se interponía al pulsar "Enviar"** (`SmartSearchDialog`). Aquel
 * pedía la decisión en el peor momento: cuando el usuario ya había dado la solicitud por
 * terminada y sólo esperaba confirmación, y encima la escondía hasta entonces. Acá la opción se
 * ve mientras se arma la solicitud, se puede cambiar de opinión sin volver a enviar, y el botón
 * hace lo que dice: enviar.
 *
 * **Va junto al botón y no dentro del acordeón de "Configurar firma"** porque no es configuración
 * del documento —no cambia quién firma, ni cómo, ni dónde— sino una preferencia sobre qué
 * hacemos con él después. Ahí competiría por atención con las decisiones que sí condicionan el
 * envío.
 *
 * **La casilla arranca marcada** (ver `CREATE_DOCUMENT_DEFAULT_VALUES`): la regla de producto es
 * que todo documento sea encontrable salvo que su autor decida lo contrario, que es el mismo
 * valor por omisión que ofrecía el modal en su botón primario.
 *
 * @param props - Control del formulario de creación de documento.
 * @returns La card con la explicación y la casilla de `isIndexable`.
 *
 * @example
 * ```tsx
 * <SmartSearchCard control={createDocumentForm.form.control} />
 * ```
 */
export default function SmartSearchCard({ control }: SmartSearchCardProps) {
  return (
    /**
     * `role="group"` con nombre: sin él la card es un div suelto y un lector de pantalla lee la
     * casilla sin el texto que explica qué implica marcarla.
     */
    <Card
      size="sm"
      role="group"
      aria-labelledby={TITLE_ID}
      data-slot="smart-search-card"
    >
      <CardHeader>
        <CardTitle id={TITLE_ID} className="flex items-center gap-2">
          <Sparkles
            className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden
          />
          Búsqueda Inteligente
        </CardTitle>
        <CardDescription>
          Al agregarlo, analizamos el contenido del documento para que después
          puedas encontrarlo por lo que dice y no sólo por su nombre. Si lo
          dejas fuera, seguirá disponible en tu listado de documentos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormCheckbox
          control={control}
          name="isIndexable"
          id="isIndexable"
          label="Agregar este documento a la Búsqueda Inteligente"
        />
      </CardContent>
    </Card>
  );
}
