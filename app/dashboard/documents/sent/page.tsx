import DocumentsView from '../_components/DocumentsView';
import { DOCUMENTS_SECTIONS } from '../_config/sections';

export default function SentDocumentsPage() {
  return <DocumentsView type="sent" title={DOCUMENTS_SECTIONS.sent.label} />;
}
