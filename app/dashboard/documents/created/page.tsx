import { permanentRedirect } from 'next/navigation';
import { DOCUMENTS_SECTIONS } from '../_config/sections';

/** Ruta anterior de "Enviados para firma"; se conserva solo para links/bookmarks guardados. */
export default function CreatedDocumentsPage() {
  permanentRedirect(DOCUMENTS_SECTIONS.sent.href);
}
