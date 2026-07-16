import { ShieldCheck } from 'lucide-react';
import LandingNavbar from './_components/LandingNavbar';
import LandingHero from './_components/LandingHero';
import LandingTrustBar from './_components/LandingTrustBar';
import LandingFeatureSection from './_components/LandingFeatureSection';
import LandingFooter from './_components/LandingFooter';

function SignatureMethodVisual() {
  return (
    <div className="flex items-center justify-center rounded-xl bg-amber-50 p-12">
      <div className="flex size-28 items-center justify-center rounded-2xl bg-white shadow-sm">
        <ShieldCheck className="size-12 text-emerald-500" />
      </div>
    </div>
  );
}

function ParticipantsVisual() {
  return (
    <div className="rounded-xl bg-amber-50 p-8">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <span className="inline-block rounded-md bg-gray-200 px-3 py-1 text-[10px] font-semibold tracking-wide text-gray-600">
          Firmante
        </span>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-wide text-gray-500">
              CORREO ELECTRÓNICO
            </p>
            <div className="mt-1 h-6 rounded-md border border-gray-200" />
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-wide text-gray-500">
              NOMBRE
            </p>
            <div className="mt-1 h-6 rounded-md border border-gray-200" />
          </div>
        </div>
        <p className="mt-3 text-xs font-semibold text-emerald-600">
          + Añadir firmante
        </p>
      </div>

      <div className="mt-4 rounded-lg bg-white p-4 shadow-sm">
        <span className="inline-block rounded-md bg-gray-200 px-3 py-1 text-[10px] font-semibold tracking-wide text-gray-600">
          Espectador
        </span>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-wide text-gray-500">
              CORREO ELECTRÓNICO
            </p>
            <div className="mt-1 h-6 rounded-md border border-gray-200" />
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-wide text-gray-500">
              NOMBRE
            </p>
            <div className="mt-1 h-6 rounded-md border border-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      <LandingHero />
      <LandingTrustBar />

      <LandingFeatureSection
        title="Firma electrónica simple, verificada con tu credencial"
        description="Cada usuario registra una sola vez su rúbrica y su identificación oficial. A partir de ahí, firmar cualquier documento es tan simple como confirmar tu turno."
        visual={<SignatureMethodVisual />}
      />

      <LandingFeatureSection
        title="Gestión colaborativa con firmantes y espectadores"
        description="Agrega a cada persona que deba firmar el documento y define quién solo necesita recibir una copia una vez que todos hayan firmado. Los recordatorios se encargan del resto."
        visual={<ParticipantsVisual />}
        reverse
      />

      <LandingFooter />
    </div>
  );
}
