export const VERSION = '0.1.0';

// Document model
export { validateDocumentMeta } from './documents/schema.js';
export { parseClauses } from './documents/clause-parser.js';
export { readDocument } from './documents/reader.js';
export { writeDocument } from './documents/writer.js';
export type { DocumentMeta, DocumentStatus, DocumentType, Party, SectionRef, GitlawTracking, Signature, WorkflowState } from './documents/types.js';
export type { LoadedDocument, LoadedSection } from './documents/reader.js';
export type { ParsedSection, ClauseBlock, ParagraphBlock } from './documents/clause-parser.js';

// Diffing
export { diffDocuments } from './diff/index.js';
export { wordDiff } from './diff/word-diff.js';
export type { DocumentDiff, SectionDiff, Change } from './diff/types.js';
export type { WordChange } from './diff/word-diff.js';

// Workflow
export { canTransition, transition } from './workflow/state-machine.js';
export { ReviewManager, loadReviewManager, saveReviewManager } from './workflow/reviews.js';
export { requestReviewForDocument, approveReviewForDocument, rejectReviewForDocument } from './workflow/service.js';
export type { ReviewRequest, ReviewRecord } from './workflow/types.js';

// Audit
export { AuditLog, loadAuditLog, saveAuditLog } from './audit/audit-log.js';
export type { AuditEntry, AuditEventType } from './audit/types.js';

// Clause library
export { ClauseLibrary } from './documents/clause-library.js';
