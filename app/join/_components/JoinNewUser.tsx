'use client';

import { Button } from '@/components/ui/button';

interface JoinNewUserProps {
  /** RFC que se consultó y no tiene cuenta. Se muestra para que la persona detecte un error de captura. */
  rfc: string;
  /** Lleva al registro con el RFC y el token de la invitación. */
  onCreateAccount: () => void;
  /** Vuelve a pedir el RFC. */
  onUseAnotherRfc: () => void;
}

/**
 * Lo que ve la persona invitada cuando su RFC todavía no tiene cuenta.
 *
 * No se redirige sola al registro: un RFC mal tecleado caería en el formulario de alta con un RFC
 * equivocado, y la persona no sabría que ya tenía cuenta. Por eso se muestra el RFC consultado y
 * se ofrece corregirlo antes de crear nada.
 *
 * @param props - RFC consultado y las dos acciones posibles.
 * @returns El aviso de RFC no registrado con sus dos botones.
 *
 * @example
 * ```tsx
 * <JoinNewUser rfc="XAXX010101000" onCreateAccount={goToSignup} onUseAnotherRfc={reset} />
 * ```
 */
export default function JoinNewUser({
  rfc,
  onCreateAccount,
  onUseAnotherRfc,
}: JoinNewUserProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">
          No encontramos una cuenta con este RFC.
        </p>
        <p className="text-sm text-muted-foreground">
          RFC consultado: <strong className="font-mono">{rfc}</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Crea tu cuenta para unirte. En cuanto termines el registro te
          agregaremos a la organización.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onUseAnotherRfc}
        >
          Usar otro RFC
        </Button>
        <Button type="button" className="flex-1" onClick={onCreateAccount}>
          Crear cuenta
        </Button>
      </div>
    </div>
  );
}
