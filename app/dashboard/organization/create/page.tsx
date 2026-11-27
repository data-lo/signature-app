import PageContainer from '@/app/dashboard/_components/PageContainer';
import CreateOrganizationForm from './_components/CreateOrganizationForm';

/**
 * Alta de una organización.
 *
 * El contenido arranca alineado a la izquierda del área principal, como el resto de pantallas del
 * dashboard, y se limita a un ancho legible (`max-w-150`, 600 px) en vez de centrarse: un
 * formulario corto centrado en un escritorio ancho parece flotar lejos del menú. En móvil ocupa
 * todo el ancho disponible.
 *
 * @returns La pantalla con su encabezado y el formulario.
 * @throws Nunca lanza.
 *
 * @example
 * ```tsx
 * // app/dashboard/organization/create/page.tsx → /dashboard/organization/create
 * ```
 */
export default function CreateOrganizationPage() {
  return (
    <PageContainer>
      <div className="flex w-full max-w-150 flex-col gap-6">
        <div>
          <h1 className="font-heading text-2xl font-medium text-foreground">
            Crear organización
          </h1>
          <p className="text-sm text-muted-foreground">
            Crea un espacio de trabajo para colaborar con tu equipo y gestionar
            sus documentos.
          </p>
        </div>

        <CreateOrganizationForm />
      </div>
    </PageContainer>
  );
}
