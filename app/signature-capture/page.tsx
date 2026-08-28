import { Suspense } from 'react';
import MobileSignatureCaptureView from './_components/MobileSignatureCaptureView';

/**
 * Destino del QR de captura de firma. La ruta la fija el backend
 * (`SIGNATURE_CAPTURE_MOBILE_PATH`), así que su nombre no puede cambiar sin cambiarla allá: es
 * lo que se codifica en los QR ya generados.
 *
 * El `Suspense` es requisito de Next para `useSearchParams`, que es de donde sale el token.
 */
export default function SignatureCapturePage() {
  return (
    <Suspense fallback={null}>
      <MobileSignatureCaptureView />
    </Suspense>
  );
}
