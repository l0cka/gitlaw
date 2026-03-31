import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { readDocument } from '../documents/reader.js';
import { transition } from './state-machine.js';
import { loadReviewManager, saveReviewManager } from './reviews.js';
import type { ReviewRecord, ReviewRequest } from './types.js';

interface RequestReviewOptions {
  repoDir: string;
  documentKey: string;
  documentDir: string;
  reviewers: string[];
  requester: string;
  commit: string;
}

interface ApproveReviewOptions {
  repoDir: string;
  documentKey: string;
  documentDir: string;
  reviewer: string;
  commit: string;
  comment?: string;
}

interface RejectReviewOptions {
  repoDir: string;
  documentKey: string;
  documentDir: string;
  reviewer: string;
  commit: string;
  reason: string;
}

interface ReviewActionResult {
  request?: ReviewRequest;
  review?: ReviewRecord;
  status: 'draft' | 'review' | 'approved' | 'finalised' | 'archived';
}

async function persistDocumentState(documentDir: string, meta: unknown, tracking: unknown): Promise<void> {
  await writeFile(join(documentDir, 'document.yaml'), yaml.dump(meta));
  await writeFile(join(documentDir, '.gitlaw'), yaml.dump(tracking));
}

export async function requestReviewForDocument(options: RequestReviewOptions): Promise<ReviewActionResult> {
  const doc = await readDocument(options.documentDir);
  doc.meta.status = transition(doc.meta.status, 'review');

  const uniqueReviewers = Array.from(new Set(options.reviewers.map(r => r.trim()).filter(Boolean)));
  if (uniqueReviewers.length === 0) {
    throw new Error('At least one reviewer is required');
  }

  doc.tracking.workflow_state.current_reviewers = uniqueReviewers;
  doc.tracking.workflow_state.approvals = [];

  await persistDocumentState(options.documentDir, doc.meta, doc.tracking);

  const manager = await loadReviewManager(options.repoDir);
  const request = manager.requestReview({
    document: options.documentKey,
    reviewers: uniqueReviewers,
    requester: options.requester,
    commit: options.commit,
  });
  await saveReviewManager(options.repoDir, manager);

  return { request, status: doc.meta.status };
}

export async function approveReviewForDocument(options: ApproveReviewOptions): Promise<ReviewActionResult> {
  const doc = await readDocument(options.documentDir);
  if (doc.meta.status !== 'review') {
    throw new Error(`Document is not in review state (current: ${doc.meta.status})`);
  }

  const manager = await loadReviewManager(options.repoDir);
  const request = manager.getRequest(options.documentKey);
  if (!request || request.status !== 'pending') {
    throw new Error('No pending review request found for document');
  }
  if (!request.reviewers.includes(options.reviewer)) {
    throw new Error(`Reviewer ${options.reviewer} is not in the review request`);
  }

  const review = manager.submitReview({
    document: options.documentKey,
    reviewer: options.reviewer,
    decision: 'approved',
    comment: options.comment,
    commit: options.commit,
  });

  if (!doc.tracking.workflow_state.approvals.includes(options.reviewer)) {
    doc.tracking.workflow_state.approvals.push(options.reviewer);
  }

  if (manager.isFullyApproved(options.documentKey)) {
    doc.meta.status = transition(doc.meta.status, 'approved');
    manager.completeRequest(options.documentKey);
  }

  await persistDocumentState(options.documentDir, doc.meta, doc.tracking);
  await saveReviewManager(options.repoDir, manager);

  return { review, status: doc.meta.status };
}

export async function rejectReviewForDocument(options: RejectReviewOptions): Promise<ReviewActionResult> {
  const doc = await readDocument(options.documentDir);
  doc.meta.status = transition(doc.meta.status, 'draft');

  const manager = await loadReviewManager(options.repoDir);
  const request = manager.getRequest(options.documentKey);
  if (!request || request.status !== 'pending') {
    throw new Error('No pending review request found for document');
  }

  const review = manager.submitReview({
    document: options.documentKey,
    reviewer: options.reviewer,
    decision: 'rejected',
    comment: options.reason,
    commit: options.commit,
  });

  manager.completeRequest(options.documentKey);
  doc.tracking.workflow_state.current_reviewers = [];
  doc.tracking.workflow_state.approvals = [];

  await persistDocumentState(options.documentDir, doc.meta, doc.tracking);
  await saveReviewManager(options.repoDir, manager);

  return { review, status: doc.meta.status };
}
