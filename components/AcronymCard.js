import { useState, useEffect, useRef } from 'react';

function renderMarkdown(text) {
  const html = sanitizeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br />');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function convertMarkdownLinks(text) {
  return text.replace(/\[\[(.*?)\]\]\((.*?)\)/g, (_match, alias, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="has-text-link">${alias}</a>`;
  });
}

function sanitizeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeMermaidCode(code) {
  code = code.replace(/note\s+over\s+([^:,]+),([^:]+):/g, 'note over $1 and $2:');
  code = code.replace(/(\w+),(\w+)(\[.+?\])/g, '$1_$2$3');
  code = code.replace(/participant\s+"([^"]*),([^"]*)"/g, 'participant "$1_$2"');
  const lines = code.split('\n').map(line => {
    if (line.match(/^\s*[A-Za-z0-9_-]+\s+[A-Za-z].+$/)) {
      const match = line.match(/^\s*([A-Za-z0-9_-]+)\s+(.+)$/);
      if (match) return `    ${match[1]}["${match[2]}"]`;
    }
    return line;
  });
  return lines.join('\n');
}

function hasScriptKeyword(item) {
  if (!item.keywords) return false;
  if (typeof item.keywords === 'string') return item.keywords.includes('script');
  return item.keywords.some(k => k === 'script');
}

function getTagsList(keywords) {
  if (!keywords) return [];
  if (typeof keywords === 'string') return keywords.split(',').map(t => t.trim()).filter(Boolean);
  return keywords.filter(Boolean);
}

function loadMermaid(callback) {
  if (window.mermaid) {
    window.mermaid.initialize({ startOnLoad: true, securityLevel: 'strict' });
    if (callback) callback();
    return;
  }
  if (document.querySelector('script[src*="mermaid"]')) {
    const poll = setInterval(() => {
      if (window.mermaid) {
        clearInterval(poll);
        window.mermaid.initialize({ startOnLoad: true, securityLevel: 'strict' });
        if (callback) callback();
      }
    }, 200);
    return;
  }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
  s.onload = () => {
    window.mermaid.initialize({ startOnLoad: true, securityLevel: 'strict' });
    if (callback) callback();
  };
  document.head.appendChild(s);
}

export default function AcronymCard({ item, onRemove }) {
  const [aiContent, setAiContent] = useState(null);
  const [aiLoading, setAiLoading] = useState(null);
  const [copied, setCopied] = useState(false);
  const aiContentRef = useRef(null);

  const showScript = hasScriptKeyword(item);
  const tags = getTagsList(item.keywords);

  useEffect(() => {
    if (!aiContent) return;
    const el = aiContentRef.current?.querySelector('.mermaid');
    if (!el) return;
    const run = () => {
      if (window.mermaid) {
        el.removeAttribute('data-processed');
        window.mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });
        window.mermaid.run({ nodes: [el] });
      }
    };
    if (window.mermaid) { run(); return; }
    loadMermaid(run);
  }, [aiContent]);

  async function fetchApi(url, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) throw new Error('Unexpected response format from server.');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || 'Error');
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function handleGemini() {
    setAiLoading('gemini');
    setAiContent(<em>Fetching details...</em>);
    try {
      const data = await fetchApi('/api/tell-me-more', {
        acronym: item.acronym, definition: item.definition, description: item.description || '',
      });
      setAiContent(<>{renderMarkdown(data.text)}</>);
    } catch (e) {
      setAiContent(<span className="has-text-danger">Error: {e.message}</span>);
    } finally { setAiLoading(null); }
  }

  async function handleCode() {
    setAiLoading('code');
    setAiContent(<em>Generating code example...</em>);
    try {
      const data = await fetchApi('/api/give-me-code', {
        acronym: item.acronym, definition: item.definition, description: item.description || '',
      });
      setAiContent(
        <div>
          <strong>Python Code Example:</strong>
          <pre><code className="language-python">{data.text}</code></pre>
        </div>
      );
      setTimeout(() => { if (window.hljs) window.hljs.highlightAll(); }, 100);
    } catch (e) {
      setAiContent(<span className="has-text-danger">Error: {e.message}</span>);
    } finally { setAiLoading(null); }
  }

  async function handleMermaid() {
    setAiLoading('mermaid');
    setAiContent(<em>Generating diagram...</em>);
    const diagramPrompt = `Create a Mermaid diagram that illustrates the concept of ${item.acronym} (${item.definition})${item.description ? `. Additional context: ${item.description}` : ''}`;
    try {
      const data = await fetchApi('/api/show-me-diagram', { diagramPrompt });
      let code = data.mermaidCode.replace(/^```mermaid\n?|\n?```$/g, '');
      code = sanitizeMermaidCode(code);
      setAiContent(
        <div>
          <strong>Diagram:</strong>
          <div className="mermaid">{code}</div>
        </div>
      );
    } catch (e) {
      setAiContent(<span className="has-text-danger">Error: {e.message}</span>);
    } finally { setAiLoading(null); }
  }

  async function handleResearch() {
    setAiLoading('research');
    setAiContent(<em>Searching for research papers...</em>);
    const query = `${item.acronym} ${item.definition}`;
    try {
      const data = await fetchApi('/api/return-research-data', { query });
      const results = data.results || [];
      if (results.length === 0) { setAiContent(<em>No research papers found.</em>); return; }
      setAiContent(
        <div>
          <strong>Research Papers:</strong>
          <ul className="mt-2">
            {results.map((paper, i) => (
              <li key={i} className="mb-2">
                <strong>{paper.title}</strong>
                {paper.authors?.length > 0 && (
                  <span className="is-size-7 has-text-grey ml-1">
                    — {paper.authors.slice(0, 3).map(a => a.name || a).join(', ')}
                  </span>
                )}
                {paper.abstract && <p className="is-size-7 mt-1">{paper.abstract.slice(0, 200)}...</p>}
                {paper.downloadUrl && (
                  <a href={paper.downloadUrl} target="_blank" rel="noopener noreferrer" className="is-size-7 has-text-link">Download PDF</a>
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    } catch (e) {
      setAiContent(<span className="has-text-danger">Error: {e.message}</span>);
    } finally { setAiLoading(null); }
  }

  function handleCopy() {
    let text = `${item.acronym}: ${item.definition}`;
    if (item.description) text += `\nDescription: ${item.description}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  }

  return (
    <div className="column is-half">
      <div className="ac-card">

        {/* ── TOP BAR: acronym + actions ── */}
        <div className="ac-toolbar">
          <button
            className="ac-acronym"
            onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(item.acronym)}`, '_blank', 'noopener,noreferrer')}
          >
            {item.acronym}
          </button>
          <div className="ac-actions">
            {showScript && (
              <button
                className={`ac-btn${aiLoading === 'code' ? ' loading' : ''}`}
                onClick={handleCode}
                disabled={!!aiLoading}
                title="Python code example"
              >
                <iconify-icon icon="solar:code-bold" width="13" height="13" />
              </button>
            )}
            <button
              className={`ac-btn${aiLoading === 'mermaid' ? ' loading' : ''}`}
              onClick={handleMermaid}
              disabled={!!aiLoading}
              title="Generate diagram"
            >
              <img src="/icons/mermaid-icon.svg" width="13" height="13" alt="Mermaid" />
            </button>
            <button
              className={`ac-btn${aiLoading === 'research' ? ' loading' : ''}`}
              onClick={handleResearch}
              disabled={!!aiLoading}
              title="Find research papers"
            >
              <iconify-icon icon="solar:document-text-bold" width="13" height="13" />
            </button>
            <button
              className={`ac-btn${aiLoading === 'gemini' ? ' loading' : ''}`}
              onClick={handleGemini}
              disabled={!!aiLoading}
              title="Tell me more (AI)"
            >
              <img src="/icons/google-gemini-icon.svg" width="13" height="13" alt="Gemini" />
            </button>
            <button
              className={`ac-btn${copied ? ' success' : ''}`}
              onClick={handleCopy}
              title="Copy"
            >
              <iconify-icon icon={copied ? 'solar:check-circle-bold' : 'solar:copy-bold'} width="13" height="13" />
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="ac-body">
          <p className="ac-definition"><strong>Definition:</strong> {item.definition}</p>

          {item.description && (
            <p
              className="ac-description"
              dangerouslySetInnerHTML={{
                __html: `<strong>Description:</strong> ${convertMarkdownLinks(sanitizeHtml(item.description))}`,
              }}
            />
          )}

          {aiContent && (
            <div className="ac-ai-response" ref={aiContentRef}>
              {aiContent}
              <button
                className="ac-btn ac-ai-close"
                onClick={() => setAiContent(null)}
                title="Close"
              >
                <iconify-icon icon="solar:close-circle-bold" width="13" height="13" />
              </button>
            </div>
          )}
        </div>

        {/* ── FOOTER: tags + delete ── */}
        {(tags.length > 0 || true) && (
          <div className="ac-footer">
            <div className="ac-tags">
              {tags.map((tag, i) => (
                <span key={i} className="ac-tag">{tag}</span>
              ))}
            </div>
            <button className="ac-btn danger" onClick={onRemove} title="Remove card">
              <iconify-icon icon="solar:trash-bin-minimalistic-bold" width="13" height="13" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
