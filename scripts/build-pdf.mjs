import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const DOCS_DIR = resolve(import.meta.dirname, '../docs');
const OUTPUT_PDF = resolve(import.meta.dirname, '../docs/public/claude-code-complete-guide-v2.pdf');

const SIDEBAR_ORDER = [
  { title: '前言', dir: 'part00-preface', sections: ['index', 'roadmap', 'glossary', 'setup'] },
  { title: '第1篇：背景故事', dir: 'part01-background', sections: ['index', '02-source-overview', '03-community', '04-why-learn', '05-legal-ethics'] },
  { title: '第2篇：小白快速上手', dir: 'part02-quickstart', sections: ['index', '02-installation', '03-first-chat', '04-edit-files', '05-run-commands', '06-git-workflow', '07-cheatsheet', '08-cost-tips'] },
  { title: '第3篇：架构全景', dir: 'part03-architecture', sections: ['index', '02-four-entries', '03-directory-structure', '04-data-flow', '05-tech-stack', '06-comparison', '07-startup', '08-main-entry', '09-dependencies', '10-philosophy'] },
  { title: '第4篇：核心循环', dir: 'part04-queryengine', sections: ['index', '02-eight-steps', '03-source-walkthrough', '04-message-preparation', '05-api-streaming', '06-tool-collection', '07-silent-error-handling', '08-budget-checks', '09-termination', '10-thinking-mode', '11-parallel-executor', '12-ecosystem'] },
  { title: '第5篇：提示词工程', dir: 'part05-prompt-engineering', sections: ['index', '02-static-constitution', '03-dynamic-policy', '04-cache-boundary', '05-token-economics', '06-cache-pitfalls', '07-behavior-constraints', '08-tool-manuals', '09-comparison', '10-practice'] },
  { title: '第6篇：工具系统', dir: 'part06-tool-system', sections: ['index', '02-tool-interface', '03-governance-pipeline', '04-bash-tool', '05-file-tools', '06-search-tools', '07-agent-tool', '08-external-tools', '09-mcp-tools', '10-fail-closed', '11-lazy-loading', '12-practice'] },
  { title: '第7篇：权限与安全', dir: 'part07-permissions', sections: ['index', '02-six-modes', '03-basic-modes', '04-auto-mode', '05-advanced-modes', '06-evaluation-pipeline', '07-bash-ast', '08-sandbox', '09-fail-closed', '10-practice'] },
  { title: '第8篇：上下文管理', dir: 'part08-context-management', sections: ['index', '02-three-tiers', '03-micro-compaction', '04-auto-compaction', '05-full-compaction', '06-cache-aware', '07-api-compaction', '08-manual-compact', '09-cost-analysis', '10-best-practices'] },
  { title: '第9篇：记忆系统', dir: 'part09-memory-system', sections: ['index', '02-claude-md', '03-auto-extraction', '04-dual-model-retrieval', '05-precision-first', '06-kairos-dreaming', '07-dream-distillation', '08-memory-context', '09-persistence', '10-practice'] },
  { title: '第10篇：多Agent系统', dir: 'part10-multi-agent', sections: ['index', '02-six-agents', '03-explore-agent', '04-plan-agent', '05-coordinator', '06-anti-lazy', '07-verification-agent', '08-cache-optimization', '09-anti-recursion', '10-message-routing', '11-swarm-vs-coordinator', '12-practice'] },
  { title: '第11篇：终端UI', dir: 'part11-terminal-ui', sections: ['index', '02-yoga-layout', '03-react-fiber', '04-streaming-render', '05-input-handling', '06-virtual-scroll', '07-vim-mode', '08-diff-display', '09-mouse-hyperlinks', '10-design-system'] },
  { title: '第12篇：Bridge桥接', dir: 'part12-bridge', sections: ['index', '02-ipc', '03-bridge-main', '04-protocol', '05-jwt-auth', '06-session-runner', '07-transport', '08-ide-integration', '09-bounded-uuid-set', '10-summary'] },
  { title: '第13篇：状态管理', dir: 'part13-state-management', sections: ['index', '02-app-state', '03-side-effects', '04-memdir', '05-history', '06-migrations', '07-persistence', '08-overview'] },
  { title: '第14篇：服务与集成', dir: 'part14-services', sections: ['index', '02-error-handling', '03-mcp-protocol', '04-mcp-transport', '05-lsp', '06-oauth', '07-feature-flags', '08-summary'] },
  { title: '第15篇：隐藏功能', dir: 'part15-hidden-features', sections: ['index', '02-undercover-mode', '03-buddy-pet', '04-anti-cheat', '05-deep-planning', '06-internal-easter-eggs'] },
  { title: '第16篇：Hooks/Skills/Plugins', dir: 'part16-hooks-skills-plugins', sections: ['index', '02-pre-tool-use', '03-skills', '04-plugins', '05-mcp-injection', '06-custom-commands', '07-defer-loading', '08-practice'] },
  { title: '第17篇：性能与成本', dir: 'part17-performance-cost', sections: ['index', '02-prompt-caching', '03-parallel-prefetch', '04-lazy-loading', '05-sub-agent-cache', '06-render-performance', '07-streaming-pipeline', '08-cost-cheatsheet'] },
  { title: '第18篇：遥测与生命周期', dir: 'part18-telemetry-lifecycle', sections: ['index', '02-perfetto', '03-telemetry', '04-resource-cleanup', '05-error-recovery', '06-best-practices'] },
  { title: '第19篇：实战Lab', dir: 'part19-labs', sections: ['index', '02-tool-registry', '03-permissions', '04-streaming', '05-mcp-server', '06-multi-agent', '07-context-compaction', '08-full-integration'] },
  { title: '第20篇：总结与展望', dir: 'part20-summary', sections: ['index', '02-comparison', '03-future', '04-insights', '05-learning-path', '06-conclusion'] },
  { title: '附录', dir: 'appendix', sections: ['source-index', 'cheatsheet', 'quiz', 'further-reading', 'glossary-en-zh'] },
];

