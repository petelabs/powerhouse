/**
 * Pure diff utilities for comparing source and target text,
 * generating unified-like diff hunks and line summaries.
 */

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffResult {
  lines: DiffLine[];
  additions: number;
  deletions: number;
  unifiedText: string;
}

export function computeSimpleDiff(oldText: string = '', newText: string = ''): DiffResult {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  // Fast path for empty or identical texts
  if (oldText === newText) {
    return {
      lines: oldLines.map((content, idx) => ({
        type: 'unchanged',
        content,
        oldLineNumber: idx + 1,
        newLineNumber: idx + 1,
      })),
      additions: 0,
      deletions: 0,
      unifiedText: oldText,
    };
  }

  // If oldText was empty (new file creation)
  if (!oldText && newText) {
    return {
      lines: newLines.map((content, idx) => ({
        type: 'added',
        content,
        newLineNumber: idx + 1,
      })),
      additions: newLines.length,
      deletions: 0,
      unifiedText: newLines.map(l => `+ ${l}`).join('\n'),
    };
  }

  // If newText is empty (file deletion)
  if (oldText && !newText) {
    return {
      lines: oldLines.map((content, idx) => ({
        type: 'removed',
        content,
        oldLineNumber: idx + 1,
      })),
      additions: 0,
      deletions: oldLines.length,
      unifiedText: oldLines.map(l => `- ${l}`).join('\n'),
    };
  }

  // LCS-based diff for accurate lines matching
  const n = oldLines.length;
  const m = newLines.length;

  // For very large files, limit DP matrix to prevent excessive memory
  if (n * m > 250000) {
    // Linear approximation
    const lines: DiffLine[] = [];
    let additions = 0;
    let deletions = 0;

    for (let i = 0; i < n; i++) {
      lines.push({ type: 'removed', content: oldLines[i], oldLineNumber: i + 1 });
      deletions++;
    }
    for (let j = 0; j < m; j++) {
      lines.push({ type: 'added', content: newLines[j], newLineNumber: j + 1 });
      additions++;
    }

    return {
      lines,
      additions,
      deletions,
      unifiedText: lines.map(l => `${l.type === 'added' ? '+' : '-'} ${l.content}`).join('\n'),
    };
  }

  // Standard DP Matrix
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (oldLines[i] === newLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const lines: DiffLine[] = [];
  let i = n;
  let j = m;
  let additions = 0;
  let deletions = 0;

  const stack: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      stack.push({
        type: 'unchanged',
        content: oldLines[i - 1],
        oldLineNumber: i,
        newLineNumber: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({
        type: 'added',
        content: newLines[j - 1],
        newLineNumber: j,
      });
      additions++;
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      stack.push({
        type: 'removed',
        content: oldLines[i - 1],
        oldLineNumber: i,
      });
      deletions++;
      i--;
    }
  }

  // Reverse to get correct order
  while (stack.length > 0) {
    lines.push(stack.pop()!);
  }

  const unifiedText = lines
    .map(line => {
      const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
      return `${prefix} ${line.content}`;
    })
    .join('\n');

  return {
    lines,
    additions,
    deletions,
    unifiedText,
  };
}
