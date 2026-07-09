interface LandingFeatureSectionProps {
  title: string;
  description: string;
  reverse?: boolean;
  visual: React.ReactNode;
}

export default function LandingFeatureSection({
  title,
  description,
  reverse,
  visual,
}: LandingFeatureSectionProps) {
  return (
    <section className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 px-8 py-16 md:grid-cols-2">
      <div className={reverse ? 'md:order-2' : undefined}>{visual}</div>
      <div className={reverse ? 'md:order-1' : undefined}>
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        <p className="mt-4 text-sm text-muted-foreground">{description}</p>
      </div>
    </section>
  );
}
