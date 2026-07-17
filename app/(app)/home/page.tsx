import CreateDocumentView from '../documents/create/_components/CreateDocumentView';
import OnboardingBanner from './_components/OnboardingBanner';
import InviteMemberModal from './_components/InviteMemberModal';

export default function HomePage() {
  return (
    <div className="flex flex-col gap-4">
      <OnboardingBanner />
      <div className="flex justify-end">
        <InviteMemberModal />
      </div>
      <CreateDocumentView />
    </div>
  );
}
