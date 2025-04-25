// pyodide-integration.js

// Store the Pyodide instance globally
let pyodideInstance = null;

// Initialize Pyodide
async function initPyodide() {
  if (pyodideInstance) return pyodideInstance;

  try {
    // Show loading indicator
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'notification is-info';
    loadingMessage.textContent = 'Loading Python environment...';
    document.body.appendChild(loadingMessage);

    // Load Pyodide
    pyodideInstance = await loadPyodide();

    // First import the modules into the global namespace
    await pyodideInstance.runPythonAsync(`
      import re
      import json
      import io
    `);

    // Remove loading indicator
    document.body.removeChild(loadingMessage);

    // Then load your Python script for PDF processing
    await pyodideInstance.runPythonAsync(`
      # Python functions for PDF processing
      def extract_acronyms(text):
          """
          Extract acronyms with improved pattern matching using Python's powerful regex

          Args:
              text (str): The text extracted from the PDF

          Returns:
              list: List of dictionaries containing acronyms and their definitions
          """
          # Normalize whitespace and newlines
          text = ' '.join(text.split())

          # Common patterns for acronyms in technical documents
          patterns = [
              # Pattern: Term (ACRONYM)
              r'([\w\s\-\&\.]+?)\s*\(\s*([A-Z][A-Za-z0-9\-\.]{1,10})\s*\)',

              # Pattern: ACRONYM (Term)
              r'([A-Z][A-Za-z0-9\-\.]{1,10})\s*\(\s*([\w\s\-\&\.]+?)\s*\)',

              # Pattern: ACRONYM - Term
              r'([A-Z][A-Za-z0-9\-\.]{1,10})\s*[\-–—:]\s*([\w\s\-\&\.]+?)(?=\.|,|;|$)',
          ]

          results = []
          acronyms_seen = set()

          for pattern in patterns:
              matches = re.finditer(pattern, text)
              for match in matches:
                  # Get groups from the match
                  first_group = match.group(1).strip()
                  second_group = match.group(2).strip()

                  # Determine which is the acronym and which is the definition
                  if re.match(r'^[A-Z][A-Za-z0-9\-\.]{1,10}$', first_group):
                      acronym = first_group
                      definition = second_group
                  else:
                      acronym = second_group
                      definition = first_group

                  # Validate acronym (must have at least 2 characters and be uppercase)
                  if len(acronym) < 2 or not any(c.isupper() for c in acronym):
                      continue

                  # Validate definition (should be longer than acronym and reasonable length)
                  if len(definition) < len(acronym) or len(definition) > 200:
                      continue

                  # Check if acronym starts with first letter of definition
                  # (common in true acronyms)
                  first_letters = [word[0].upper() if word else '' for word in definition.split()]
                  first_letter_check = ''.join(first_letters)

                  # Only add if we haven't seen this acronym before
                  if acronym not in acronyms_seen:
                      acronyms_seen.add(acronym)
                      results.append({
                          'acronym': acronym,
                          'definition': definition,
                          'tags': ['PDF Import'],
                          'confidence': 'high' if acronym[0] in first_letter_check else 'medium'
                      })

          # Sort by confidence
          results.sort(key=lambda x: 0 if x.get('confidence') == 'high' else 1)

          return results

      # Return a JSON-friendly structure
      def process_pdf_text(text):
          extracted = extract_acronyms(text)
          return json.dumps(extracted)
    `);

    console.log("Pyodide loaded successfully!");
    return pyodideInstance;
  } catch (error) {
    console.error("Failed to load Pyodide:", error);
    // Handle error (show error message to user)
    const errorMessage = document.createElement('div');
    errorMessage.className = 'notification is-danger';
    errorMessage.textContent = 'Failed to load Python environment. Using JavaScript fallback.';
    document.body.appendChild(errorMessage);

    setTimeout(() => {
      document.body.removeChild(errorMessage);
    }, 5000);

    return null;
  }
}

// Add this helper function
function dedent(str) {
  // Remove common leading whitespace from every line
  str = str.replace(/^\n/, '');
  const match = str.match(/^[ \t]*(?=\S)/gm);
  if (!match) return str;

  const indent = Math.min(...match.map(x => x.length));
  const re = new RegExp(`^[ \\t]{${indent}}`, 'gm');
  return str.replace(re, '');
}


// Function to process PDF text using Python
async function processPDFWithPython(text) {
  try {
    const pyodide = await initPyodide();
    if (!pyodide) {
      // If Pyodide failed to load, return empty result
      return [];
    }

    // Define the function and process the text in a single execution context
    const jsonResult = pyodide.runPython(dedent(`
      import re
      import json

      text = '''${text.replace(/'/g, "\\'")}'''

      # Extract from existing context
      result = process_pdf_text(text)
      result
    `));

    return JSON.parse(jsonResult);
  } catch (error) {
    console.error("Error in Python processing:", error);
    return [];
  }
}

// Export the processing function
window.processPDFWithPython = processPDFWithPython;
