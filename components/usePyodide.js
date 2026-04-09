import { useRef, useEffect } from 'react';

const PYTHON_CODE = `
import re
import json

def is_real_acronym(acronym, definition):
    # Must be 2-12 chars
    if len(acronym) < 2 or len(acronym) > 12:
        return False
    # Must contain at least 2 uppercase letters
    if sum(1 for c in acronym if c.isupper()) < 2:
        return False
    # Uppercase-dominant: at least 60% of letters are uppercase
    letters = [c for c in acronym if c.isalpha()]
    if not letters or sum(1 for c in letters if c.isupper()) / len(letters) < 0.6:
        return False
    # Definition must be multi-word (a real expansion has multiple words)
    def_words = definition.split()
    if len(def_words) < 2:
        return False
    # First letter of acronym must match first letter of one of the definition words
    first_letters = {w[0].upper() for w in def_words if w}
    if acronym[0].upper() not in first_letters:
        return False
    return True

def extract_acronyms(text):
    text = ' '.join(text.split())
    patterns = [
        r'([\\w\\s&.-]+?)\\s*\\(\\s*([A-Z][A-Za-z0-9\\-\\.]{1,10})\\s*\\)',
        r'([A-Z][A-Za-z0-9\\-\\.]{1,10})\\s*\\(\\s*([\\w\\s&.-]+?)\\s*\\)',
        r'([A-Z][A-Za-z0-9\\-\\.]{1,10})\\s*[\\-\\u2013\\u2014:]\\s*([\\w\\s&.-]+?)(?=\\.|,|;|$)',
    ]
    results = []
    acronyms_seen = set()
    for pattern in patterns:
        matches = re.finditer(pattern, text)
        for match in matches:
            first_group = match.group(1).strip()
            second_group = match.group(2).strip()
            if re.match(r'^[A-Z][A-Za-z0-9\\-\\.]{1,10}$', first_group):
                acronym = first_group
                definition = second_group
            else:
                acronym = second_group
                definition = first_group
            if len(definition) < len(acronym) or len(definition) > 200:
                continue
            if not is_real_acronym(acronym, definition):
                continue
            if acronym not in acronyms_seen:
                acronyms_seen.add(acronym)
                results.append({
                    'acronym': acronym,
                    'definition': definition,
                    'description': '',
                    'keywords': ['PDF Import'],
                    'id': f"{acronym.lower()}-pdf",
                })
    return results

def process_pdf_text(text):
    try:
        extracted = extract_acronyms(text)
        return json.dumps(extracted)
    except Exception as e:
        return json.dumps([])
`;

export function usePyodide() {
  const pyodideRef = useRef(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (document.querySelector('script[src*="pyodide"]')) return;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js';
    script.onerror = () => console.warn('Failed to load Pyodide. PDF text extraction will fall back to JS patterns.');
    document.head.appendChild(script);
  }, []);

  async function getPyodide() {
    if (pyodideRef.current) return pyodideRef.current;
    if (loadingRef.current) {
      // Wait until it's ready
      await new Promise(resolve => {
        const interval = setInterval(() => {
          if (pyodideRef.current) { clearInterval(interval); resolve(); }
        }, 200);
      });
      return pyodideRef.current;
    }
    loadingRef.current = true;
    // Wait for the global loadPyodide to be available
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (typeof window !== 'undefined' && window.loadPyodide) { clearInterval(check); resolve(); }
      }, 300);
    });
    const pyodide = await window.loadPyodide();
    await pyodide.runPythonAsync('import re\nimport json\nimport io');
    await pyodide.runPythonAsync(PYTHON_CODE);
    pyodideRef.current = pyodide;
    loadingRef.current = false;
    return pyodide;
  }

  async function processPDFText(text) {
    try {
      const pyodide = await getPyodide();
      pyodide.globals.set('pdf_text', text);
      const jsonResult = pyodide.runPython('process_pdf_text(pdf_text)');
      pyodide.globals.delete('pdf_text');
      const parsed = JSON.parse(jsonResult);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return { processPDFText };
}
