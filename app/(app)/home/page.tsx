import CreateDocumentView from '../documents/create/_components/CreateDocumentView';
import OnboardingBanner from './_components/OnboardingBanner';

export default function HomePage() {
  return (
    <div className="flex flex-col gap-4">
      <OnboardingBanner />
      <CreateDocumentView />
    </div>
  );
}
