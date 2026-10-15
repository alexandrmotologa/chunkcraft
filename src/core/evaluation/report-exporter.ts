import Table from 'cli-table3';
import picocolors from 'picocolors';
import { SuiteEvaluationResult } from './test-runner.js';

/**
 * Formats a benchmark suite result into an ASCII terminal table.
 */
export function formatTerminalTable(suite: SuiteEvaluationResult): string {
  const table = new Table({
    head: [
      picocolors.bold('Strategy'),
      picocolors.bold('Chunks'),
      picocolors.bold('Avg Tokens'),
      picocolors.bold('P@1'),
      picocolors.bold('P@3'),
      picocolors.bold('P@5'),
      picocolors.bold('R@3'),
      picocolors.bold('MRR'),
      picocolors.bold('Hit Rate'),
      picocolors.bold('Frag.'),
      picocolors.bold('Latency')
    ],
    style: { head: [], border: [] }
  });

  for (const report of suite.strategies) {
    const m = report.metrics;
    const totalLatency = (m.chunkingLatencyMs + m.indexingLatencyMs + m.retrievalLatencyMs).toFixed(1) + 'ms';

    // Highlight top MRR and hit rate
    const mrrDisplay = m.meanReciprocalRank >= 0.8
      ? picocolors.green(m.meanReciprocalRank.toFixed(3))
      : m.meanReciprocalRank >= 0.5
      ? picocolors.yellow(m.meanReciprocalRank.toFixed(3))
      : picocolors.red(m.meanReciprocalRank.toFixed(3));

    table.push([
      picocolors.cyan(m.strategyName),
      m.totalChunks.toString(),
      m.averageChunkSize.toFixed(0),
      m.precisionAt1.toFixed(2),
      m.precisionAt3.toFixed(2),
      m.precisionAt5.toFixed(2),
      m.recallAt3.toFixed(2),
      mrrDisplay,
      (m.hitRate * 100).toFixed(0) + '%',
      (m.contextFragmentationScore * 100).toFixed(1) + '%',
      totalLatency
    ]);
  }

  const header = `\n${picocolors.bold('=== ChunkCraft Benchmark Evaluation Results ===')}\n` +
    `Document: ${picocolors.bold(suite.documentId)} (${suite.documentLengthChars.toLocaleString()} chars) | Provider: ${picocolors.bold(suite.provider)} | Queries: ${suite.queries.length}\n`;

  return header + table.toString() + '\n';
}

/**
 * Formats a benchmark suite result into GitHub-Flavored Markdown.
 */
export function formatMarkdown(suite: SuiteEvaluationResult): string {
  const lines: string[] = [];

  lines.push(`# ChunkCraft Benchmark Evaluation: ${suite.documentId}`);
  lines.push('');
  lines.push(`* **Document Length:** ${suite.documentLengthChars.toLocaleString()} characters`);
  lines.push(`* **Embedding Provider:** \`${suite.provider}\``);
  lines.push(`* **Evaluated Queries:** ${suite.queries.length}`);
  lines.push('');
  lines.push('## Strategy Comparison Matrix');
  lines.push('');
  lines.push('| Strategy | Chunks | Avg Tokens | P@1 | P@3 | P@5 | Recall@3 | MRR | Hit Rate | Fragmentation | Total Latency |');
  lines.push('| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');

  for (const report of suite.strategies) {
    const m = report.metrics;
    const totalLatency = (m.chunkingLatencyMs + m.indexingLatencyMs + m.retrievalLatencyMs).toFixed(1) + 'ms';
    lines.push(
      `| **\`${m.strategyName}\`** | ${m.totalChunks} | ${m.averageChunkSize.toFixed(0)} | ${m.precisionAt1.toFixed(3)} | ${m.precisionAt3.toFixed(3)} | ${m.precisionAt5.toFixed(3)} | ${m.recallAt3.toFixed(3)} | **${m.meanReciprocalRank.toFixed(3)}** | ${(m.hitRate * 100).toFixed(0)}% | ${(m.contextFragmentationScore * 100).toFixed(1)}% | ${totalLatency} |`
    );
  }

  lines.push('');
  lines.push('## Detailed Query Results');
  lines.push('');

  for (const report of suite.strategies) {
    lines.push(`### Strategy: \`${report.metrics.strategyName}\``);
    lines.push('');
    for (const q of report.queryResults) {
      lines.push(`* **Query \`${q.queryId}\`:** "${q.query}"`);
      lines.push(`  * P@1: ${q.precisionAt1.toFixed(2)} | P@3: ${q.precisionAt3.toFixed(2)} | Recall@3: ${q.recallAt3.toFixed(2)} | First Relevant Rank: ${q.firstRelevantRank ?? 'None'}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Formats a benchmark suite result into JSON.
 */
export function formatJson(suite: SuiteEvaluationResult): string {
  return JSON.stringify(suite, null, 2);
}

/**
 * Formats benchmark results into a standalone HTML report with responsive styling.
 */
export function formatHtmlReport(suite: SuiteEvaluationResult): string {
  const jsonRaw = JSON.stringify(suite);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ChunkCraft Benchmark Report: ${suite.documentId}</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --muted: #94a3b8;
      --accent: #00f5ff;
      --green: #10b981;
    }
    body {
      margin: 0;
      padding: 2rem;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: var(--accent); margin-bottom: 0.5rem; }
    .meta { color: var(--muted); margin-bottom: 2rem; font-size: 0.95rem; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th, td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); }
    th { color: var(--muted); font-size: 0.85rem; text-transform: uppercase; }
    .highlight { color: var(--accent); font-weight: 600; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #0f172a; border: 1px solid var(--border); font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <h1>ChunkCraft Benchmark Report</h1>
    <div class="meta">
      Document: <strong>${suite.documentId}</strong> (${suite.documentLengthChars} chars) &bull;
      Provider: <strong>${suite.provider}</strong> &bull;
      Evaluated Queries: <strong>${suite.queries.length}</strong>
    </div>

    <div class="card">
      <h2>Strategy Comparison Matrix</h2>
      <table>
        <thead>
          <tr>
            <th>Strategy</th>
            <th>Chunks</th>
            <th>Avg Tokens</th>
            <th>P@1</th>
            <th>P@3</th>
            <th>P@5</th>
            <th>Recall@3</th>
            <th>MRR</th>
            <th>Hit Rate</th>
            <th>Frag.</th>
          </tr>
        </thead>
        <tbody>
          ${suite.strategies.map(s => `
            <tr>
              <td><span class="badge">${s.metrics.strategyName}</span></td>
              <td>${s.metrics.totalChunks}</td>
              <td>${s.metrics.averageChunkSize.toFixed(0)}</td>
              <td>${s.metrics.precisionAt1.toFixed(2)}</td>
              <td>${s.metrics.precisionAt3.toFixed(2)}</td>
              <td>${s.metrics.precisionAt5.toFixed(2)}</td>
              <td>${s.metrics.recallAt3.toFixed(2)}</td>
              <td class="highlight">${s.metrics.meanReciprocalRank.toFixed(3)}</td>
              <td>${(s.metrics.hitRate * 100).toFixed(0)}%</td>
              <td>${(s.metrics.contextFragmentationScore * 100).toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  <script>window.__CHUNKCRAFT_DATA__ = ${jsonRaw};</script>
</body>
</html>`;
}
