import type { ParsedSection } from '../documents/clause-parser.js';
import type { Change, SectionDiff } from './types.js';
import { wordDiff } from './word-diff.js';

type ParagraphOp =
  | { type: 'equal'; oldIndex: number; newIndex: number }
  | { type: 'added'; newIndex: number }
  | { type: 'removed'; oldIndex: number };

function lcsMatrix(a: string[], b: string[]): number[][] {
  const dp = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

function paragraphOps(oldTexts: string[], newTexts: string[]): ParagraphOp[] {
  const dp = lcsMatrix(oldTexts, newTexts);
  const ops: ParagraphOp[] = [];
  let i = oldTexts.length;
  let j = newTexts.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTexts[i - 1] === newTexts[j - 1]) {
      ops.push({ type: 'equal', oldIndex: i - 1, newIndex: j - 1 });
      i--;
      j--;
      continue;
    }
    if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: 'added', newIndex: j - 1 });
      j--;
      continue;
    }
    ops.push({ type: 'removed', oldIndex: i - 1 });
    i--;
  }

  return ops.reverse();
}

function diffParagraphs(oldParsed: ParsedSection, newParsed: ParsedSection): Change[] {
  const oldTexts = oldParsed.paragraphs.map(p => p.content);
  const newTexts = newParsed.paragraphs.map(p => p.content);
  const ops = paragraphOps(oldTexts, newTexts);

  const consumed = new Set<number>();
  const changes: Change[] = [];

  // First pass: detect moved paragraphs (exact same text, different index)
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op.type !== 'removed' || consumed.has(i)) continue;
    const oldParagraph = oldParsed.paragraphs[op.oldIndex];

    for (let j = 0; j < ops.length; j++) {
      if (i === j || consumed.has(j)) continue;
      const candidate = ops[j];
      if (candidate.type !== 'added') continue;
      const newParagraph = newParsed.paragraphs[candidate.newIndex];
      if (oldParagraph.content === newParagraph.content && op.oldIndex !== candidate.newIndex) {
        consumed.add(i);
        consumed.add(j);
        changes.push({
          type: 'moved',
          location: { paragraph: newParagraph.startLine },
          old: oldParagraph.content,
          new: newParagraph.content,
        });
        break;
      }
    }
  }

  // Second pass: detect modified, added, removed
  for (let i = 0; i < ops.length; i++) {
    if (consumed.has(i)) continue;
    const op = ops[i];

    if (op.type === 'equal') continue;

    const next = ops[i + 1];
    if (
      next
      && !consumed.has(i + 1)
      && ((op.type === 'removed' && next.type === 'added') || (op.type === 'added' && next.type === 'removed'))
    ) {
      const removedOp = (op.type === 'removed' ? op : next) as { type: 'removed'; oldIndex: number };
      const addedOp = (op.type === 'added' ? op : next) as { type: 'added'; newIndex: number };
      const oldP = oldParsed.paragraphs[removedOp.oldIndex];
      const newP = newParsed.paragraphs[addedOp.newIndex];
      changes.push({
        type: 'modified',
        location: { paragraph: newP.startLine },
        old: oldP.content,
        new: newP.content,
        wordDiff: wordDiff(oldP.content, newP.content),
      });
      consumed.add(i);
      consumed.add(i + 1);
      i++;
      continue;
    }

    if (op.type === 'added') {
      const newP = newParsed.paragraphs[op.newIndex];
      changes.push({ type: 'added', location: { paragraph: newP.startLine }, new: newP.content });
      continue;
    }

    if (op.type === 'removed') {
      const oldP = oldParsed.paragraphs[op.oldIndex];
      changes.push({ type: 'removed', location: { paragraph: oldP.startLine }, old: oldP.content });
    }
  }

  return changes;
}

export function diffSections(oldParsed: ParsedSection, newParsed: ParsedSection): SectionDiff {
  const changes: Change[] = [];

  const oldClauseMap = new Map(oldParsed.clauses.map(c => [c.id, c]));
  const newClauseMap = new Map(newParsed.clauses.map(c => [c.id, c]));

  for (const [id, clause] of oldClauseMap) {
    if (!newClauseMap.has(id)) {
      changes.push({ type: 'removed', clauseId: id, location: { paragraph: clause.startLine }, old: clause.content });
    }
  }

  for (const [id, clause] of newClauseMap) {
    if (!oldClauseMap.has(id)) {
      changes.push({ type: 'added', clauseId: id, location: { paragraph: clause.startLine }, new: clause.content });
    }
  }

  for (const [id, newClause] of newClauseMap) {
    const oldClause = oldClauseMap.get(id);
    if (!oldClause) continue;

    if (oldClause.content !== newClause.content) {
      changes.push({
        type: 'modified',
        clauseId: id,
        location: { paragraph: newClause.startLine },
        old: oldClause.content,
        new: newClause.content,
        wordDiff: wordDiff(oldClause.content, newClause.content),
      });
      continue;
    }

    if (oldClause.startLine !== newClause.startLine) {
      changes.push({
        type: 'moved',
        clauseId: id,
        location: { paragraph: newClause.startLine },
        old: oldClause.content,
        new: newClause.content,
      });
    }
  }

  changes.push(...diffParagraphs(oldParsed, newParsed));

  return { changes };
}
