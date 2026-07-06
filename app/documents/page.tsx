// Placeholder del listado de documentos: hoy no existe un endpoint de backend
// para listar documentos por firmante, por lo que esta vista solo informa
// cómo acceder a un documento. Cuando exista ese endpoint, esta página debe
// consumirlo y listar los documentos del firmante autenticado.
export default function DocumentsPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Documentos</h1>
        <p className="text-gray-500 text-sm">
          Accede a un documento específico mediante el enlace enviado a tu correo electrónico.
        </p>
      </div>
    </div>
  );
}
