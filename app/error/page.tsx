import { notFound } from 'next/navigation';

const STATUS_DESCRIPTIONS: Record<number, string> = {
  400: 'Solicitud incorrecta',
  403: 'Acceso denegado',
  404: 'Recurso no encontrado',
  500: 'Error interno del servidor',
  503: 'Servicio no disponible',
};

interface ErrorPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ErrorPage({ searchParams }: ErrorPageProps) {
  const params = await searchParams;
  const code = params.code as string | undefined;
  const message = params.message as string | undefined;

  if (!code) {
    notFound();
  }

  const statusCode = parseInt(code, 10);
  const statusDescription = STATUS_DESCRIPTIONS[statusCode] ?? 'Ha ocurrido un error';
  const errorMessage = message ? decodeURIComponent(message) : statusDescription;

  const isClientError = statusCode >= 400 && statusCode < 500;

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="bg-card p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center ${isClientError ? 'bg-orange-100 dark:bg-orange-500/10' : 'bg-red-100 dark:bg-red-500/10'}`}>
          <svg
            className={`w-8 h-8 ${isClientError ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-1">Error {statusCode}</p>
        <h1 className="text-2xl font-bold text-foreground mb-3">{statusDescription}</h1>
        <p className="text-muted-foreground text-sm">{errorMessage}</p>
      </div>
    </div>
  );
}
