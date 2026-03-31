import { Command, Args } from '@oclif/core';
import { readDocument, loadReviewManager } from '@gitlaw/core';
import { join } from 'node:path';

export default class ReviewStatus extends Command {
  static override description = 'Show review status for a document';

  static override args = {
    document: Args.string({ description: 'Document directory', required: true }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(ReviewStatus);
    const repoDir = process.cwd();
    const docDir = join(repoDir, args.document);
    const doc = await readDocument(docDir);
    const manager = await loadReviewManager(repoDir);
    const request = manager.getRequest(args.document);

    this.log(`Document: ${doc.meta.title}`);
    this.log(`Status: ${doc.meta.status}`);
    this.log(`Reviewers: ${doc.tracking.workflow_state.current_reviewers.join(', ') || 'none'}`);
    this.log(`Approvals: ${doc.tracking.workflow_state.approvals.join(', ') || 'none'}`);
    this.log(`Review Request: ${request?.status ?? 'not requested'}`);
  }
}
