import { useState, useEffect, useRef, useCallback } from 'react';
import AcronymCard from '../components/AcronymCard';
import { usePyodide } from '../components/usePyodide';

const ACRONYM_PATTERNS = [
  /([\w\s\-&.]+?)\s*\(\s*([A-Z][A-Za-z0-9\-.]{1,10})\s*\)/g,
  /([A-Z][A-Za-z0-9\-.]{1,10})\s*\(\s*([\w\s\-&.]+?)\s*\)/g,
  /([A-Z][A-Za-z0-9\-.]{1,10})\s*[-–—:]\s*([\w\s\-&.]+?)(?=\.|,|;|$)/g,
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getRandomItems(arr, count = 9) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export default function Home() {
  const [acronymsData, setAcronymsData]     = useState([]);
  const [dataLoading, setDataLoading]       = useState(true);
  const [searchTerm, setSearchTerm]         = useState('');
  const [results, setResults]               = useState([]);
  const [randomAcronyms, setRandomAcronyms] = useState([]);
  const [error, setError]                   = useState('');
  const [resultCount, setResultCount]       = useState(null);
  const [fileName, setFileName]             = useState('No file selected');
  const [pageCount, setPageCount]           = useState(null);
  const [pdfProgress, setPdfProgress]       = useState(0);
  const [pdfLoading, setPdfLoading]         = useState(false);
  const [isListening, setIsListening]       = useState(false);
  const [isSpinning, setIsSpinning]         = useState(false);
  const [isPdfSpinning, setIsPdfSpinning]   = useState(false);
  const recognitionRef = useRef(null);
  const fileInputRef   = useRef(null);
  const { processPDFText } = usePyodide();

  // Load PDF.js
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (document.querySelector('script[src*="pdf.min.js"]')) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    };
    script.onerror = () => showError('Failed to load PDF library. PDF import may not work.');
    document.head.appendChild(script);
  }, []);

  // Load acronyms
  useEffect(() => {
    fetch('/data.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const ct = r.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('Unexpected response format');
        return r.json();
      })
      .then(data => {
        if (!Array.isArray(data)) throw new Error('Invalid data format');
        setAcronymsData(data);
        setRandomAcronyms(getRandomItems(data));
      })
      .catch(() => setError('Failed to load acronyms data. Please refresh the page.'))
      .finally(() => setDataLoading(false));
  }, []);

  // Voice recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onstart = () => setIsListening(true);
    rec.onend   = () => setIsListening(false);
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setSearchTerm(t);
      doSearch(t);
    };
    const errorMessages = {
      'no-speech': 'No speech detected. Please try again.',
      'audio-capture': 'Microphone not available.',
      'not-allowed': 'Microphone permission denied.',
      'network': 'Network error during voice recognition.',
    };
    rec.onerror = (e) => showError(errorMessages[e.error] || 'Voice recognition failed.');
    recognitionRef.current = rec;
  }, []);

  function showError(msg) {
    setError(msg);
    setTimeout(() => setError(''), 3500);
  }

  const doSearch = useCallback((term) => {
    if (!term) { showError('Please enter a search term'); return; }
    if (!acronymsData.length) { showError('Data is still loading.'); return; }
    const regex = new RegExp(`^${escapeRegex(term)}`, 'i');
    const matches = acronymsData.filter(item => regex.test(item.acronym));
    if (!matches.length) {
      showError(`No results for "${term}"`);
      setResultCount(null); setResults([]);
    } else {
      setResultCount(matches.length);
      setResults(matches.map((item, i) => ({ ...item, _key: `${item.acronym}-${i}` })));
    }
  }, [acronymsData]);

  function handleSearch(e) { e.preventDefault(); doSearch(searchTerm); }
  function handleClear()   { setSearchTerm(''); setResults([]); setResultCount(null); }

  function handleTagClick(acronym) { setSearchTerm(acronym); doSearch(acronym); }
  function refreshRandom() {
    setRandomAcronyms(getRandomItems(acronymsData));
    setIsSpinning(true);
    setTimeout(() => setIsSpinning(false), 500);
  }

  function toggleVoice() {
    if (!recognitionRef.current) return;
    isListening ? recognitionRef.current.stop() : recognitionRef.current.start();
  }

  function removeCard(key) { setResults(prev => prev.filter(r => r._key !== key)); }

  // ── PDF ──────────────────────────────────────────
  async function parsePDFFile(file, pdfDoc) {
    let extractedText = '';
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const tc   = await page.getTextContent();
      extractedText += tc.items.filter(it => it.transform[0] < 20).map(it => it.str).join(' ') + '\n';
      setPdfProgress(Math.round((i / pdfDoc.numPages) * 100));
    }
    const pyResults = await processPDFText(extractedText);
    if (pyResults?.length) {
      return pyResults.filter(r => r?.acronym && r?.definition).map(r => ({
        acronym: r.acronym, definition: r.definition,
        description: r.description || '', keywords: r.keywords || ['PDF Import'],
        id: r.id || `${r.acronym.toLowerCase()}-pdf`,
      }));
    }
    const acronyms = new Map();
    ACRONYM_PATTERNS.forEach(pattern => {
      const p = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = p.exec(extractedText)) !== null) {
        const a = match[1].trim(), b = match[2].trim();
        const isAFirst = a.length < b.length && /^[A-Z][A-Za-z0-9\-.]{1,10}$/.test(a);
        const acronymText = isAFirst ? a : b;
        const defText     = isAFirst ? b : a;
        if (acronymText.length >= 2 && /[A-Z]/.test(acronymText)) {
          acronyms.set(acronymText, {
            acronym: acronymText, definition: defText,
            description: '', keywords: ['PDF Import'],
            id: `${acronymText.toLowerCase()}-pdf`,
          });
        }
      }
    });
    return Array.from(acronyms.values());
  }

  async function handlePDFFile(file) {
    if (!file) return;
    setFileName(file.name); setPdfLoading(true); setPdfProgress(0); setPageCount(null);
    try {
      const buf    = await file.arrayBuffer();
      const pdfDoc = await window.pdfjsLib.getDocument({ data: buf }).promise;
      setPageCount(pdfDoc.numPages);
      const extracted   = await parsePDFFile(file, pdfDoc);
      const newAcronyms = extracted.filter(
        n => n?.acronym && n?.definition && !acronymsData.some(e => e.acronym === n.acronym)
      );
      if (newAcronyms.length) {
        const updated = [...acronymsData, ...newAcronyms];
        setAcronymsData(updated);
        const uploaded = updated.filter(item =>
          Array.isArray(item.keywords) ? item.keywords.includes('PDF Import') : item.keywords === 'PDF Import'
        );
        setResultCount(uploaded.length);
        setResults(uploaded.map((item, i) => ({ ...item, _key: `${item.acronym}-pdf-${i}` })));
        showError(`Imported ${newAcronyms.length} new acronyms from PDF`);
      } else {
        showError('No new acronyms found in the PDF');
      }
    } catch { showError('Error processing PDF'); }
    finally { setPdfLoading(false); setPdfProgress(0); }
  }

  function handleFileInput(e) { const f = e.target.files[0]; if (f) handlePDFFile(f); }

  function handleRefreshUploaded() {
    setIsPdfSpinning(true);
    setTimeout(() => setIsPdfSpinning(false), 500);
    const uploaded = acronymsData.filter(item =>
      Array.isArray(item.keywords) ? item.keywords.includes('PDF Import') : item.keywords === 'PDF Import'
    );
    if (uploaded.length) {
      setResults(uploaded.map((item, i) => ({ ...item, _key: `${item.acronym}-pdf-${i}` })));
      setResultCount(uploaded.length);
    } else { showError('No PDF acronyms available'); }
  }

  function handleDragOver(e) { e.preventDefault(); }
  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type === 'application/pdf') handlePDFFile(f);
    else showError('Please drop a PDF file');
  }

  return (
    <>
      {/* ── HEADER ─────────────────────────────── */}
      <header className="app-header">
        <div className="logo-group">
          <div className="logo-mark">
            <iconify-icon icon="solar:book-2-bold" width="18" height="18" style={{ color: '#fff' }} />
          </div>
          <div className="logo-text">
            <h1>Glossary</h1>
            <p>Acronym Reference System</p>
          </div>
        </div>
        <div className="header-right">
          {acronymsData.length > 0 && (
            <div className="stat-chip">
              <span className="num">{acronymsData.length}</span>
              <span className="lbl">entries</span>
            </div>
          )}
          <a
            className="user-chip"
            href="https://www.linkedin.com/in/gana-dube/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="av">GD</div>
            Gana Dube
          </a>
        </div>
      </header>

      {/* ── BODY ───────────────────────────────── */}
      <div className="body-wrap">

        {/* ── SIDEBAR ──────────────────────────── */}
        <aside className="app-sidebar">

          {/* Random acronym tags */}
          <div>
            <div className="s-title">Quick Access</div>
            <div className="tags-wrap">
              {randomAcronyms.filter(item => !results.some(r => r.acronym === item.acronym)).map((item, i) => (
                <span
                  key={i}
                  className="acronym-tag"
                  onClick={() => handleTagClick(item.acronym)}
                >
                  {item.acronym}
                </span>
              ))}
            </div>
            <button className="s-btn" onClick={refreshRandom}>
              <iconify-icon icon="solar:restart-bold" width="14" height="14" class={isSpinning ? 'spin-once' : ''} /> New Random Set
            </button>
          </div>

          {/* PDF upload */}
          <div>
            <div className="s-title">Import PDF</div>
            <div
              className="upload-zone"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="u-icon">
                <iconify-icon icon="solar:file-text-bold" width="28" height="28" style={{ color: 'rgba(255,255,255,0.35)' }} />
              </div>
              <p><strong>Drop a PDF here</strong><br />Auto-extracts all acronyms</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={handleFileInput}
              />
            </div>
            <div className="filename-row">
              <span>{fileName}{pageCount ? ` · ${pageCount}pp` : ''}</span>
              <button onClick={handleRefreshUploaded} title="Show imported">
                <iconify-icon icon="solar:restart-bold" width="14" height="14" class={isPdfSpinning ? 'spin-once' : ''} />
              </button>
            </div>
            {pdfLoading && (
              <div className="pdf-progress">
                <div className="pdf-progress-bar" style={{ width: `${pdfProgress}%` }} />
              </div>
            )}
          </div>

        </aside>

        {/* ── MAIN ─────────────────────────────── */}
        <main className="app-main">

          {/* Search bar */}
          <form className="search-bar" onSubmit={handleSearch}>
            <button
              type="button"
              className={`i-btn${isListening ? ' listening' : ''}`}
              onClick={toggleVoice}
              title="Voice search"
            >
              <iconify-icon icon={isListening ? 'svg-spinners:3-dots-scale' : 'solar:microphone-bold'} width="16" height="16" />
            </button>
            <input
              type="text"
              placeholder={`Search ${acronymsData.length || '…'} acronyms…`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {resultCount !== null && (
              <span className="result-badge">{resultCount}</span>
            )}
            <button type="button" className="i-btn" onClick={handleClear} title="Clear">
              <iconify-icon icon="solar:close-circle-bold" width="18" height="18" />
            </button>
            <button type="submit" className="i-btn hot" title="Search">
              <iconify-icon icon="solar:magnifer-bold" width="18" height="18" />
            </button>
          </form>

          {dataLoading && <div className="error-toast" style={{ background: 'var(--surface-2, #f0f4ff)' }}>Loading acronyms…</div>}
          {error && <div className="error-toast">{error}</div>}

          {/* Results */}
          <div className="results-scroll">
            {results.length > 0 && (
              <div className="results-area columns is-multiline">
                {results.map(item => (
                  <AcronymCard
                    key={item._key}
                    item={item}
                    onRemove={() => removeCard(item._key)}
                  />
                ))}
              </div>
            )}
          </div>

        </main>
      </div>
    </>
  );
}
