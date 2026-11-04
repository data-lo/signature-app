'use client';

import { ShieldCheck } from 'lucide-react';
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from '@/components/ui/accordion';

/** Lo que el firmante necesita a la mano para firmar con FIEL. */
export const FIEL_REQUIREMENTS = [
  'Certificado (.cer)',
  'Llave privada (.key)',
  'Contraseña de FIEL',
] as const;

/**
 * Promete sólo lo que hace el backend: la llave y la contraseña se usan en memoria para firmar. No
 * menciona el `.cer` porque el certificado sí se conserva como evidencia de la firma.
 */
export const FIEL_SECURITY_MESSAGE =
  'Tu llave privada y tu contraseña sólo se usan para esta firma; no las guardamos.';

interface AdvancedSignaturePreparationProps {
  /** Lo que se validará del certificado. Sin elementos, no se muestra la sección desplegable. */
  certificateChecks?: string[];
}

/**
 * Lo que el firmante debe preparar antes de firmar con FIEL: los requisitos, el mensaje de seguridad
 * y las validaciones del certificado en una sección desplegable. Es informativo: no condiciona el
 * botón de firmar, que el flujo que lo usa coloca debajo.
 *
 * @param props.certificateChecks - Validaciones activas, en palabras del firmante.
 * @returns El bloque informativo.
 *
 * @throws Nada.
 *
 * @example
 * ```tsx
 * <AdvancedSignaturePreparation
 *   certificateChecks={['Que esté vigente y emitido por el SAT']}
 * />
 * ```
 */
export default function AdvancedSignaturePreparation({
  certificateChecks = [],
}: AdvancedSignaturePreparationProps) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-col gap-1">
        <h3 className="font-medium text-foreground">
          Prepara tu FIEL para continuar
        </h3>
        <p className="text-muted-foreground">Ten lista tu FIEL:</p>
        <ul className="list-disc pl-5 text-muted-foreground">
          {FIEL_REQUIREMENTS.map((requirement) => (
            <li key={requirement}>{requirement}</li>
          ))}
        </ul>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-px size-4 shrink-0" aria-hidden />
        {FIEL_SECURITY_MESSAGE}
      </p>

      {certificateChecks.length > 0 && (
        <Accordion>
          <AccordionItem value="certificate-checks">
            <AccordionTrigger>
              Validaciones que haremos a tu certificado
            </AccordionTrigger>
            <AccordionPanel>
              <ul className="list-disc pl-5 text-muted-foreground">
                {certificateChecks.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ul>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
