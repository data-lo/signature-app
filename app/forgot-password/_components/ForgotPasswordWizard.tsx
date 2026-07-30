'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import EmailRequestStep from './EmailRequestStep';
import OtpVerificationStep from './OtpVerificationStep';
import NewPasswordStep from './NewPasswordStep';

type Step = 'email' | 'otp' | 'reset';

/**
 * Wizard de un solo componente (email → OTP → nueva contraseña), sin cambiar de URL entre
 * pasos — ver historia "Recuperación de Contraseña mediante Código de Verificación OTP". Evita
 * el bug ya encontrado en el flujo de registro (middleware.ts no reconocía una ruta nueva como
 * pública) y no necesita puentear estado entre páginas vía localStorage.
 */
export default function ForgotPasswordWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');

  return (
    <Card className="max-w-md w-full">
      {step === 'email' && (
        <EmailRequestStep
          onSuccess={(submittedEmail) => {
            setEmail(submittedEmail);
            setStep('otp');
          }}
        />
      )}

      {step === 'otp' && (
        <OtpVerificationStep
          email={email}
          onSuccess={(token) => {
            setResetToken(token);
            setStep('reset');
          }}
        />
      )}

      {step === 'reset' && (
        <NewPasswordStep
          resetToken={resetToken}
          onSuccess={() => router.push('/login?reset=1')}
        />
      )}
    </Card>
  );
}
