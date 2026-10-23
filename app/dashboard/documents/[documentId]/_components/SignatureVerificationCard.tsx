'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UNDELIVERED_CODE_MESSAGE } from '../_hooks/useRequestVerificationCode';

export interface SignatureVerificationProps {
  /** true una vez emitido el primer código: cambia el botón por el campo del código. */
  codeRequested: boolean;
  /**
   * `null` mientras no se ha pedido ningún código; `false` cuando el backend lo emitió pero no
   * pudo mandar el correo — ahí se avisa de forma persistente, porque un toast se va y el usuario
   * se quedaría esperando un correo que no va a llegar.
   */
  codeEmailDelivered: boolean | null;
  codeInput: string;
  isRequestingCode: boolean;
  isVerifyingCode: boolean;
  onCodeInputChange: (value: string) => void;
  onRequestCode: () => void;
  onVerifyCode: () => void;
}

/** Autorización de la firma con código de validación (2FA) cuando el documento la exige. */
export default function SignatureVerificationCard({
  codeRequested,
  codeEmailDelivered,
  codeInput,
  isRequestingCode,
  isVerifyingCode,
  onCodeInputChange,
  onRequestCode,
  onVerifyCode,
}: SignatureVerificationProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <p className="text-sm font-medium text-foreground">
        Autoriza tu firma con código de validación
      </p>
      <p className="text-sm text-muted-foreground">
        Te enviaremos un código para validar tu firma
      </p>
      {codeEmailDelivered === false && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {UNDELIVERED_CODE_MESSAGE}
        </p>
      )}
      {!codeRequested ? (
        <Button
          type="button"
          className="w-full"
          disabled={isRequestingCode}
          onClick={onRequestCode}
        >
          {isRequestingCode ? 'Enviando código...' : 'Validar mi firma'}
        </Button>
      ) : (
        <>
          <Input
            inputMode="numeric"
            placeholder="Código de verificación"
            value={codeInput}
            onChange={(e) => onCodeInputChange(e.target.value)}
          />
          <Button
            type="button"
            className="w-full"
            disabled={isVerifyingCode || !codeInput}
            onClick={onVerifyCode}
          >
            {isVerifyingCode ? 'Verificando...' : 'Verificar código'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isRequestingCode}
            onClick={onRequestCode}
          >
            Reenviar código
          </Button>
        </>
      )}
    </div>
  );
}
