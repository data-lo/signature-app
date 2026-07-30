import OnboardingBanner from './_components/OnboardingBanner';
import HomeContent from './_components/HomeContent';

export default function HomePage() {
  return (
    <div className="flex flex-col gap-4">
      <OnboardingBanner />
      <HomeContent />
    </div>
  );
}
