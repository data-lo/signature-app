import LoginForm from './_components/LoginForm';

interface LoginPageProps {
  searchParams: Promise<{ registered?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { registered } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="flex flex-col gap-4 max-w-md w-full">
        {registered === '1' && (
          <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-2 text-sm text-center">
            Cuenta creada correctamente, inicia sesión
          </div>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
