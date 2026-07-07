const placeholderCompanies = [
  'Nordic Corp',
  'Bluepeak',
  'Vertex Group',
  'Solantis',
  'Meridian Co.',
  'Arcadia Labs',
  'Norwich & Co.',
  'Delta Union',
];

export default function LandingTrustBar() {
  return (
    <section className="bg-gray-900 py-12 px-8">
      <h2 className="text-center text-xl font-semibold text-white">
        Cientos de empresas confían sus documentos a Signature
      </h2>
      <div className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-4">
        {placeholderCompanies.map((name) => (
          <span
            key={name}
            className="text-center text-sm font-semibold tracking-wide text-gray-400"
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
