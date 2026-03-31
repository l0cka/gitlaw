import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readDocument } from '@gitlaw/core';

export interface WebDocumentSummary {
  name: string;
  title: string;
  type: string;
  status: string;
}

function getRepoDir(): string {
  return process.env.GITLAW_REPO_DIR ? resolve(process.env.GITLAW_REPO_DIR) : process.cwd();
}

export async function listDocuments(): Promise<WebDocumentSummary[]> {
  const repoDir = getRepoDir();
  const entries = await readdir(repoDir, { withFileTypes: true });
  const docs: WebDocumentSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const docYaml = join(repoDir, entry.name, 'document.yaml');
    if (!existsSync(docYaml)) continue;

    const loaded = await readDocument(join(repoDir, entry.name));
    docs.push({
      name: entry.name,
      title: loaded.meta.title,
      type: loaded.meta.type,
      status: loaded.meta.status,
    });
  }

  return docs;
}

export async function loadDocumentByName(name: string) {
  if (!/^[A-Za-z0-9._-]+$/.test(name)) {
    throw new Error('Invalid document name');
  }
  const repoDir = getRepoDir();
  return readDocument(join(repoDir, name));
}
