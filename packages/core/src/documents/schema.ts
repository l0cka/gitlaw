import type { DocumentMeta, DocumentStatus, DocumentType } from './types.js';
export type { DocumentMeta } from './types.js';

const VALID_STATUSES: DocumentStatus[] = ['draft', 'review', 'approved', 'finalised', 'archived'];
const VALID_TYPES: DocumentType[] = ['contract', 'policy', 'brief'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SECTION_FILE_PATH = /^sections\/[A-Za-z0-9._/-]+\.md$/;
const SECTION_ID = /^[a-z0-9][a-z0-9_-]*$/;

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateDocumentMeta(meta: unknown): ValidationResult {
  const errors: string[] = [];
  const obj = meta as Record<string, unknown>;

  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['input must be an object'] };
  }

  if (!isNonEmptyString(obj.title)) {
    errors.push('title is required');
  }

  if (!VALID_TYPES.includes(obj.type as DocumentType)) {
    errors.push(`type must be one of: ${VALID_TYPES.join(', ')}`);
  }

  if (!Array.isArray(obj.parties)) {
    errors.push('parties must be an array');
  } else {
    obj.parties.forEach((party, index) => {
      const entry = party as Record<string, unknown>;
      if (!entry || typeof entry !== 'object') {
        errors.push(`parties[${index}] must be an object`);
        return;
      }
      if (!isNonEmptyString(entry.name)) {
        errors.push(`parties[${index}].name is required`);
      }
      if (!isNonEmptyString(entry.role)) {
        errors.push(`parties[${index}].role is required`);
      }
    });
  }

  if (!isNonEmptyString(obj.created)) {
    errors.push('created is required');
  } else if (!ISO_DATE.test(obj.created)) {
    errors.push('created must be formatted as YYYY-MM-DD');
  }

  if (!VALID_STATUSES.includes(obj.status as DocumentStatus)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (!Array.isArray(obj.sections)) {
    errors.push('sections must be an array');
  } else {
    const ids = new Set<string>();
    obj.sections.forEach((section, index) => {
      const entry = section as Record<string, unknown>;
      if (!entry || typeof entry !== 'object') {
        errors.push(`sections[${index}] must be an object`);
        return;
      }

      if (!isNonEmptyString(entry.id)) {
        errors.push(`sections[${index}].id is required`);
      } else {
        if (!SECTION_ID.test(entry.id)) {
          errors.push(`sections[${index}].id must use lowercase letters, numbers, _ or -`);
        }
        if (ids.has(entry.id)) {
          errors.push(`sections[${index}].id must be unique`);
        }
        ids.add(entry.id);
      }

      if (!isNonEmptyString(entry.file)) {
        errors.push(`sections[${index}].file is required`);
      } else if (!SECTION_FILE_PATH.test(entry.file)) {
        errors.push(`sections[${index}].file must be inside sections/ and end with .md`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}
