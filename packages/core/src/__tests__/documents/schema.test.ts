import { describe, it, expect } from 'vitest';
import { validateDocumentMeta, DocumentMeta } from '../../documents/schema.js';

describe('validateDocumentMeta', () => {
  it('accepts a valid document metadata object', () => {
    const meta: DocumentMeta = {
      title: 'Non-Disclosure Agreement',
      type: 'contract',
      parties: [
        { name: 'Acme Corp', role: 'disclosing' },
        { name: 'Widget Inc', role: 'receiving' },
      ],
      created: '2026-02-27',
      status: 'draft',
      sections: [
        { id: 'definitions', file: 'sections/01-definitions.md' },
      ],
    };
    const result = validateDocumentMeta(meta);
    expect(result.valid).toBe(true);
  });

  it('rejects missing title', () => {
    const meta = { type: 'contract', parties: [], created: '2026-02-27', status: 'draft', sections: [] };
    const result = validateDocumentMeta(meta as any);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('title is required');
  });

  it('rejects invalid status', () => {
    const meta = {
      title: 'Test', type: 'contract', parties: [], created: '2026-02-27', status: 'invalid', sections: [],
    };
    const result = validateDocumentMeta(meta as any);
    expect(result.valid).toBe(false);
  });

  it('rejects invalid party and section structure', () => {
    const meta = {
      title: 'Agreement',
      type: 'contract',
      parties: [{ name: '', role: '' }],
      created: '2026/02/27',
      status: 'draft',
      sections: [
        { id: 'Bad ID', file: '../outside.md' },
        { id: 'good-id', file: 'sections/01-ok.md' },
        { id: 'good-id', file: 'sections/02-dupe.md' },
      ],
    };

    const result = validateDocumentMeta(meta as any);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('parties[0].name is required');
    expect(result.errors).toContain('parties[0].role is required');
    expect(result.errors).toContain('created must be formatted as YYYY-MM-DD');
    expect(result.errors).toContain('sections[0].id must use lowercase letters, numbers, _ or -');
    expect(result.errors).toContain('sections[0].file must be inside sections/ and end with .md');
    expect(result.errors).toContain('sections[2].id must be unique');
  });
});

