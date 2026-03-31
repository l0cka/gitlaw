import { Command, Args, Flags } from '@oclif/core';
import { requestReviewForDocument, loadAuditLog, saveAuditLog } from '@gitlaw/core';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

function getHeadCommit(repoDir: string): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoDir, encoding: 'utf-8' }).trim();
}

export default class ReviewRequest extends Command {
  static override description = 'Request review for a document';

  static override args = {
    document: Args.string({ description: 'Document directory', required: true }),
  };

  static override flags = {
    reviewers: Flags.string({ description: 'Comma-separated reviewer names', required: true }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ReviewRequest);
    const repoDir = process.cwd();
    const documentDir = join(repoDir, args.document);
    const commit = getHeadCommit(repoDir);

    const reviewers = flags.reviewers.split(',').map(r => r.trim());
    const result = await requestReviewForDocument({
      repoDir,
      documentKey: args.document,
      documentDir,
      reviewers,
      requester: process.env.USER ?? 'unknown',
      commit,
    });

    const log = await loadAuditLog(repoDir);
    log.append({
      actor: process.env.USER ?? 'unknown',
      event: 'review_requested',
      document: args.document,
      commit,
      details: {
        reviewers,
        status: result.status,
        documentDir: resolve(documentDir),
      },
    });
    await saveAuditLog(repoDir, log);

    this.log(`Review requested from: ${reviewers.join(', ')}`);
  }
}
