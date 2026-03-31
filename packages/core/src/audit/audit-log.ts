import { createHash } from 'node:crypto';
import type { AuditEntry, AuditEventType } from './types.js';
import { getHeadCommit, readGitNote, writeGitNote } from '../git/notes.js';

interface AppendInput { actor: string; event: AuditEventType; document: string; commit: string; details: Record<string, unknown>; }

export const AUDIT_NOTES_REF = 'refs/notes/gitlaw-audit';

function hashEntry(entry: Omit<AuditEntry, 'id'>): string {
  const content = JSON.stringify({ prev: entry.prev, timestamp: entry.timestamp, actor: entry.actor, event: entry.event, document: entry.document, commit: entry.commit, details: entry.details });
  return createHash('sha256').update(content).digest('hex');
}

export class AuditLog {
  entries: AuditEntry[] = [];

  append(input: AppendInput): AuditEntry {
    const prev = this.entries.length > 0 ? this.entries[this.entries.length - 1].id : null;
    const partial = { prev, timestamp: new Date().toISOString(), actor: input.actor, event: input.event, document: input.document, commit: input.commit, details: input.details };
    const id = hashEntry(partial);
    const entry: AuditEntry = { id, ...partial };
    this.entries.push(entry);
    return entry;
  }

  verify(): boolean {
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const expectedPrev = i > 0 ? this.entries[i - 1].id : null;
      if (entry.prev !== expectedPrev) return false;
      const { id, ...rest } = entry;
      const expectedId = hashEntry(rest);
      if (id !== expectedId) return false;
    }
    return true;
  }

  forDocument(document: string): AuditEntry[] { return this.entries.filter(e => e.document === document); }

  serialize(): string { return JSON.stringify(this.entries); }

  static deserialize(json: string): AuditLog {
    const log = new AuditLog();
    log.entries = JSON.parse(json);
    return log;
  }
}

export async function loadAuditLog(repoDir: string): Promise<AuditLog> {
  const head = await getHeadCommit(repoDir);
  const raw = await readGitNote(repoDir, AUDIT_NOTES_REF, head);
  return raw ? AuditLog.deserialize(raw) : new AuditLog();
}

export async function saveAuditLog(repoDir: string, log: AuditLog): Promise<void> {
  const head = await getHeadCommit(repoDir);
  await writeGitNote(repoDir, AUDIT_NOTES_REF, head, log.serialize());
}

