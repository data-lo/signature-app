import PageContainer from '@/app/dashboard/_components/PageContainer';
import { assertPagePermission } from '@/lib/authorization/assert-page-permission.server';
import PaymentServicesView from './_components/PaymentServicesView';

/**
 * Catálogo de planes contratables.
 *
 * Exige `BILLING.READ` para entrar, el mismo permiso que la pantalla de suscripciones: quien no
 * puede ver el plan de la cuenta tampoco tiene por qué ver lo que cuesta cambiarlo. Contratar es
 * otra cosa y pide `BILLING.MANAGE`, que se comprueba en el botón y, de verdad, en el endpoint de
 * checkout.
 */
export default async function PlansPage() {
  await assertPagePermission('BILLING.READ');

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-medium text-foreground">
          Planes
        </h1>
        <p className="text-sm text-muted-foreground">
          Elige el servicio que mejor se ajuste a tus necesidades de firma de
          documentos.
        </p>
      </div>

      <PaymentServicesView />
    </PageContainer>
  );
}
