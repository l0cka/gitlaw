import { Dashboard } from '@/components/dashboard';
import { listDocuments } from '@/lib/documents';

export default async function Home() {
  const documents = await listDocuments();

  return (
    <main>
      <h1>gitlaw</h1>
      <Dashboard documents={documents} />
    </main>
  );
}
