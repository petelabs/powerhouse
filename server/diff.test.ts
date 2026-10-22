import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSimpleDiff } from './diff.js';

test('computeSimpleDiff handles identical content', () => {
  const text = 'const x = 1;\nconsole.log(x);';
  const result = computeSimpleDiff(text, text);
  assert.equal(result.additions, 0);
  assert.equal(result.deletions, 0);
  assert.equal(result.lines.length, 2);
  assert.equal(result.lines[0].type, 'unchanged');
});

test('computeSimpleDiff handles new file creation', () => {
  const newContent = 'function hello() {\n  return "world";\n}';
  const result = computeSimpleDiff('', newContent);
  assert.equal(result.additions, 3);
  assert.equal(result.deletions, 0);
  assert.equal(result.lines[0].type, 'added');
  assert.equal(result.lines[0].content, 'function hello() {');
});

test('computeSimpleDiff handles line modifications', () => {
  const oldText = 'const port = 8080;\nrun();';
  const newText = 'const port = 3000;\nrun();';
  const result = computeSimpleDiff(oldText, newText);
  assert.equal(result.additions, 1);
  assert.equal(result.deletions, 1);
  assert.ok(result.lines.some(l => l.type === 'removed' && l.content.includes('8080')));
  assert.ok(result.lines.some(l => l.type === 'added' && l.content.includes('3000')));
});
