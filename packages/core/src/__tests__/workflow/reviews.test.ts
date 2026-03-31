import { describe, it, expect } from 'vitest';
import { ReviewManager } from '../../workflow/reviews.js';

describe('ReviewManager', () => {
  it('creates a review request', () => {
    const mgr = new ReviewManager();
    const request = mgr.requestReview({ document: 'contracts/nda', reviewers: ['alice', 'bob'], requester: 'charlie', commit: 'abc123' });
    expect(request.reviewers).toEqual(['alice', 'bob']);
    expect(request.status).toBe('pending');
  });

  it('records an approval', () => {
    const mgr = new ReviewManager();
    mgr.requestReview({ document: 'contracts/nda', reviewers: ['alice'], requester: 'charlie', commit: 'abc123' });
    const review = mgr.submitReview({ document: 'contracts/nda', reviewer: 'alice', decision: 'approved', comment: 'LGTM', commit: 'abc123' });
    expect(review.decision).toBe('approved');
  });

  it('records a rejection', () => {
    const mgr = new ReviewManager();
    mgr.requestReview({ document: 'contracts/nda', reviewers: ['alice'], requester: 'charlie', commit: 'abc123' });
    const review = mgr.submitReview({ document: 'contracts/nda', reviewer: 'alice', decision: 'rejected', comment: 'Needs changes', commit: 'abc123' });
    expect(review.decision).toBe('rejected');
  });

  it('checks if all required approvals are met', () => {
    const mgr = new ReviewManager();
    mgr.requestReview({ document: 'contracts/nda', reviewers: ['alice', 'bob'], requester: 'charlie', commit: 'abc123' });
    mgr.submitReview({ document: 'contracts/nda', reviewer: 'alice', decision: 'approved', commit: 'abc123' });
    expect(mgr.isFullyApproved('contracts/nda')).toBe(false);
    mgr.submitReview({ document: 'contracts/nda', reviewer: 'bob', decision: 'approved', commit: 'abc123' });
    expect(mgr.isFullyApproved('contracts/nda')).toBe(true);
  });

  it('marks requests as completed', () => {
    const mgr = new ReviewManager();
    mgr.requestReview({ document: 'contracts/nda', reviewers: ['alice'], requester: 'charlie', commit: 'abc123' });
    mgr.completeRequest('contracts/nda');
    expect(mgr.getRequest('contracts/nda')?.status).toBe('completed');
  });

  it('serializes and deserializes review state', () => {
    const mgr = new ReviewManager();
    mgr.requestReview({ document: 'contracts/nda', reviewers: ['alice'], requester: 'charlie', commit: 'abc123' });
    mgr.submitReview({ document: 'contracts/nda', reviewer: 'alice', decision: 'approved', commit: 'abc123' });

    const json = mgr.serialize();
    const restored = ReviewManager.deserialize(json);
    expect(restored.getRequest('contracts/nda')?.reviewers).toEqual(['alice']);
    expect(restored.getReviews('contracts/nda')).toHaveLength(1);
  });
});

