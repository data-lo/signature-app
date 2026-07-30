import { Suspense } from 'react';
import DocumentsListView from './_components/DocumentsListView';

export default function DocumentsPage() {
  return (
    <Suspense fallback={null}>
      <DocumentsListView />
    </Suspense>
  );
}
