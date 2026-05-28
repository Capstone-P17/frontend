import ReactMarkdown from 'react-markdown';
import { isValidElement } from 'react';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

function safeHref(href: string | undefined): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) return trimmed;
  return null;
}

type CodeBlockLine = {
  key: string;
  lineNumber: string;
  oldLineNumber: string;
  newLineNumber: string;
  marker: string;
  content: string;
  state: 'plain' | 'active' | 'add' | 'del' | 'hunk' | 'meta';
};

function languageFromClassName(className: unknown): string {
  const value = typeof className === 'string' ? className : '';
  return value.match(/language-([a-zA-Z0-9_-]+)/)?.[1] ?? 'text';
}

function normalizeCode(code: unknown): string {
  return String(code ?? '').replace(/\n$/, '');
}

function stripSnippetPrefix(line: string): string {
  const match = line.match(/^\s*>?\s*\d+\s*\|\s?(.*)$/);
  return match ? match[1] : line;
}

function toCodeBlockLines(code: string, language: string): CodeBlockLine[] {
  const rawLines = code.length ? code.split('\n') : [''];
  const isDiff = language === 'diff' || rawLines.some((line) => /^(?:\+|-|@@)/.test(line));
  const parsedLines: CodeBlockLine[] = [];
  let oldLineNumber: number | null = null;
  let newLineNumber: number | null = null;

  rawLines.forEach((rawLine, index) => {
    const snippetMatch = rawLine.match(/^(\s*>?)\s*(\d+)\s\|\s?(.*)$/);
    if (snippetMatch) {
      const active = snippetMatch[1].includes('>');
      parsedLines.push({
        key: `${index}-${rawLine}`,
        lineNumber: snippetMatch[2],
        oldLineNumber: '',
        newLineNumber: '',
        marker: active ? '●' : '',
        content: snippetMatch[3],
        state: active ? 'active' : 'plain',
      });
      return;
    }

    if (isDiff) {
      const hunkMatch = rawLine.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
      if (rawLine.startsWith('@@')) {
        if (hunkMatch) {
          oldLineNumber = Number(hunkMatch[1]);
          newLineNumber = Number(hunkMatch[2]);
        }
        parsedLines.push({ key: `${index}-${rawLine}`, lineNumber: '', oldLineNumber: '', newLineNumber: '', marker: '', content: rawLine, state: 'hunk' });
        return;
      }
      if (rawLine.startsWith('+++') || rawLine.startsWith('---')) {
        parsedLines.push({ key: `${index}-${rawLine}`, lineNumber: '', oldLineNumber: '', newLineNumber: '', marker: rawLine.slice(0, 3), content: rawLine.slice(3).trimStart(), state: 'meta' });
        return;
      }
      if (rawLine.startsWith('+')) {
        const currentNew = newLineNumber === null ? '' : String(newLineNumber);
        if (newLineNumber !== null) newLineNumber += 1;
        parsedLines.push({ key: `${index}-${rawLine}`, lineNumber: '', oldLineNumber: '', newLineNumber: currentNew, marker: '+', content: rawLine.slice(1), state: 'add' });
        return;
      }
      if (rawLine.startsWith('-')) {
        const currentOld = oldLineNumber === null ? '' : String(oldLineNumber);
        if (oldLineNumber !== null) oldLineNumber += 1;
        parsedLines.push({ key: `${index}-${rawLine}`, lineNumber: '', oldLineNumber: currentOld, newLineNumber: '', marker: '-', content: rawLine.slice(1), state: 'del' });
        return;
      }
      if (oldLineNumber !== null && newLineNumber !== null) {
        const currentOld = String(oldLineNumber);
        const currentNew = String(newLineNumber);
        oldLineNumber += 1;
        newLineNumber += 1;
        parsedLines.push({ key: `${index}-${rawLine}`, lineNumber: '', oldLineNumber: currentOld, newLineNumber: currentNew, marker: '', content: rawLine.replace(/^ /, ''), state: 'plain' });
        return;
      }
    }

    parsedLines.push({
      key: `${index}-${rawLine}`,
      lineNumber: String(index + 1),
      oldLineNumber: '',
      newLineNumber: '',
      marker: '',
      content: rawLine,
      state: 'plain',
    });
  });
  return parsedLines;
}

export function CodeBlock({ code, language = 'text', title }: { code: string; language?: string; title?: string }) {
  const normalizedLanguage = language.toLowerCase();
  const lines = toCodeBlockLines(code, normalizedLanguage);
  const isDiff = normalizedLanguage === 'diff' || lines.some((line) => ['add', 'del', 'hunk', 'meta'].includes(line.state));

  return (
    <figure className={`code-viewer ${isDiff ? 'diff-viewer' : 'snippet-viewer'}`}>
      <figcaption className="code-viewer-header">
        <span>{title ?? (isDiff ? '변경 예시' : '코드 스니펫')}</span>
        <b>{normalizedLanguage}</b>
      </figcaption>
      <pre className="code-viewer-pre">
        <code>
          {lines.map((line) => (
            <span className={`code-viewer-line ${line.state}`} key={line.key}>
              {isDiff ? (
                <>
                  <span className="code-viewer-gutter old">{line.oldLineNumber}</span>
                  <span className="code-viewer-gutter new">{line.newLineNumber}</span>
                </>
              ) : (
                <span className="code-viewer-gutter">{line.lineNumber}</span>
              )}
              <span className="code-viewer-marker">{line.marker}</span>
              <span className="code-viewer-text">{stripSnippetPrefix(line.content) || ' '}</span>
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        skipHtml
        components={{
        a: ({ href, children, ...props }) => {
          const safe = safeHref(href);
          if (!safe) return <span>{children}</span>;
          return (
            <a href={safe} target={safe.startsWith('http') ? '_blank' : undefined} rel={safe.startsWith('http') ? 'noreferrer' : undefined} {...props}>
              {children}
            </a>
          );
        },
        pre: ({ children }) => {
          if (isValidElement<{ className?: string; children?: unknown }>(children)) {
            const language = languageFromClassName(children.props.className);
            return <CodeBlock code={normalizeCode(children.props.children)} language={language} />;
          }
          return <CodeBlock code={normalizeCode(children)} />;
        },
        code: ({ className, children, ...props }) => <code className={className} {...props}>{children}</code>,
        table: ({ children, ...props }) => <div className="markdown-table-scroll"><table {...props}>{children}</table></div>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
