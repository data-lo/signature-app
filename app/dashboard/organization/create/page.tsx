import PageContainer from '@/app/dashboard/_components/PageContainer';
import CreateOrganizationForm from './_components/CreateOrganizationForm';

export default function CreateOrganizationPage() {
  return (
    <PageContainer className="flex flex-col items-center gap-6">
      <CreateOrganizationForm />
    </PageContainer>
  );
}
