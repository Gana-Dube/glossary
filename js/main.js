document.addEventListener("DOMContentLoaded", () => {
  let acronymsData = null;

  // Add after existing variables
  const voiceButton = document.getElementById("voiceButton");
  let isListening = false;

  // Function to calculate button positions based on which buttons exist
  function calculateButtonPositions(hasCodeButton, hasMermaidButton, hasResearchButton) {
    const positions = {
      copy: 10, // Copy button is always at position 10px from right
    };

    // Calculate positions based on which buttons exist
    let nextPosition = 52; // Start 42px from copy button

    if (hasCodeButton) {
      positions.code = nextPosition;
      nextPosition += 42;
    }

    if (hasMermaidButton) {
      positions.mermaid = nextPosition;
      nextPosition += 42;
    }

    if (hasResearchButton) {
      positions.research = nextPosition;
      nextPosition += 42;
    }

    positions.gemini = nextPosition; // Gemini button is always the last one

    return positions;
  }

  // Utility functions to avoid code duplication
  function createCodeButton(item, cardContent, aiResponseDiv) {
    // Check if the item has a "script" tag
    const hasScriptTag = item.keywords && (
      (typeof item.keywords === 'string' && item.keywords.includes('script')) ||
      (Array.isArray(item.keywords) && item.keywords.some(tag => tag === 'script'))
    );

    // Only create the code button if the item has a script tag
    if (!hasScriptTag) return null;

    const codeButton = document.createElement("button");
    codeButton.className = "button is-small is-light";
    codeButton.style.cssText = `
      position: absolute;
      top: 10px; /* Same top as copy button */
      right: 52px; /* Position to the left of gemini button */
      border-radius: 4px;
      padding: 5px;
      z-index: 10;
      height: 32px;
      width: 32px;
      transition: background-color 0.3s ease;
    `;
    codeButton.title = "Get Python code example";

    // Use the iconify icon as specified
    codeButton.innerHTML = '<iconify-icon icon="fluent-color:code-block-16" width="16" height="16"></iconify-icon>';

    // Add hover effects
    codeButton.addEventListener("mouseenter", () => {
      codeButton.classList.add("is-warning"); // Use a different color for code button
    });
    codeButton.addEventListener("mouseleave", () => {
      codeButton.classList.remove("is-warning");
    });

    // Add click event handler
    codeButton.addEventListener("click", async () => {
      const acronym = item.acronym;
      const definition = item.definition;
      const description = item.description || "";

      // Indicate loading state
      codeButton.classList.add("is-loading");
      codeButton.disabled = true;
      aiResponseDiv.textContent = "Generating code example...";
      aiResponseDiv.style.display = "block"; // Show loading message

      try {
        const response = await fetch("/api/give-me-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ acronym, definition, description }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
          throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.text) {
          // Format the code with syntax highlighting
          aiResponseDiv.innerHTML = `<strong>Python Code Example:</strong><pre><code class="language-python">${data.text}</code></pre>`;
          aiResponseDiv.style.display = "block";

          // Apply syntax highlighting
          document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
          });
        } else {
          throw new Error("No code received from AI.");
        }

      } catch (error) {
        console.error("Error fetching code example:", error);
        aiResponseDiv.textContent = `Error: ${error.message}`;
        aiResponseDiv.style.display = "block";
      } finally {
        // Restore button state
        codeButton.classList.remove("is-loading");
        codeButton.disabled = false;
      }
    });

    cardContent.appendChild(codeButton);
    return codeButton;
  }

  function createMermaidButton(item, cardContent, aiResponseDiv, rightPosition) {
    const mermaidButton = document.createElement("button");
    mermaidButton.className = "button is-small is-light";
    mermaidButton.style.cssText = `
      position: absolute;
      top: 10px;
      right: ${rightPosition}px;
      border-radius: 4px;
      padding: 5px;
      z-index: 10;
      height: 32px;
      width: 32px;
      transition: background-color 0.3s ease;
    `;
    mermaidButton.title = "Generate diagram";

    const mermaidIcon = document.createElement("img");
    mermaidIcon.src = "assets/static/icons/mermaid-icon.svg";
    mermaidIcon.alt = "Mermaid Icon";
    mermaidIcon.style.width = "16px";
    mermaidIcon.style.height = "16px";
    mermaidIcon.style.verticalAlign = "middle";

    mermaidButton.appendChild(mermaidIcon);

    // Add hover effects
    mermaidButton.addEventListener("mouseenter", () => {
      mermaidButton.classList.add("is-danger"); // Use a different color for mermaid button
    });
    mermaidButton.addEventListener("mouseleave", () => {
      mermaidButton.classList.remove("is-danger");
    });

    mermaidButton.addEventListener("click", async () => {
      const acronym = item.acronym;
      const definition = item.definition;
      const description = item.description || "";

      // Construct a prompt for the diagram with improved guidelines
      const diagramPrompt = `Create a Mermaid diagram that illustrates the concept of ${acronym} (${definition})${description ? `. Additional context: ${description}` : ''}.
Choose an appropriate diagram type (flowchart, sequence, class, etc.) that best represents this concept.

IMPORTANT SYNTAX RULES:
1. Do not use commas in node labels or text - use spaces or underscores instead
2. For notes, use "note over A and B" instead of "note over A,B"
3. Keep the diagram simple and focused on the core concept
4. Ensure all syntax is valid Mermaid.js code

SEQUENCE DIAGRAM RULES:
- Start with "sequenceDiagram" on its own line
- Define participants like: "participant User as \"User/Developer\""
- Each message must be on its own line: "User->>Service: Request data"
- Notes must use format: "note over User Service: This is a note"
- Activation syntax: "activate Service" and "deactivate Service" on separate lines
- DO NOT use square brackets [] around any part of the sequence diagram
- DO NOT mix flowchart and sequence diagram syntax

FLOWCHART RULES:
- Start with "flowchart TD" or "flowchart LR" on its own line
- DO NOT use square brackets around the direction indicator (write "flowchart LR" not "flowchart [LR]")
- Define nodes like: "A[\"Text here\"]" or "B(\"Text here\")"
- Connections must use proper arrows: "A --> B"
- Each connection should be on its own line
- DO NOT use semicolons at the end of lines
- Use proper subgraph syntax if needed
- Note syntax should be: "note over A,B: Text here" or "note right of C: Text here"
- DO NOT use quotes or square brackets in note syntax

CLASS DIAGRAM RULES:
- Start with "classDiagram" on its own line
- Define classes like: "class User { +name: string }"
- Relationships must use proper syntax: "User <|-- Admin"`;

      // Indicate loading state
      mermaidButton.classList.add("is-loading");
      mermaidButton.disabled = true;
      aiResponseDiv.textContent = "Generating diagram...";
      aiResponseDiv.style.display = "block";

      try {
        const response = await fetch("/api/show-me-diagram", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ diagramPrompt }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
          throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.mermaidCode) {
          // Clean up the mermaid code (remove markdown backticks if present)
          let cleanMermaidCode = data.mermaidCode.replace(/^```mermaid\n?|\n?```$/g, '');
          
          // Sanitize the mermaid code to handle common syntax errors
          cleanMermaidCode = sanitizeMermaidCode(cleanMermaidCode);

          // Display the mermaid code
          aiResponseDiv.innerHTML = `<strong>Diagram:</strong><div class="mermaid">${cleanMermaidCode}</div>`;
          aiResponseDiv.style.display = "block";

          // Initialize mermaid rendering with error handling
          if (window.mermaid) {
            try {
              window.mermaid.initialize({
                startOnLoad: true,
                securityLevel: 'loose',
                flowchart: { useMaxWidth: true }
              });

              // Use mermaid.render with a promise to catch errors
              const mermaidContainer = document.querySelectorAll('.mermaid')[0];
              const containerId = 'mermaid-diagram-' + Date.now();
              mermaidContainer.id = containerId;

              window.mermaid.render(containerId)
                .then(result => {
                  // Successful rendering
                  mermaidContainer.innerHTML = result.svg;
                })
                .catch(mermaidError => {
                  console.error("Mermaid rendering error:", mermaidError);
                  // Create a more detailed error display with accordion
                  aiResponseDiv.innerHTML = `
                    <div class="notification is-warning">
                      <strong>Diagram Error:</strong> Could not render diagram due to syntax error.
                    </div>
                    <div class="box">
                      <details class="failed-code-accordion">
                        <summary class="has-text-danger">Show failed diagram code</summary>
                        <div class="content mt-2">
                          <p class="has-text-grey-dark">Error message: ${mermaidError.str || mermaidError.message || 'Unknown error'}</p>
                          <pre class="has-background-grey-lighter p-2">${cleanMermaidCode}</pre>
                        </div>
                      </details>
                    </div>`;
                });
            } catch (mermaidError) {
              console.error("Mermaid initialization error:", mermaidError);
              aiResponseDiv.innerHTML = `
                <div class="notification is-warning">
                  <strong>Diagram Error:</strong> Could not initialize Mermaid renderer.
                </div>
                <div class="box">
                  <details class="failed-code-accordion">
                    <summary class="has-text-danger">Show failed diagram code</summary>
                    <div class="content mt-2">
                      <p class="has-text-grey-dark">Error message: ${mermaidError.message || 'Unknown error'}</p>
                      <pre class="has-background-grey-lighter p-2">${cleanMermaidCode}</pre>
                    </div>
                  </details>
                </div>`;
            }
          } else {
            // If mermaid.js is not loaded yet, load it dynamically
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
            script.onload = () => {
              try {
                window.mermaid.initialize({ 
                  startOnLoad: true,
                  securityLevel: 'loose',
                  flowchart: { useMaxWidth: true }
                });

                // Use mermaid.render with a promise to catch errors
                const mermaidContainer = document.querySelectorAll('.mermaid')[0];
                const containerId = 'mermaid-diagram-' + Date.now();
                mermaidContainer.id = containerId;

                window.mermaid.render(containerId)
                  .then(result => {
                    // Successful rendering
                    mermaidContainer.innerHTML = result.svg;
                  })
                  .catch(mermaidError => {
                    console.error("Mermaid rendering error:", mermaidError);
                    // Create a more detailed error display with accordion
                    aiResponseDiv.innerHTML = `
                      <div class="notification is-warning">
                        <strong>Diagram Error:</strong> Could not render diagram due to syntax error.
                      </div>
                      <div class="box">
                        <details class="failed-code-accordion">
                          <summary class="has-text-danger">Show failed diagram code</summary>
                          <div class="content mt-2">
                            <p class="has-text-grey-dark">Error message: ${mermaidError.str || mermaidError.message || 'Unknown error'}</p>
                            <pre class="has-background-grey-lighter p-2">${cleanMermaidCode}</pre>
                          </div>
                        </details>
                      </div>`;
                  });
              } catch (mermaidError) {
                console.error("Mermaid initialization error:", mermaidError);
                aiResponseDiv.innerHTML = `
                  <div class="notification is-warning">
                    <strong>Diagram Error:</strong> Could not initialize Mermaid renderer.
                  </div>
                  <div class="box">
                    <details class="failed-code-accordion">
                      <summary class="has-text-danger">Show failed diagram code</summary>
                      <div class="content mt-2">
                        <p class="has-text-grey-dark">Error message: ${mermaidError.message || 'Unknown error'}</p>
                        <pre class="has-background-grey-lighter p-2">${cleanMermaidCode}</pre>
                      </div>
                    </details>
                  </div>`;
              }
            };
            document.head.appendChild(script);
          }
        } else {
          throw new Error("No diagram code received.");
        }

      } catch (error) {
        console.error("Error generating diagram:", error);
        aiResponseDiv.textContent = `Error: ${error.message}`;
        aiResponseDiv.style.display = "block";
      } finally {
        mermaidButton.classList.remove("is-loading");
        mermaidButton.disabled = false;
      }
    });

    cardContent.appendChild(mermaidButton);
    return mermaidButton;
  }

  // Helper function to sanitize Mermaid code
  function sanitizeMermaidCode(code) {
    // Replace commas in text with spaces or other characters when they're not part of valid syntax
    // This is a simplified approach - a more comprehensive solution would need to parse the diagram type

    // For state diagrams, fix the "note over X,Y" syntax which often causes problems
    code = code.replace(/note\s+over\s+([^:,]+),([^:]+):/g, 'note over $1 and $2:');

    // For flowcharts, ensure node IDs don't contain commas
    code = code.replace(/(\w+),(\w+)(\[.+?\])/g, '$1_$2$3');

    // For sequence diagrams, fix participant names with commas
    code = code.replace(/participant\s+"([^"]*),([^"]*)"/g, 'participant "$1_$2"');

    // Fix issues with text after node labels without proper formatting
    // This handles cases where text appears after node identifiers without proper syntax
    code = code.replace(/(\w+)(\s{2,})([A-Za-z])/g, '$1["$3');

    // Clean up any lines that have text without proper node formatting
    const lines = code.split('\n');
    const cleanedLines = lines.map(line => {
      // If a line has a node identifier followed by text without proper syntax, fix it
      if (line.match(/^\s*[A-Za-z0-9_-]+\s+[A-Za-z].+$/)) {
        // Extract the node ID and the text
        const match = line.match(/^\s*([A-Za-z0-9_-]+)\s+(.+)$/);
        if (match) {
          const [_, nodeId, text] = match;
          // Format it properly as a node with a label
          return `    ${nodeId}["${text}"]`;
        }
      }
      return line;
    });

    return cleanedLines.join('\n');
  }

  function createGeminiButton(item, cardContent, aiResponseDiv, hasCodeButton) {
    const geminiButton = document.createElement("button");
    // Position it next to the copy button or adjust as needed
    geminiButton.className = "button is-small is-light"; // Use 'is-light' like copy button
    geminiButton.style.cssText = `
      position: absolute;
      top: 10px; /* Same top as copy button */
      right: ${hasCodeButton ? '94' : '52'}px; /* Adjust position based on whether code button exists */
      border-radius: 4px;
      padding: 5px;
      z-index: 10; /* Same z-index */
      height: 32px; /* Same height */
      width: 32px; /* Same width */
      transition: background-color 0.3s ease;
    `;
    geminiButton.title = "Tell me more (AI)";

    const geminiIcon = document.createElement("img");
    geminiIcon.src = "assets/static/icons/google-gemini-icon.svg";
    geminiIcon.alt = "Gemini Icon";
    geminiIcon.style.width = "16px";
    geminiIcon.style.height = "16px";
    geminiIcon.style.verticalAlign = "middle"; // Helps center the icon in the button

    geminiButton.appendChild(geminiIcon);

    // Add hover effects similar to copy button
    geminiButton.addEventListener("mouseenter", () => {
      geminiButton.classList.add("is-info"); // Use a different color like 'is-info'
    });
    geminiButton.addEventListener("mouseleave", () => {
      geminiButton.classList.remove("is-info");
    });

    geminiButton.addEventListener("click", async () => {
      const acronym = item.acronym;
      const definition = item.definition;
      const description = item.description || ""; // Handle potentially missing description

      // Indicate loading state
      geminiButton.classList.add("is-loading");
      geminiButton.disabled = true;
      aiResponseDiv.textContent = "Fetching details...";
      aiResponseDiv.style.display = "block"; // Show loading message

      try {
        const response = await fetch("/api/tell-me-more", { // Relative path to Vercel function
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ acronym, definition, description }), // Send context data
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' })); // Try to parse error
          throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.text) {
          // Use innerHTML to allow basic formatting if needed later, sanitize if necessary
          aiResponseDiv.innerHTML = `<strong>AI Explanation:</strong> ${data.text}`;
          aiResponseDiv.style.display = "block"; // Ensure it's visible
        } else {
          throw new Error("No text received from AI.");
        }

      } catch (error) {
        console.error("Error fetching AI details:", error);
        aiResponseDiv.textContent = `Error: ${error.message}`;
        aiResponseDiv.style.display = "block";
        // Optionally hide the error after a few seconds
        // setTimeout(() => { aiResponseDiv.style.display = 'none'; }, 5000);
      } finally {
        // Restore button state
        geminiButton.classList.remove("is-loading");
        geminiButton.disabled = false;
      }
    });

    cardContent.appendChild(geminiButton);
    return geminiButton;
  }

  function createAIResponseDiv(cardContent) {
    let aiResponseDiv = cardContent.querySelector(".ai-response");
    if (!aiResponseDiv) {
      aiResponseDiv = document.createElement("div");
      aiResponseDiv.className = "ai-response content is-size-7 mt-3"; // Added 'content' for Bulma styling
      aiResponseDiv.style.display = "none"; // Initially hidden
      // Insert it before tags if they exist, otherwise append
      const tagsContainer = cardContent.querySelector(".tags");
      if (tagsContainer) {
        cardContent.insertBefore(aiResponseDiv, tagsContainer);
      } else {
        cardContent.appendChild(aiResponseDiv);
      }
    }
    return aiResponseDiv;
  }

  // Add voice recognition setup
  if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition =
      window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      isListening = true;
      voiceButton.classList.add("is-active");
      voiceButton.querySelector("i").classList.remove("fa-microphone");
      voiceButton.querySelector("i").classList.add("fa-spinner", "fa-pulse");
    };

    recognition.onend = () => {
      isListening = false;
      voiceButton.classList.remove("is-active");
      voiceButton.querySelector("i").classList.remove("fa-spinner", "fa-pulse");
      voiceButton.querySelector("i").classList.add("fa-microphone");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      document.getElementById("search").value = transcript;
      searchAcronyms(); // Trigger search automatically
    };

    recognition.onerror = (event) => {
      showError("Voice recognition error: " + event.error);
      recognition.stop();
    };

    voiceButton.addEventListener("click", () => {
      if (!isListening) {
        recognition.start();
      } else {
        recognition.stop();
      }
    });
  } else {
    voiceButton.style.display = "none";
    showError("Voice recognition not supported in this browser");
  }

  // Fetch JSON data
  fetch("assets/data.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
    acronymsData = data; // Data is now directly an array of acronyms
    showRandomAcronyms(); // Initialize random acronyms

    // ---> START: Update total acronym count badge <---
    const totalBadgeContainer = document.getElementById("totalAcronymCountBadge");
    const totalCountElement = document.getElementById("totalAcronymCount");
    if (totalBadgeContainer && totalCountElement && Array.isArray(acronymsData)) {
        totalCountElement.textContent = acronymsData.length; // Get total count
        totalBadgeContainer.style.display = "inline-flex"; // Show the badge (inline-flex works well for tags)
    } else {
        // console.warn("Could not find total count badge elements or data is not an array."); // Removed log
    }
    // ---> END: Update total acronym count badge <---
    })
    .catch((error) => {
      // console.error("Error loading acronyms data:", error); // Removed log
      showError("Failed to load acronyms data. Please try again later.");
    });

  function showError(message) {
    const errorDiv = document.getElementById("errorMessage");
    errorDiv.textContent = message;
    errorDiv.classList.remove("is-hidden");

    // Hide the error message after 3 seconds
    setTimeout(() => {
      errorDiv.classList.add("is-hidden");
      errorDiv.textContent = "";
    }, 3000);
  }

  function getRandomAcronyms(count = 5) {
    if (!acronymsData || !acronymsData.length) return [];
    const shuffled = [...acronymsData].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  function showRandomAcronyms() {
    const container = document.getElementById("suggestedAcronyms");
    container.innerHTML = "";

    const randomAcronyms = getRandomAcronyms();
    randomAcronyms.forEach((item) => {
      const tag = document.createElement("a");
      tag.className = "tag is-primary is-light is-medium is-clickable";
      tag.textContent = item.acronym;
      tag.addEventListener("click", () => {
        document.getElementById("search").value = item.acronym;
        searchAcronyms();
      });
      container.appendChild(tag);
    });
  }

  function searchAcronyms() {
    const searchTerm = document.getElementById("search").value.trim();
    const resultsDiv = document.getElementById("results");
    const errorDiv = document.getElementById("errorMessage");

    resultsDiv.innerHTML = ""; // Clear previous results
    resultsDiv.className = "columns is-multiline is-centered";
    errorDiv.classList.add("is-hidden"); // Hide previous errors

    // Hide the badge initially
    const badgeContainer = document.getElementById("badgeContainer");
    badgeContainer.style.display = "none";

    if (!searchTerm) {
      showError("Please enter a search term");
      return;
    }

    if (!acronymsData) {
      showError("Data is still loading. Please try again in a moment.");
      return;
    }

    // Create a regex for exact match, case-insensitive
    const regex = new RegExp(`^${escapeRegex(searchTerm)}`, "i");

    // Filter only by acronym for exact match
    const matches = acronymsData.filter((item) =>
      regex.test(item.acronym)
    );

    if (matches.length === 0) {
      showError(`No results found for "${searchTerm}"`);
      return;
    } else {
      // Update the badge if there are results
      const resultBadge = document.getElementById("resultBadge");
      resultBadge.textContent = matches.length;
      // Show the badge container
      badgeContainer.style.display = "block";

    }

    matches.forEach((item) => {
      // Create Bulma card
      const cardColumn = document.createElement("div");
      cardColumn.className = "column is-two-fifths";

      const card = document.createElement("div");
      card.className = "card";

      const cardContent = document.createElement("div");
      cardContent.className = "card-content";

      const media = document.createElement("div");
      media.className = "media";

      const mediaContent = document.createElement("div");
      mediaContent.className = "media-content";

      const title = document.createElement("button"); // Changed to button
      title.className = "button is-link is-inverted is-large"; // Added button classes
      title.textContent = item.acronym;
      title.style.padding = "0.25rem"; // Added padding
      title.style.border = "none"; // Remove border
      title.style.textAlign = "left"; // Align text to the left
      title.addEventListener("click", () => {
        window.open(
          `https://www.google.com/search?q=${encodeURIComponent(item.acronym)}`,
          "_blank"
        );
      });

      const subtitle = document.createElement("p");
      subtitle.className = "subtitle is-6";
      subtitle.innerHTML = `<strong>Definition:</strong> ${item.definition}`;

      mediaContent.appendChild(title);
      mediaContent.appendChild(subtitle);
      media.appendChild(mediaContent);
      cardContent.appendChild(media);

      if (item.description) {
        const description = document.createElement("div");
        description.className = "content";
        description.innerHTML = `<strong>Description:</strong> ${convertMarkdownLinks(item.description)}`;
        cardContent.appendChild(description);
      }

      // Add tags section
      if (item.keywords && item.keywords.length > 0) {
        const tagsContainer = document.createElement("div");
        tagsContainer.className = "tags";
        tagsContainer.style.cssText = "margin: 0.5rem 0 0 0;";

        // Split keywords if it's a string, or use array directly
        const tagsList =
          typeof item.keywords === "string"
            ? item.keywords.split(",").map((t) => t.trim())
            : item.keywords;

        tagsList
          .filter((tag) => tag && tag.length > 0)
          .forEach((tag) => {
            const tagElement = document.createElement("span");
            tagElement.className = "tag is-info is-light";
            tagElement.textContent = tag;
            tagsContainer.appendChild(tagElement);
          });

        cardContent.appendChild(tagsContainer);
      }

      card.appendChild(cardContent);

      const copyButton = document.createElement("button");
      copyButton.className = "button is-small is-light";
      copyButton.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                border-radius: 4px;
                padding: 5px;
                z-index: 10;
                height: 32px;
                width: 32px;
                transition: background-color 0.3s ease;
            `;
      copyButton.innerHTML =
        '<span class="icon is-small"><i class="fas fa-clipboard"></i></span>';

      // Add hover effects
      copyButton.addEventListener("mouseenter", () => {
        copyButton.classList.add("is-primary");
      });
      copyButton.addEventListener("mouseleave", () => {
        copyButton.classList.remove("is-primary");
      });

      // Copy functionality (keep existing)
      copyButton.addEventListener("click", () => {
        let copyText = `${item.acronym}: ${item.definition}`;
        if (item.description) {
          copyText += `\nDescription: ${item.description}`;
        }

        navigator.clipboard
          .writeText(copyText)
          .then(() => {
            copyButton.classList.add("is-success");
            copyFeedback.style.opacity = "1";
            setTimeout(() => {
              copyButton.classList.remove("is-success");
              copyFeedback.style.opacity = "0";
            }, 4000);
          })
          .catch((err) => {
            // console.error("Copy error:", err); // Removed log
            showError("Failed to copy text");
          });
      });

      // After creating copyButton, add this code
      const copyFeedback = document.createElement("span");
      copyFeedback.className = "is-size-7 has-text-danger";
      copyFeedback.style.cssText = `
                position: absolute;
                top: 45px;
                right: 4px;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
      copyFeedback.textContent = "Copied!";

      // Add feedback span after button
      cardContent.appendChild(copyFeedback);

      // Add position relative to card for absolute positioning
      cardContent.style.position = "relative";
      cardContent.appendChild(copyButton);

      // --- AI Integration ---
      // Create AI response div first
      const aiResponseDiv = createAIResponseDiv(cardContent);

      // Create code button if applicable
      const hasCodeButton = createCodeButton(item, cardContent, aiResponseDiv) !== null;

      // Determine if we should show mermaid button (can be based on keywords or always show)
      const hasMermaidButton = true; // Always show for now, could be conditional
      
      // Determine if we should show research button (always show for now)
      const hasResearchButton = true;

      // Calculate positions for all buttons
      const positions = calculateButtonPositions(hasCodeButton, hasMermaidButton, hasResearchButton);

      // Create Research button
      createResearchButton(item, cardContent, aiResponseDiv, positions.research);

      // Create Gemini button with updated position
      const geminiButton = document.createElement("button");
      geminiButton.className = "button is-small is-light";
      geminiButton.style.cssText = `
        position: absolute;
        top: 10px;
        right: ${positions.gemini}px;
        border-radius: 4px;
        padding: 5px;
        z-index: 10;
        height: 32px;
        width: 32px;
        transition: background-color 0.3s ease;
      `;
      geminiButton.title = "Tell me more (AI)";

      const geminiIcon = document.createElement("img");
      geminiIcon.src = "assets/static/icons/google-gemini-icon.svg";
      geminiIcon.alt = "Gemini Icon";
      geminiIcon.style.width = "16px";
      geminiIcon.style.height = "16px";
      geminiIcon.style.verticalAlign = "middle";

      geminiButton.appendChild(geminiIcon);

      // Add hover effects similar to copy button
      geminiButton.addEventListener("mouseenter", () => {
        geminiButton.classList.add("is-info");
      });
      geminiButton.addEventListener("mouseleave", () => {
        geminiButton.classList.remove("is-info");
      });

      geminiButton.addEventListener("click", async () => {
        const acronym = item.acronym;
        const definition = item.definition;
        const description = item.description || "";

        // Indicate loading state
        geminiButton.classList.add("is-loading");
        geminiButton.disabled = true;
        aiResponseDiv.textContent = "Fetching details...";
        aiResponseDiv.style.display = "block";

        try {
          const response = await fetch("/api/tell-me-more", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ acronym, definition, description }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          if (data.text) {
            aiResponseDiv.innerHTML = `<strong>AI Explanation:</strong> ${data.text}`;
            aiResponseDiv.style.display = "block";
          } else {
            throw new Error("No text received from AI.");
          }
        } catch (error) {
          console.error("Error fetching AI details:", error);
          aiResponseDiv.textContent = `Error: ${error.message}`;
          aiResponseDiv.style.display = "block";
        } finally {
          geminiButton.classList.remove("is-loading");
          geminiButton.disabled = false;
        }
      });

      cardContent.appendChild(geminiButton);

      // Create Mermaid button if applicable
      if (hasMermaidButton) {
        createMermaidButton(item, cardContent, aiResponseDiv, positions.mermaid);
      }

      // Update code button position if it exists
      if (hasCodeButton) {
        const codeButton = cardContent.querySelector('[title="Get Python code example"]');
        if (codeButton) {
          codeButton.style.right = `${positions.code}px`;
        }
      }
      // --- End AI Integration ---

      cardColumn.appendChild(card);
      resultsDiv.appendChild(cardColumn);
    }); // End of matches.forEach or acronyms.forEach
  } // End of searchAcronyms or showUploadedAcronyms function

  // Escape special regex characters in searchTerm
  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Add event listener to the search form
  const searchForm = document.getElementById("searchForm");
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent form from submitting
    searchAcronyms();
  });

  // Add event listener for the clear button
  const clearButton = document.getElementById("clearButton");
  clearButton.addEventListener("click", () => {
    const searchInput = document.getElementById("search");
    searchInput.value = ""; // Clear the search field
    searchInput.focus(); // Focus back on the search field

    // Clear the results area
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "";

    // Hide the badge if there are no results
    const badgeContainer = document.getElementById("badgeContainer");
    badgeContainer.style.display = "none";
  });

  // Add after existing code

  const ACRONYM_PATTERNS = [
    // Pattern: definition (ACRONYM) - most common format
    /([\w\s\-\&\.]+?)\s*\(\s*([A-Z][A-Za-z0-9\-.]{1,10})\s*\)/g,

    // Pattern: ACRONYM (definition) - alternative format
    /([A-Z][A-Za-z0-9\-.]{1,10})\s*\(\s*([\w\s\-\&\.]+?)\s*\)/g,

    // Pattern: ACRONYM - definition
    /([A-Z][A-Za-z0-9\-.]{1,10})\s*[\-–—:]\s*([\w\s\-\&\.]+?)(?=\.|,|;|$)/g
  ];

  async function parsePDF(file, pdfDoc = null) {
    const progressBar = document.getElementById("pdfProgress");
    progressBar.classList.remove("is-hidden");

    try {
      // Use the provided PDF document if available, otherwise load it
      const pdf = pdfDoc || await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      let extractedText = "";

      // Process all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // Filter out headers, footers, and page numbers
        const contentItems = textContent.items.filter((item) => {
          const fontSize = item.transform[0]; // Approximate font size
          return fontSize < 20; // Skip large text (likely headers)
        });

        const pageText = contentItems.map((item) => item.str).join(" ");
        extractedText += pageText + "\n";

        // Update progress
        progressBar.value = (i / pdf.numPages) * 100;
      }

      // console.log("Extracted text length:", extractedText.length); // Removed log
      // console.log("Sample text:", extractedText.substring(0, 500) + "..."); // Removed log

      // Try to use Python processing first
      if (window.processPDFWithPython) {
        try {
          showError("Processing with Python - this may take a moment...");
          // console.log("Calling window.processPDFWithPython with text length:", extractedText.length); // Removed log

          const pythonResults = await window.processPDFWithPython(extractedText);
          progressBar.classList.add("is-hidden");

          // console.log("Python extraction results received:", pythonResults); // Removed log
          // console.log("Python results type:", typeof pythonResults); // Removed log
          // console.log("Python results is array?", Array.isArray(pythonResults)); // Removed log

          if (pythonResults) {
            if (Array.isArray(pythonResults)) {
              // console.log("Python results length:", pythonResults.length); // Removed log

              if (pythonResults.length > 0) {
                // Validate each result has required properties
                const validResults = pythonResults.filter(item =>
                  item &&
                  typeof item === 'object' &&
                  item.acronym &&
                  item.definition
                );

                console.log(`Found ${validResults.length} valid acronyms out of ${pythonResults.length}`);
                console.log("Sample valid result:", validResults.length > 0 ? JSON.stringify(validResults[0]) : "none");

                if (validResults.length > 0) {
                  // Ensure each item has all required properties
                  const formattedResults = validResults.map(item => ({
                    acronym: item.acronym,
                    definition: item.definition,
                    description: item.description || "",
                    keywords: item.keywords || ["PDF Import"],
                    id: item.id || `${item.acronym.toLowerCase()}-pdf`
                  }));

                  console.log("Returning formatted Python results:", formattedResults.length);
                  return formattedResults;
                }
              }
            } else {
              console.error("Python results is not an array:", pythonResults);
            }
          } else {
            console.error("Python results is null or undefined");
          }

          // If Python processing returned no results, fall back to JavaScript
          showError("Python processing found no acronyms, using JavaScript fallback");
        } catch (error) {
          console.error("Python processing failed:", error);
          console.error("Error details:", error.message);
          showError("Python processing failed, using JavaScript fallback");
        }
      } else {
        console.log("Python processing function is not available, using JavaScript fallback");
      }

      // Fallback to JavaScript processing if Python is not available or failed
      // console.log("Starting JavaScript fallback processing..."); // Removed log
      const acronyms = new Map();

      ACRONYM_PATTERNS.forEach((pattern) => {
        let match;
        let matchCount = 0;

        // console.log("Using pattern:", pattern); // Removed log

        // Reset the lastIndex property to ensure we start from the beginning
        pattern.lastIndex = 0;

        while ((match = pattern.exec(extractedText)) !== null) {
          matchCount++;

          // Get the two groups from the match
          const firstGroup = match[1].trim();
          const secondGroup = match[2].trim();

          let acronymText, definitionText;

          // Determine which is the acronym and which is the definition
          // Acronyms are typically uppercase and shorter than definitions
          if (firstGroup.length < secondGroup.length &&
              /^[A-Z][A-Za-z0-9\-.]{1,10}$/.test(firstGroup)) {
            // First group is likely the acronym
            acronymText = firstGroup;
            definitionText = secondGroup;
            console.log(`Match ${matchCount} (pattern ${pattern.source}): "${acronymText}" = "${definitionText}" (acronym first)`);
          } else {
            // Second group is likely the acronym
            acronymText = secondGroup;
            definitionText = firstGroup;
            console.log(`Match ${matchCount} (pattern ${pattern.source}): "${acronymText}" = "${definitionText}" (definition first)`);
          }

          // Only proceed if acronym length is at least 2 and contains at least one uppercase letter
          if (acronymText.length >= 2 && /[A-Z]/.test(acronymText)) {
            // Fix: Check if the definition exists and starts with the same letter as the acronym.
            // If not, try to find the first word that matches.
            if (definitionText.length > 0 &&
                definitionText[0].toLowerCase() !== acronymText[0].toLowerCase()) {
              const words = definitionText.split(/\s+/);
              const fixedIndex = words.findIndex(word =>
                word && word.length > 0 && word[0] && word[0].toLowerCase() === acronymText[0].toLowerCase()
              );
              if (fixedIndex !== -1) {
                definitionText = words.slice(fixedIndex).join(" ");
                // console.log(`Fixed definition: "${definitionText}"`); // Removed log
              }
            }

            const acronymItem = {
              acronym: acronymText,
              definition: definitionText,
              description: "",
              keywords: ["PDF Import"],
              id: `${acronymText.toLowerCase()}-pdf`
            };

            acronyms.set(acronymText, acronymItem);
            // console.log(`Added acronym: ${JSON.stringify(acronymItem)}`); // Removed log
          }
        }
        // console.log(`Pattern ${pattern} found ${matchCount} matches`); // Removed log
      });

      const results = Array.from(acronyms.values());
      // console.log(`JavaScript extraction found ${results.length} acronyms`); // Removed log

      if (results.length > 0) {
        // console.log("Sample results:", JSON.stringify(results.slice(0, 3))); // Removed log
      } else {
        // console.log("No acronyms found with JavaScript extraction"); // Removed log
      }

      progressBar.classList.add("is-hidden");
      return results;
    } catch (error) {
      // console.error("PDF parsing error:", error); // Removed log
      progressBar.classList.add("is-hidden");
      throw error;
    }
  }

  // Add drag and drop support
  function setupDragAndDrop() {
    const dropZone = document.getElementById("pdfInput").closest(".file");

    ["dragenter", "dragover"].forEach((eventName) => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add("is-dragover");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("is-dragover");
      });
    });

    dropZone.addEventListener("drop", async (e) => {
      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/pdf") {
        await handlePDFFile(file);
      } else {
        showError("Please upload a PDF file");
      }
    });
  }

  function showUploadedAcronyms(acronyms) {
    const resultsDiv = document.getElementById("results");
    // Option: clear previous results or append
    resultsDiv.innerHTML = "";
    // Ensure the container uses the Bulma classes for centered layout:
    resultsDiv.className = "columns is-multiline is-centered";

    // console.log("showUploadedAcronyms received:", acronyms); // Removed log
    // console.log("Type of acronyms:", typeof acronyms); // Removed log
    // console.log("Is array?", Array.isArray(acronyms)); // Removed log

    if (!acronyms) {
      showError("No acronyms data received");
      return;
    }

    if (!Array.isArray(acronyms)) {
      showError("Invalid acronyms data format");
      console.error("Expected array but got:", typeof acronyms);
      return;
    }

    if (acronyms.length === 0) {
      showError("No acronyms found in the document");
      return;
    }

    // Update the badge with the count of valid acronyms
    const badgeContainer = document.getElementById("badgeContainer");
    const resultBadge = document.getElementById("resultBadge");
    resultBadge.textContent = acronyms.length;
    badgeContainer.style.display = "block";

    // Log the first item to see its structure
    if (acronyms.length > 0) {
      console.log("First acronym item structure:", JSON.stringify(acronyms[0]));
    }

    console.log(`Starting loop to create ${acronyms.length} cards...`);
    let cardsCreated = 0;

    acronyms.forEach((item, index) => {
      // console.log(`Processing item ${index + 1}/${acronyms.length}:`, item.acronym); // Removed log
      try {
        // Validate item has required properties
        if (!item || !item.acronym || !item.definition) {
          console.warn(`Skipping invalid item at index ${index}:`, item);
          return; // Skip this item
        }

        // console.log(`  - Creating card for ${item.acronym}`); // Removed log
        // Create Bulma card
        const cardColumn = document.createElement("div");
      cardColumn.className = "column is-two-fifths";

      const card = document.createElement("div");
      card.className = "card";

      const cardContent = document.createElement("div");
      cardContent.className = "card-content";

      const media = document.createElement("div");
      media.className = "media";

      const mediaContent = document.createElement("div");
      mediaContent.className = "media-content";

      // Create button title for the acronym
      const title = document.createElement("button");
      title.className = "button is-link is-inverted is-large";
      title.textContent = item.acronym;
      title.style.padding = "0.25rem";
      title.style.border = "none";
      title.style.textAlign = "left";
      title.addEventListener("click", () => {
        window.open(
          `https://www.google.com/search?q=${encodeURIComponent(
            item.acronym
          )}`,
          "_blank"
        );
      });

      const subtitle = document.createElement("p");
      subtitle.className = "subtitle is-6";
      subtitle.innerHTML = `<strong>Definition:</strong> ${item.definition}`;

      mediaContent.appendChild(title);
      mediaContent.appendChild(subtitle);
      media.appendChild(mediaContent);
      cardContent.appendChild(media);

      // Optionally display description if available
      if (item.description) {
        const description = document.createElement("div");
        description.className = "content";
        description.innerHTML = `<strong>Description:</strong> ${item.description}`;
        cardContent.appendChild(description);
      }

      // Optional: add tags if provided
      if (item.keywords && item.keywords.length > 0) {
        const tagsContainer = document.createElement("div");
        tagsContainer.className = "tags";
        tagsContainer.style.cssText = "margin: 0.5rem 0 0 0;";
        const tagsList =
          typeof item.keywords === "string"
            ? item.keywords.split(",").map((t) => t.trim())
            : item.keywords;

        tagsList
          .filter((tag) => tag && tag.length > 0)
          .forEach((tag) => {
            const tagElement = document.createElement("span");
            tagElement.className = "tag is-info is-light";
            tagElement.textContent = tag;
            tagsContainer.appendChild(tagElement);
          });

        cardContent.appendChild(tagsContainer);
      }

      // Copy button
      const copyButton = document.createElement("button");
      copyButton.className = "button is-small is-light";
      copyButton.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        border-radius: 4px;
        padding: 5px;
        z-index: 10;
        height: 32px;
        width: 32px;
        transition: background-color 0.3s ease;
      `;
      copyButton.innerHTML =
        '<span class="icon is-small"><i class="fas fa-clipboard"></i></span>';

      copyButton.addEventListener("mouseenter", () => {
        copyButton.classList.add("is-primary");
      });
      copyButton.addEventListener("mouseleave", () => {
        copyButton.classList.remove("is-primary");
      });

      copyButton.addEventListener("click", () => {
        let copyText = `${item.acronym}: ${item.definition}`;
        if (item.description) {
          copyText += `\nDescription: ${item.description}`;
        }

        navigator.clipboard
          .writeText(copyText)
          .then(() => {
            copyButton.classList.add("is-success");
            copyFeedback.style.opacity = "1";
            setTimeout(() => {
              copyButton.classList.remove("is-success");
              copyFeedback.style.opacity = "0";
            }, 4000);
          })
          .catch((err) => {
            console.error("Copy error:", err);
            showError("Failed to copy text");
          });
      });

      const copyFeedback = document.createElement("span");
      copyFeedback.className = "is-size-7 has-text-danger";
      copyFeedback.style.cssText = `
        position: absolute;
        top: 45px;
        right: 4px;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      copyFeedback.textContent = "Copied!";

      cardContent.style.position = "relative";
      cardContent.appendChild(copyFeedback);
      cardContent.appendChild(copyButton);

      // --- AI Integration ---
      // Create AI response div first
      const aiResponseDiv = createAIResponseDiv(cardContent);

      // Create code button if applicable
      const hasCodeButton = createCodeButton(item, cardContent, aiResponseDiv) !== null;

      // Determine if we should show mermaid button (can be based on keywords or always show)
      const hasMermaidButton = true; // Always show for now, could be conditional
      
      // Determine if we should show research button (always show for now)
      const hasResearchButton = true;

      // Calculate positions for all buttons
      const positions = calculateButtonPositions(hasCodeButton, hasMermaidButton, hasResearchButton);

      // Create Research button
      createResearchButton(item, cardContent, aiResponseDiv, positions.research);

      // Create Gemini button with updated position
      const geminiButton = document.createElement("button");
      geminiButton.className = "button is-small is-light";
      geminiButton.style.cssText = `
        position: absolute;
        top: 10px;
        right: ${positions.gemini}px;
        border-radius: 4px;
        padding: 5px;
        z-index: 10;
        height: 32px;
        width: 32px;
        transition: background-color 0.3s ease;
      `;
      geminiButton.title = "Tell me more (AI)";

      const geminiIcon = document.createElement("img");
      geminiIcon.src = "assets/static/icons/google-gemini-icon.svg";
      geminiIcon.alt = "Gemini Icon";
      geminiIcon.style.width = "16px";
      geminiIcon.style.height = "16px";
      geminiIcon.style.verticalAlign = "middle";

      geminiButton.appendChild(geminiIcon);

      // Add hover effects similar to copy button
      geminiButton.addEventListener("mouseenter", () => {
        geminiButton.classList.add("is-info");
      });
      geminiButton.addEventListener("mouseleave", () => {
        geminiButton.classList.remove("is-info");
      });

      geminiButton.addEventListener("click", async () => {
        const acronym = item.acronym;
        const definition = item.definition;
        const description = item.description || "";

        // Indicate loading state
        geminiButton.classList.add("is-loading");
        geminiButton.disabled = true;
        aiResponseDiv.textContent = "Fetching details...";
        aiResponseDiv.style.display = "block";

        try {
          const response = await fetch("/api/tell-me-more", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ acronym, definition, description }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          if (data.text) {
            aiResponseDiv.innerHTML = `<strong>AI Explanation:</strong> ${data.text}`;
            aiResponseDiv.style.display = "block";
          } else {
            throw new Error("No text received from AI.");
          }
        } catch (error) {
          console.error("Error fetching AI details:", error);
          aiResponseDiv.textContent = `Error: ${error.message}`;
          aiResponseDiv.style.display = "block";
        } finally {
          geminiButton.classList.remove("is-loading");
          geminiButton.disabled = false;
        }
      });

      cardContent.appendChild(geminiButton);

      // Create Mermaid button if applicable
      if (hasMermaidButton) {
        createMermaidButton(item, cardContent, aiResponseDiv, positions.mermaid);
      }

      // Update code button position if it exists
      if (hasCodeButton) {
        const codeButton = cardContent.querySelector('[title="Get Python code example"]');
        if (codeButton) {
          codeButton.style.right = `${positions.code}px`;
        }
      }
      // --- End AI Integration ---

      card.appendChild(cardContent); // Add the populated content to the card element

      cardColumn.appendChild(card);
      resultsDiv.appendChild(cardColumn);
      cardsCreated++;
      // console.log(`  - Appended card for ${item.acronym} to resultsDiv. Total cards in DOM: ${resultsDiv.children.length}`); // Removed log
      } catch (error) {
        // console.error(`Error processing item at index ${index}:`, item, error); // Removed log
        // Optionally, display an error message for this specific card
      }
    });

    // console.log(`Finished loop. Created and attempted to append ${cardsCreated} cards.`); // Removed log
    // console.log(`Final number of children in resultsDiv: ${resultsDiv.children.length}`); // Removed log
  }

  async function handlePDFFile(file) {
    // console.log("handlePDFFile called with file:", file.name, "size:", file.size, "type:", file.type); // Removed log
    document.getElementById("fileName").textContent = file.name;

    try {
      // Get the page count display element
      const pageCountElement = document.getElementById("pageCount");
      pageCountElement.style.display = "none"; // Hide initially

      // Get page count from the PDF
      console.log("Reading PDF file...");
      const arrayBuffer = await file.arrayBuffer();
      console.log("File loaded into memory, size:", arrayBuffer.byteLength);

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      console.log("PDF loaded with PDF.js, pages:", numPages);

      // Display the page count
      pageCountElement.textContent = `PDF contains ${numPages} pages`;
      pageCountElement.style.display = "block"; // Make visible

      console.log("Calling parsePDF to extract acronyms...");
      const extractedAcronyms = await parsePDF(file, pdf); // Pass the pdf object to avoid loading twice

      console.log("Extracted acronyms returned from parsePDF:", extractedAcronyms);
      console.log("Type of extractedAcronyms:", typeof extractedAcronyms);
      console.log("Is array?", Array.isArray(extractedAcronyms));

      if (extractedAcronyms && Array.isArray(extractedAcronyms)) {
        console.log("Number of extracted acronyms:", extractedAcronyms.length);

        if (extractedAcronyms.length > 0) {
          // Log the first few acronyms for debugging
          // console.log("First few extracted acronyms:", extractedAcronyms.slice(0, 3).map(a => `${a.acronym}: ${a.definition}`)); // Removed log

          // Filter out duplicates before merging
          const newAcronyms = extractedAcronyms.filter(
            (newAcronym) =>
              newAcronym &&
              newAcronym.acronym &&
              newAcronym.definition &&
              !acronymsData.some(
                (existing) => existing.acronym === newAcronym.acronym
              )
          );

          // console.log(`Found ${newAcronyms.length} new unique acronyms`); // Removed log

          if (newAcronyms.length > 0) {
            // Add the new acronyms to the global data
            acronymsData = [...acronymsData, ...newAcronyms];
            // console.log("Updated acronymsData, new total:", acronymsData.length); // Removed log

            // Show all uploaded acronyms, not just new ones
            const uploadedAcronyms = acronymsData.filter(item =>
              item && item.keywords &&
              (Array.isArray(item.keywords) ?
                item.keywords.includes("PDF Import") :
                item.keywords === "PDF Import")
            );

            console.log(`Displaying ${uploadedAcronyms.length} uploaded acronyms`);
            console.log("Sample of uploaded acronyms to display:",
              uploadedAcronyms.slice(0, 3).map(a => `${a.acronym}: ${a.definition}`));

            // This is where we display the acronyms
            showUploadedAcronyms(uploadedAcronyms);
            showError(
              `Successfully imported ${newAcronyms.length} new acronyms from PDF`
            );
          } else {
            showError("No new acronyms found in the PDF");
          }
        } else {
          console.log("No acronyms found in the extracted data");
          showError("No acronyms found in the PDF");
        }
      } else {
        console.error("Invalid data returned from parsePDF:", extractedAcronyms);
        showError("Error extracting acronyms from PDF");
      }
    } catch (error) {
      showError("Error processing PDF file");
      console.error("PDF processing error:", error);
      console.error("Error details:", error.message, error.stack);
    }
  }

  // Prevent default on the entire window
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    window.addEventListener(
      eventName,
      (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
      false
    );
  });

  setupDragAndDrop();

  // Add file input change handler
  document
    .getElementById("pdfInput")
    .addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (file) {
        await handlePDFFile(file);
      }
    });

  // Add reference for the new refresh button
  const refreshRandomButton = document.getElementById("refreshRandomAcronyms");

  // Add event listener for the refresh random acronyms button
  refreshRandomButton.addEventListener("click", () => {
    showRandomAcronyms();
  });

  // Refresh button for uploaded acronyms (filters items from PDF import)
  document.getElementById("refreshUploaded").addEventListener("click", () => {
    if (!acronymsData || !acronymsData) {
      showError("No acronyms data available");
      return;
    }

    // Filter for acronyms uploaded via PDF (which have "PDF Import" tag)
    const uploadedAcronyms = acronymsData.filter(item =>
      item.keywords && item.keywords.includes("PDF Import")
    );

    if (uploadedAcronyms.length > 0) {
      showUploadedAcronyms(uploadedAcronyms);
    } else {
      showError("No uploaded PDF acronyms available");
    }
  });

  function convertMarkdownLinks(text) {
    // Matches markdown links in the format [[alias]](url)
    const linkRegex = /\[\[(.*?)\]\]\((.*?)\)/g;
    return text.replace(linkRegex, (_match, alias, url) => {
      // Create an anchor tag with the alias as text and url as href
      return `<a href="${url}" target="_blank" class="has-text-link">${alias}</a>`;
    });
  }

  // Function to create research button for research papers
  function createResearchButton(item, cardContent, aiResponseDiv, rightPosition) {
    const researchButton = document.createElement("button");
    researchButton.className = "button is-small is-light";
    researchButton.style.cssText = `
      position: absolute;
      top: 10px;
      right: ${rightPosition}px;
      border-radius: 4px;
      padding: 5px;
      z-index: 10;
      height: 32px;
      width: 32px;
      transition: background-color 0.3s ease;
    `;
    researchButton.title = "Find research papers";

    const researchIcon = document.createElement("img");
    researchIcon.src = "assets/static/icons/core-api-icon.svg";
    researchIcon.alt = "Research Icon";
    researchIcon.style.width = "16px";
    researchIcon.style.height = "16px";
    researchIcon.style.verticalAlign = "middle";

    researchButton.appendChild(researchIcon);

    // Add hover effects
    researchButton.addEventListener("mouseenter", () => {
      researchButton.classList.add("is-success"); // Use a different color for research button
    });
    researchButton.addEventListener("mouseleave", () => {
      researchButton.classList.remove("is-success");
    });

    researchButton.addEventListener("click", async () => {
      const acronym = item.acronym;
      const definition = item.definition;
      const description = item.description || "";

      // Construct a query for research papers
      const query = `${acronym} ${definition}`;

      // Indicate loading state
      researchButton.classList.add("is-loading");
      researchButton.disabled = true;
      aiResponseDiv.textContent = "Searching for research papers...";
      aiResponseDiv.style.display = "block";

      try {
        const response = await fetch("/api/return-research-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
          throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.results && data.results.length > 0) {
          // Format the research results
          let resultsHtml = `<strong>Research Papers:</strong><ul class="research-papers">`;

          data.results.forEach(paper => {
            resultsHtml += `<li class="research-paper">`;
            resultsHtml += `<p class="paper-title"><strong>${paper.title || 'Untitled'}</strong></p>`;

            if (paper.authors && paper.authors.length > 0) {
              const authorNames = paper.authors.map(author => author.name).join(', ');
              resultsHtml += `<p class="paper-authors">Authors: ${authorNames}</p>`;
            }

            if (paper.abstract) {
              resultsHtml += `<p class="paper-abstract">${paper.abstract.substring(0, 200)}${paper.abstract.length > 200 ? '...' : ''}</p>`;
            }

            if (paper.doi) {
              resultsHtml += `<p class="paper-doi">DOI: <a href="https://doi.org/${paper.doi}" target="_blank">${paper.doi}</a></p>`;
            }

            if (paper.downloadUrl) {
              resultsHtml += `<p class="paper-download"><a href="${paper.downloadUrl}" target="_blank" class="button is-small is-info is-light">Download Paper</a></p>`;
            }

            resultsHtml += `</li>`;
          });

          resultsHtml += `</ul>`;
          aiResponseDiv.innerHTML = resultsHtml;
          aiResponseDiv.style.display = "block";
        } else {
          aiResponseDiv.innerHTML = `<strong>Research:</strong> No relevant research papers found.`;
          aiResponseDiv.style.display = "block";
        }
      } catch (error) {
        console.error("Error fetching research papers:", error);
        aiResponseDiv.textContent = `Error: ${error.message}`;
        aiResponseDiv.style.display = "block";
      } finally {
        researchButton.classList.remove("is-loading");
        researchButton.disabled = false;
      }
    });

    cardContent.appendChild(researchButton);
    return researchButton;
  }

});