function stripFrontmatter(md) {
  if (md.startsWith('---')) {
    const end = md.indexOf('---', 3);
    if (end !== -1) return md.slice(end + 3).trim();
  }
  return md.trim();
}

function stripMermaid(md) {
  return md.replace(/```mermaid[\s\S]*?```/g, '\n> [Mermaid 图表 — 请在在线版本中查看]\n');
}

function buildCombinedMarkdown() {
  let combined = `# Claude Code 完全指南 V2\n\n`;
  combined += `> 全网最详细的 Claude Code 51万行 TypeScript 源码解读\n\n`;
  combined += `> 在线阅读（含交互图表）：https://bcefghj.github.io/claude-code-complete-guide_v2/\n\n`;
  combined += `---\n\n`;

  // Table of contents
  combined += `## 目录\n\n`;
  let sectionNum = 0;
  for (const part of SIDEBAR_ORDER) {
    combined += `### ${part.title}\n\n`;
    for (const sec of part.sections) {
      sectionNum++;
      const filePath = join(DOCS_DIR, part.dir, `${sec}.md`);
      try {
        const content = readFileSync(filePath, 'utf-8');
        const stripped = stripFrontmatter(content);
        const titleMatch = stripped.match(/^#\s+(.+)/m);
        const title = titleMatch ? titleMatch[1] : sec;
        combined += `- ${title}\n`;
      } catch { combined += `- ${sec}\n`; }
    }
    combined += `\n`;
  }
  combined += `---\n\n`;

  // Actual content
  for (const part of SIDEBAR_ORDER) {
    combined += `\n\n<div style="page-break-before: always;"></div>\n\n`;
    combined += `# ${part.title}\n\n`;

    for (const sec of part.sections) {
      const filePath = join(DOCS_DIR, part.dir, `${sec}.md`);
      try {
        let content = readFileSync(filePath, 'utf-8');
        content = stripFrontmatter(content);
        content = stripMermaid(content);
        combined += `\n\n${content}\n\n`;
        combined += `---\n\n`;
      } catch (e) {
        combined += `\n\n> 内容待补充: ${sec}\n\n---\n\n`;
      }
    }
  }

  return combined;
}

function markdownToHtml(md) {
  let html = md;

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang}">${code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`;
  });

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Tables (simple)
  html = html.replace(/\n(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/g, (match, header, sep, body) => {
    const heads = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
    const rows = body.trim().split('\n').map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('\n');
    return `\n<table><thead><tr>${heads}</tr></thead><tbody>${rows}</tbody></table>\n`;
  });

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, '<ul>$&</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr/>');

  // Page breaks
  html = html.replace(/<div style="page-break-before: always;"><\/div>/g,
    '<div style="page-break-before:always;"></div>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Paragraphs
  html = html.replace(/\n\n([^<\n])/g, '\n\n<p>$1');

  return html;
}

