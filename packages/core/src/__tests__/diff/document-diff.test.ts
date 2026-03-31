import { describe, it, expect } from 'vitest';
import { diffSections } from '../../diff/document-diff.js';
import { parseClauses } from '../../documents/clause-parser.js';

describe('diffSections', () => {
  it('detects a modified clause', () => {
    const oldParsed = parseClauses('{{clause:a}}\nOld text here.\n{{/clause}}');
    const newParsed = parseClauses('{{clause:a}}\nNew text here.\n{{/clause}}');
    const diff = diffSections(oldParsed, newParsed);
    expect(diff.changes).toHaveLength(1);
    expect(diff.changes[0].type).toBe('modified');
    expect(diff.changes[0].clauseId).toBe('a');
  });

  it('detects an added clause', () => {
    const oldParsed = parseClauses('Just text.');
    const newParsed = parseClauses('Just text.\n\n{{clause:new-clause}}\nBrand new.\n{{/clause}}');
    const diff = diffSections(oldParsed, newParsed);
    const added = diff.changes.filter(c => c.type === 'added');
    expect(added).toHaveLength(1);
    expect(added[0].clauseId).toBe('new-clause');
  });

  it('detects a removed clause', () => {
    const oldParsed = parseClauses('{{clause:gone}}\nOld clause.\n{{/clause}}');
    const newParsed = parseClauses('');
    const diff = diffSections(oldParsed, newParsed);
    const removed = diff.changes.filter(c => c.type === 'removed');
    expect(removed).toHaveLength(1);
    expect(removed[0].clauseId).toBe('gone');
  });

  it('detects moved clauses when order changes', () => {
    const oldParsed = parseClauses('{{clause:a}}\nA\n{{/clause}}\n\n{{clause:b}}\nB\n{{/clause}}');
    const newParsed = parseClauses('{{clause:b}}\nB\n{{/clause}}\n\n{{clause:a}}\nA\n{{/clause}}');
    const diff = diffSections(oldParsed, newParsed);
    const moved = diff.changes.filter(c => c.type === 'moved' && c.clauseId);
    expect(moved.length).toBeGreaterThan(0);
  });

  it('detects paragraph changes in unmarked text', () => {
    const oldParsed = parseClauses('Paragraph one.\n\nParagraph two.');
    const newParsed = parseClauses('Paragraph one.\n\nParagraph changed.');
    const diff = diffSections(oldParsed, newParsed);
    expect(diff.changes.some(c => c.type === 'modified')).toBe(true);
  });

  it('detects moved paragraphs in unmarked text', () => {
    const oldParsed = parseClauses('Alpha.\n\nBeta.\n\nGamma.');
    const newParsed = parseClauses('Gamma.\n\nAlpha.\n\nBeta.');
    const diff = diffSections(oldParsed, newParsed);
    expect(diff.changes.some(c => c.type === 'moved' && !c.clauseId)).toBe(true);
  });
});

