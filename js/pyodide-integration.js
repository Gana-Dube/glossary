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

          print(f"Processing text of length: {len(text)}")
          print(f"Sample text: {text[:500]}...")

          # Common patterns for acronyms in technical documents
          patterns = [
              # Pattern: Term (ACRONYM)
              r'([\w\s&.-]+?)\s*\(\s*([A-Z][A-Za-z0-9\-\.]{1,10})\s*\)',

              # Pattern: ACRONYM (Term)
              r'([A-Z][A-Za-z0-9\-\.]{1,10})\s*\(\s*([\w\s&.-]+?)\s*\)',

              # Pattern: ACRONYM - Term
              r'([A-Z][A-Za-z0-9\-\.]{1,10})\s*[\-–—:]\s*([\w\s&.-]+?)(?=\.|,|;|$)',
          ]

          results = []
          acronyms_seen = set()

          pattern_matches = {p: 0 for p in patterns}

          for pattern in patterns:
              matches = re.finditer(pattern, text)
              for match in matches:
                  pattern_matches[pattern] += 1
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
                          'description': '',
                          'keywords': ['PDF Import'],
                          'id': f"{acronym.lower()}-pdf",
                          'confidence': 'high' if acronym[0] in first_letter_check else 'medium'
                      })

          print(f"Pattern matches: {pattern_matches}")
          print(f"Found {len(results)} acronyms")
          if results:
              print(f"Sample result: {results[0]}")

          # Sort by confidence
          results.sort(key=lambda x: 0 if x.get('confidence') == 'high' else 1)

          return results

      # Return a JSON-friendly structure
      def process_pdf_text(text):
          extracted = extract_acronyms(text)
          return json.dumps(extracted)
    `);

    // console.log("Pyodide loaded successfully!"); // Removed log
    return pyodideInstance;
  } catch (error) {
    // console.error("Failed to load Pyodide:", error); // Removed log
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
    // console.log("Starting Python processing of text length:", text.length); // Removed log
    // console.log("Text sample:", text.substring(0, 200) + "..."); // Removed log

    // Check if text is valid
    if (!text || typeof text !== 'string' || text.length === 0) {
      // console.error("Invalid text input for Python processing"); // Removed log
      return [];
    }

    const pyodide = await initPyodide();
    if (!pyodide) {
      // If Pyodide failed to load, return empty result
      // console.error("Pyodide not available, skipping Python processing"); // Removed log
      return [];
    }

    // console.log("Pyodide initialized successfully"); // Removed log

    try {
      // Pass the text to the Python environment as a global variable
      // console.log("Setting PDF text in Pyodide globals"); // Removed log
      pyodide.globals.set('pdf_text', text);

      // Add a debug function to Python
      pyodide.runPython(`
def debug_info():
    import sys
    return {
        'python_version': sys.version,
        'modules': list(sys.modules.keys())
    }
      `);

      // Get debug info
      const debugInfo = pyodide.runPython('debug_info()');
      // console.log("Python debug info:", debugInfo); // Removed log - Already removed

      // Verify the text was set correctly
      const textLength = pyodide.runPython('len(pdf_text)');
      // console.log("Text length in Python:", textLength); // Removed log - Already removed

      // Run the Python code to process the text from the global variable
      // console.log("Running Python processing..."); // Removed log - Already removed

      // First check if our functions are defined
      const functionCheck = pyodide.runPython(`
'process_pdf_text' in globals() and 'extract_acronyms' in globals()
      `);

      if (!functionCheck) {
        // console.error("Python functions are not defined correctly"); // Removed log - Already removed, ensuring it stays removed
        // Try to redefine them
        await pyodide.runPythonAsync(`
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

    print(f"Processing text of length: {len(text)}")
    print(f"Sample text: {text[:500]}...")

    # Common patterns for acronyms in technical documents
    patterns = [
        # Pattern: Term (ACRONYM)
        r'([\w\s&.-]+?)\s*\(\s*([A-Z][A-Za-z0-9\-\.]{1,10})\s*\)',

        # Pattern: ACRONYM (Term)
        r'([A-Z][A-Za-z0-9\-\.]{1,10})\s*\(\s*([\w\s&.-]+?)\s*\)',

        # Pattern: ACRONYM - Term
        r'([A-Z][A-Za-z0-9\-\.]{1,10})\s*[\-–—:]\s*([\w\s&.-]+?)(?=\.|,|;|$)',
    ]

    results = []
    acronyms_seen = set()

    pattern_matches = {p: 0 for p in patterns}

    for pattern in patterns:
        matches = re.finditer(pattern, text)
        for match in matches:
            pattern_matches[pattern] += 1
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
                    'description': '',
                    'keywords': ['PDF Import'],
                    'id': f"{acronym.lower()}-pdf",
                    'confidence': 'high' if acronym[0] in first_letter_check else 'medium'
                })

    print(f"Pattern matches: {pattern_matches}")
    print(f"Found {len(results)} acronyms")
    if results:
        print(f"Sample result: {results[0]}")

    # Sort by confidence
    results.sort(key=lambda x: 0 if x.get('confidence') == 'high' else 1)

    return results

# Return a JSON-friendly structure
def process_pdf_text(text):
    try:
        extracted = extract_acronyms(text)
        return json.dumps(extracted)
    except Exception as e:
        print(f"Error in process_pdf_text: {e}")
        return json.dumps([])
        `);

        console.log("Python functions redefined");
      }

      // Run the processing with error handling
      const jsonResult = pyodide.runPython(`
output_json_string = "" # Initialize variable
try:
    # 'pdf_text' should be available in the global scope here
    result = process_pdf_text(pdf_text)
    print("Python processing completed successfully")
    output_json_string = result # Assign result to variable
except Exception as e:
    import traceback
    error_details = {
        'error': str(e),
        'traceback': traceback.format_exc()
    }
    print(f"Python error: {error_details}")
    output_json_string = json.dumps([])  # Assign fallback string

output_json_string # Explicitly return the variable as the last expression
      `);

      // Clean up the global variable (optional, but good practice)
      pyodide.globals.delete('pdf_text');

      // console.log("Raw JSON result:", jsonResult); // Removed log

      try {
        const parsedResults = JSON.parse(jsonResult);
        // console.log(`Python processing complete. Found ${parsedResults.length} acronyms.`); // Removed log

        if (!Array.isArray(parsedResults)) {
          // console.error("Python processing did not return an array:", parsedResults); // Removed log
          return [];
        }

        if (parsedResults.length > 0) {
          // console.log("Sample result:", JSON.stringify(parsedResults[0])); // Removed log
        } else {
          // console.log("No acronyms found by Python processing"); // Removed log
        }

        return parsedResults;
      } catch (jsonError) {
        // console.error("Error parsing JSON result:", jsonError); // Removed log
        // console.error("Raw result was:", jsonResult); // Removed log
        return [];
      }
    } catch (pyError) {
      // console.error("Error executing Python code:", pyError); // Removed log
      return [];
    }
  } catch (error) {
    // console.error("Error in Python processing:", error); // Removed log
    // console.error("Error details:", error.message, error.stack); // Removed log
    return [];
  }
}

// Export the processing function
window.processPDFWithPython = processPDFWithPython;
