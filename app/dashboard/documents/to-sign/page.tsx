import DocumentsView from '../_components/DocumentsView';
import { DOCUMENTS_SECTIONS } from '../_config/sections';

export default function ToSignPage() {
  return (
    <DocumentsView type="to-sign" title={DOCUMENTS_SECTIONS['to-sign'].label} />
  );
}
