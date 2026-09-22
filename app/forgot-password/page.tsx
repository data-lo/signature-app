import Link from 'next/link';
import Image from 'next/image';
import ForgotPasswordWizard from './_components/ForgotPasswordWizard';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="flex flex-col gap-6 max-w-md w-full">
        <Link href="/" className="flex items-center justify-center gap-2">
          <Image
            src="/isotipo-firmalo.svg"
            alt="Firmalo"
            width={32}
            height={32}
            className="size-8"
          />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Firmalo
          </span>
        </Link>
        <ForgotPasswordWizard />
      </div>
    </div>
  );
}
