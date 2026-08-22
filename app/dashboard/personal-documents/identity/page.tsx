import IdentitySignatureView from './_components/IdentitySignatureView';

export default function IdentitySignaturePage() {
  return (
    // `items-start` y no `items-center`: la pantalla ahora crece con el paso 2 y las variantes
    // de la tarjeta de Didit, y centrada verticalmente el contenido se recorta en pantallas
    // bajas en vez de poder desplazarse.
    <main className="flex min-h-screen items-start justify-center bg-muted/40 p-6">
      <IdentitySignatureView />
    </main>
  );
}
