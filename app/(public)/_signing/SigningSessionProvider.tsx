'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import type { SigningResult, SigningSessionState } from './signing-session';

interface SigningSessionContextValue {
  state: SigningSessionState;
  /** Resultado de la firma, cuando un flujo la completó en esta pantalla. */
  result: SigningResult | null;
  setResult: (result: SigningResult) => void;
  /** Vuelve a consultar la sesión; sólo lo ofrece la ruta que sabe cómo (`ERROR`). */
  retry?: () => void;
}

const SigningSessionContext = createContext<SigningSessionContextValue | null>(
  null,
);

interface SigningSessionProviderProps {
  /** Estado que resolvió el adaptador de la ruta. */
  state: SigningSessionState;
  retry?: () => void;
  children: React.ReactNode;
}

/**
 * Entrega la sesión de firma normalizada al layout y a los flujos, venga de la ruta actual
 * (`/public/documents/:id/sign`) o de la invitación por token (`/sign/:token`). Lo único que
 * agrega es el resultado de la firma: el resto es de sólo lectura, tal como lo resolvió el backend.
 *
 * @param props.state - Sesión o estado que la impide.
 * @param props.retry - Reintento de la consulta, si la ruta lo admite.
 * @param props.children - Layout que consume la sesión.
 * @returns El proveedor.
 *
 * @example
 * ```tsx
 * <SigningSessionProvider state={state} retry={refetch}><PublicSigningLayout /></SigningSessionProvider>
 * ```
 */
export function SigningSessionProvider({
  state,
  retry,
  children,
}: SigningSessionProviderProps) {
  const [result, setResult] = useState<SigningResult | null>(null);
  const value = useMemo(
    () => ({ state, result, setResult, retry }),
    [state, result, retry],
  );

  return (
    <SigningSessionContext.Provider value={value}>
      {children}
    </SigningSessionContext.Provider>
  );
}

/**
 * Sesión de firma del proveedor más cercano.
 *
 * @returns Estado, resultado y acciones de la sesión.
 *
 * @throws {Error} Si se usa fuera de `SigningSessionProvider`.
 *
 * @example
 * ```ts
 * const { state } = useSigningSession();
 * ```
 */
export function useSigningSession(): SigningSessionContextValue {
  const value = useContext(SigningSessionContext);
  if (!value) {
    throw new Error('useSigningSession requiere un SigningSessionProvider');
  }
  return value;
}

/**
 * Sesión de firma si hay proveedor, o `null`. Para componentes compartidos que también se montan
 * fuera de la pantalla pública (y entonces no tienen posiciones que mostrar).
 *
 * @returns El valor del proveedor, o `null`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * const positions = useOptionalSigningSession()?.state;
 * ```
 */
export function useOptionalSigningSession(): SigningSessionContextValue | null {
  return useContext(SigningSessionContext);
}