async function generatePdf() {
  console.log('Step 1: Building combined markdown...');
  const combinedMd = buildCombinedMarkdown();
  writeFileSync('/tmp/combined-guide.md', combinedMd);
  console.log(`  Combined: ${combinedMd.length} characters`);

  console.log('Step 2: Converting to HTML...');
  const bodyHtml = markdownToHtml(combinedMd);

  const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>Claude Code 完全指南 V2</title>
<style>
  @page { margin: 2cm 1.8cm; size: A4; }
  body {
    font-family: -apple-system, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 11pt;
    line-height: 1.7;
    color: #1a1a1a;
    max-width: 100%;
  }
  h1 { font-size: 22pt; color: #c4623e; border-bottom: 2px solid #c4623e; padding-bottom: 8px; margin-top: 30px; page-break-after: avoid; }
  h2 { font-size: 16pt; color: #2c3e50; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px; margin-top: 24px; page-break-after: avoid; }
  h3 { font-size: 13pt; color: #34495e; margin-top: 18px; page-break-after: avoid; }
  h4 { font-size: 11.5pt; color: #555; margin-top: 14px; page-break-after: avoid; }
  code {
    background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 3px;
    padding: 1px 4px; font-family: "SF Mono", "Fira Code", Consolas, monospace; font-size: 9.5pt;
  }
  pre {
    background: #282c34; color: #abb2bf; border-radius: 6px;
    padding: 12px 16px; overflow-x: auto; font-size: 9pt; line-height: 1.5;
    page-break-inside: avoid;
  }
  pre code { background: none; border: none; color: inherit; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 10pt; page-break-inside: avoid; }
  th { background: #f0f0f0; font-weight: 600; text-align: left; padding: 8px 10px; border: 1px solid #d0d0d0; }
  td { padding: 6px 10px; border: 1px solid #d0d0d0; }
  tr:nth-child(even) { background: #fafafa; }
  blockquote {
    border-left: 4px solid #c4623e; margin: 12px 0; padding: 8px 16px;
    background: #fff8f5; color: #666; font-style: italic;
  }
  a { color: #c4623e; text-decoration: none; }
  hr { border: none; border-top: 1px solid #e0e0e0; margin: 20px 0; }
  li { margin: 3px 0; }
  strong { color: #2c3e50; }
  .cover {
    text-align: center; padding: 120px 0 60px;
    page-break-after: always;
  }
  .cover h1 { font-size: 32pt; border: none; color: #c4623e; }
  .cover p { font-size: 14pt; color: #666; margin: 10px 0; }
  .cover .badge { display: inline-block; background: #c4623e; color: white; padding: 4px 12px; border-radius: 12px; font-size: 10pt; margin: 3px; }
</style>
</head>
<body>
<div class="cover">
  <h1>Claude Code 完全指南 V2</h1>
  <p>全网最详细的 Claude Code 51万行 TypeScript 源码解读</p>
  <p style="margin-top:30px;">
    <span class="badge">20 篇</span>
    <span class="badge">187 节</span>
    <span class="badge">44,600+ 行</span>
    <span class="badge">100+ 架构图</span>
    <span class="badge">8 个实战 Lab</span>
  </p>
  <p style="margin-top:40px; font-size:11pt; color:#999;">
    在线版本（含交互 Mermaid 图表）：<br/>
    https://bcefghj.github.io/claude-code-complete-guide_v2/
  </p>
  <p style="margin-top:20px; font-size:10pt; color:#aaa;">2026 年 4 月</p>
</div>
${bodyHtml}
<div style="text-align:center; margin-top:60px; color:#999; font-size:9pt;">
  <hr/>
  <p>Claude Code 完全指南 V2 | 仅用于教育学习目的</p>
  <p>Claude Code 源码版权归 Anthropic, PBC 所有 | MIT License</p>
  <p>GitHub: https://github.com/bcefghj/claude-code-complete-guide_v2</p>
</div>
</body>
</html>`;

  writeFileSync('/tmp/combined-guide.html', fullHtml);
  console.log(`  HTML: ${fullHtml.length} characters`);

  console.log('Step 3: Launching Chrome for PDF generation...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 60000 });

  console.log('Step 4: Generating PDF with bookmarks...');
  await page.pdf({
    path: OUTPUT_PDF,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:8pt; color:#999; width:100%; text-align:center; padding:0 1.5cm;">
      Claude Code 完全指南 V2
    </div>`,
    footerTemplate: `<div style="font-size:8pt; color:#999; width:100%; text-align:center; padding:0 1.5cm;">
      <span class="pageNumber"></span> / <span class="totalPages"></span>
    </div>`,
    margin: { top: '2cm', bottom: '2cm', left: '1.8cm', right: '1.8cm' },
    tagged: true,
    outline: true,
  });

  await browser.close();
  console.log(`\nPDF generated: ${OUTPUT_PDF}`);
}

generatePdf().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
