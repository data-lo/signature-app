import DocumentsView from '../_components/DocumentsView';
import { DOCUMENTS_SECTIONS } from '../_config/sections';

export default function CompletedDocumentsPage() {
  return (
    <DocumentsView
      type="completed"
      title={DOCUMENTS_SECTIONS.completed.label}
    />
  );
}
