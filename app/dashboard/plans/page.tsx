import PageContainer from '@/app/dashboard/_components/PageContainer';
import PaymentServicesView from './_components/PaymentServicesView';

export default function PlansPage() {
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
