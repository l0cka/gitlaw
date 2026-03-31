import { beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { writeDocument } from '../../documents/writer.js';
import { readDocument } from '../../documents/reader.js';
import { requestReviewForDocument, approveReviewForDocument, rejectReviewForDocument } from '../../workflow/service.js';
import { loadReviewManager } from '../../workflow/reviews.js';

async function createGitRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'gitlaw-workflow-service-'));
  execFileSync('git', ['init', dir]);
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: dir });
  await writeFile(join(dir, '.gitignore'), 'node_modules\n');
  execFileSync('git', ['add', '.gitignore'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'init'], { cwd: dir });
  return dir;
}

describe('workflow service', () => {
  let repoDir: string;
  let documentKey: string;
  let documentDir: string;

  beforeEach(async () => {
    repoDir = await createGitRepo();
    documentKey = 'nda';
    documentDir = join(repoDir, documentKey);

    await writeDocument(documentDir, {
      title: 'NDA',
      type: 'contract',
      parties: [{ name: 'Acme', role: 'disclosing' }],
      created: '2026-02-27',
      status: 'draft',
      sections: [{ id: 'main', file: 'sections/01-main.md' }],
    }, new Map([['sections/01-main.md', 'Initial content.']]));
  });

  it('requests review and updates document state', async () => {
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoDir, encoding: 'utf-8' }).trim();
    await requestReviewForDocument({
      repoDir,
      documentKey,
      documentDir,
      reviewers: ['alice', 'bob'],
      requester: 'charlie',
      commit,
    });

    const doc = await readDocument(documentDir);
    expect(doc.meta.status).toBe('review');
    expect(doc.tracking.workflow_state.current_reviewers).toEqual(['alice', 'bob']);

    const manager = await loadReviewManager(repoDir);
    expect(manager.getRequest(documentKey)?.status).toBe('pending');
  });

  it('approves and transitions to approved when fully approved', async () => {
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoDir, encoding: 'utf-8' }).trim();
    await requestReviewForDocument({
      repoDir,
      documentKey,
      documentDir,
      reviewers: ['alice'],
      requester: 'charlie',
      commit,
    });

    await approveReviewForDocument({
      repoDir,
      documentKey,
      documentDir,
      reviewer: 'alice',
      commit,
    });

    const doc = await readDocument(documentDir);
    expect(doc.meta.status).toBe('approved');

    const manager = await loadReviewManager(repoDir);
    expect(manager.getRequest(documentKey)?.status).toBe('completed');
  });

  it('rejects review and returns document to draft', async () => {
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoDir, encoding: 'utf-8' }).trim();
    await requestReviewForDocument({
      repoDir,
      documentKey,
      documentDir,
      reviewers: ['alice'],
      requester: 'charlie',
      commit,
    });

    await rejectReviewForDocument({
      repoDir,
      documentKey,
      documentDir,
      reviewer: 'alice',
      commit,
      reason: 'Needs changes',
    });

    const doc = await readDocument(documentDir);
    expect(doc.meta.status).toBe('draft');
    expect(doc.tracking.workflow_state.current_reviewers).toEqual([]);

    const manager = await loadReviewManager(repoDir);
    expect(manager.getRequest(documentKey)?.status).toBe('completed');
  });
});
