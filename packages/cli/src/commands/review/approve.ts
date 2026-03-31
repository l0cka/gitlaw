import { Command, Args, Flags } from '@oclif/core';
import { approveReviewForDocument, loadAuditLog, saveAuditLog } from '@gitlaw/core';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

function getHeadCommit(repoDir: string): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoDir, encoding: 'utf-8' }).trim();
}

export default class ReviewApprove extends Command {
  static override description = 'Approve a document review';

  static override args = {
    document: Args.string({ description: 'Document directory', required: true }),
  };

  static override flags = {
    comment: Flags.string({ description: 'Review comment' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ReviewApprove);
    const repoDir = process.cwd();
    const documentDir = join(repoDir, args.document);
    const reviewer = process.env.USER ?? 'unknown';
    const commit = getHeadCommit(repoDir);

    const result = await approveReviewForDocument({
      repoDir,
      documentKey: args.document,
      documentDir,
      reviewer,
      commit,
      comment: flags.comment,
    });

    const log = await loadAuditLog(repoDir);
    log.append({
      actor: reviewer,
      event: 'review_decision',
      document: args.document,
      commit,
      details: {
        decision: 'approved',
        comment: flags.comment ?? null,
        status: result.status,
      },
    });
    await saveAuditLog(repoDir, log);

    this.log(`Approved by ${reviewer}${flags.comment ? `: ${flags.comment}` : ''}`);
    if (result.status === 'approved') {
      this.log('All required approvals collected. Document moved to approved.');
    }
  }
}
