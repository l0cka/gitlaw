import { Command, Args, Flags } from '@oclif/core';
import { rejectReviewForDocument, loadAuditLog, saveAuditLog } from '@gitlaw/core';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

function getHeadCommit(repoDir: string): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoDir, encoding: 'utf-8' }).trim();
}

export default class ReviewReject extends Command {
  static override description = 'Reject a document review';

  static override args = {
    document: Args.string({ description: 'Document directory', required: true }),
  };

  static override flags = {
    reason: Flags.string({ description: 'Rejection reason', required: true }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ReviewReject);
    const repoDir = process.cwd();
    const documentDir = join(repoDir, args.document);
    const reviewer = process.env.USER ?? 'unknown';
    const commit = getHeadCommit(repoDir);

    await rejectReviewForDocument({
      repoDir,
      documentKey: args.document,
      documentDir,
      reviewer,
      commit,
      reason: flags.reason,
    });

    const log = await loadAuditLog(repoDir);
    log.append({
      actor: reviewer,
      event: 'review_decision',
      document: args.document,
      commit,
      details: {
        decision: 'rejected',
        reason: flags.reason,
        status: 'draft',
      },
    });
    await saveAuditLog(repoDir, log);

    this.log(`Rejected: ${flags.reason}`);
  }
}
