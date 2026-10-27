import type { SignaturePosition } from './signing-session';

interface SignaturePositionsLayerProps {
  positions: SignaturePosition[];
  /** Página sobre la que se dibuja (desde 1). */
  pageNumber: number;
}

/**
 * Marca sobre una página del PDF dónde se estampará la firma del firmante. Sólo informa: no se
 * puede mover ni editar, y no intercepta clics ni la selección de texto del visor.
 *
 * Va encima de la página, dentro de un contenedor `relative` del mismo tamaño (ver
 * `PublicPdfViewer.renderPageOverlay`); los ratios se aplican como porcentajes de ese contenedor.
 *
 * @param props.positions - Posiciones del firmante, de todas las páginas.
 * @param props.pageNumber - Página que se está dibujando.
 * @returns La capa con los recuadros de esa página, o `null` si no tiene ninguno.
 *
 * @example
 * ```tsx
 * <SignaturePositionsLayer positions={session.positions} pageNumber={2} />
 * ```
 */
export default function SignaturePositionsLayer({
  positions,
  pageNumber,
}: SignaturePositionsLayerProps) {
  const onPage = positions.filter((position) => position.page === pageNumber);
  if (onPage.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      data-testid={`signature-positions-page-${pageNumber}`}
    >
      {onPage.map((position, index) => (
        <div
          key={index}
          className="absolute flex items-start rounded-sm border-2 border-dashed border-primary/70 bg-primary/10"
          style={{
            left: `${position.xRatio * 100}%`,
            top: `${position.yRatio * 100}%`,
            width: `${position.widthRatio * 100}%`,
            height: `${position.heightRatio * 100}%`,
          }}
        >
          <span className="m-0.5 rounded-sm bg-primary px-1 text-[10px] font-medium leading-4 text-primary-foreground">
            Tu firma
          </span>
        </div>
      ))}
    </div>
  );
}
