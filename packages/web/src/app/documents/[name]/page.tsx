import { DocumentViewer } from '@/components/document-viewer';
import { loadDocumentByName } from '@/lib/documents';

export default async function DocumentPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const document = await loadDocumentByName(name);

  return (
    <main>
      <DocumentViewer
        title={document.meta.title}
        type={document.meta.type}
        status={document.meta.status}
        parties={document.meta.parties}
        sections={document.sections.map(section => ({ id: section.id, content: section.raw }))}
      />
    </main>
  );
}
