import type { ReviewRequest, ReviewRecord } from './types.js';
import { getHeadCommit, readGitNote, writeGitNote } from '../git/notes.js';

export type { ReviewRecord } from './types.js';

interface RequestReviewInput { document: string; reviewers: string[]; requester: string; commit: string; }
interface SubmitReviewInput { document: string; reviewer: string; decision: 'approved' | 'rejected'; comment?: string; commit: string; }

interface SerializedReviews {
  requests: [string, ReviewRequest][];
  reviews: [string, ReviewRecord[]][];
}

export const REVIEW_NOTES_REF = 'refs/notes/gitlaw-reviews';

export class ReviewManager {
  private requests: Map<string, ReviewRequest> = new Map();
  private reviews: Map<string, ReviewRecord[]> = new Map();

  requestReview(input: RequestReviewInput): ReviewRequest {
    const request: ReviewRequest = { ...input, timestamp: new Date().toISOString(), status: 'pending' };
    this.requests.set(input.document, request);
    if (!this.reviews.has(input.document)) { this.reviews.set(input.document, []); }
    return request;
  }

  submitReview(input: SubmitReviewInput): ReviewRecord {
    const record: ReviewRecord = { ...input, timestamp: new Date().toISOString() };
    const reviews = this.reviews.get(input.document) ?? [];
    reviews.push(record);
    this.reviews.set(input.document, reviews);
    return record;
  }

  isFullyApproved(document: string): boolean {
    const request = this.requests.get(document);
    if (!request) return false;
    const reviews = this.reviews.get(document) ?? [];
    const approved = new Set(reviews.filter(r => r.decision === 'approved').map(r => r.reviewer));
    return request.reviewers.every(r => approved.has(r));
  }

  getReviews(document: string): ReviewRecord[] { return this.reviews.get(document) ?? []; }

  getRequest(document: string): ReviewRequest | undefined { return this.requests.get(document); }

  completeRequest(document: string): void {
    const request = this.requests.get(document);
    if (!request) return;
    request.status = 'completed';
    this.requests.set(document, request);
  }

  serialize(): string {
    const data: SerializedReviews = {
      requests: Array.from(this.requests.entries()),
      reviews: Array.from(this.reviews.entries()),
    };
    return JSON.stringify(data);
  }

  static deserialize(json: string): ReviewManager {
    const data = JSON.parse(json) as SerializedReviews;
    const manager = new ReviewManager();
    manager.requests = new Map(data.requests ?? []);
    manager.reviews = new Map(data.reviews ?? []);
    return manager;
  }
}

export async function loadReviewManager(repoDir: string): Promise<ReviewManager> {
  const head = await getHeadCommit(repoDir);
  const raw = await readGitNote(repoDir, REVIEW_NOTES_REF, head);
  return raw ? ReviewManager.deserialize(raw) : new ReviewManager();
}

export async function saveReviewManager(repoDir: string, manager: ReviewManager): Promise<void> {
  const head = await getHeadCommit(repoDir);
  await writeGitNote(repoDir, REVIEW_NOTES_REF, head, manager.serialize());
}

