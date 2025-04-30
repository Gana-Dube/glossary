document.addEventListener("DOMContentLoaded", () => {
  let acronymsData = null;

  // Add after existing variables
  const voiceButton = document.getElementById("voiceButton");
  let isListening = false;

  // Utility functions to avoid code duplication
  function createCodeButton(item, cardContent, aiResponseDiv) {
    // Check if the item has a "script" tag
    const hasScriptTag = item.tags && (
      (typeof item.tags === 'string' && item.tags.includes('script')) ||
      (Array.isArray(item.tags) && item.tags.some(tag => tag === 'script'))
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
      acronymsData = data;
      showRandomAcronyms(); // Initialize random acronyms
    })
    .catch((error) => {
      console.error("Error loading acronyms data:", error);
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
    if (!acronymsData || !acronymsData.acronyms.length) return [];
    const shuffled = [...acronymsData.acronyms].sort(() => 0.5 - Math.random());
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
    const matches = acronymsData.acronyms.filter((item) =>
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
      if (item.tags && item.tags.length > 0) {
        const tagsContainer = document.createElement("div");
        tagsContainer.className = "tags";
        tagsContainer.style.cssText = "margin: 0.5rem 0 0 0;";

        // Split tags if it's a string, or use array directly
        const tagsList =
          typeof item.tags === "string"
            ? item.tags.split(",").map((t) => t.trim())
            : item.tags;

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
            console.error("Copy error:", err);
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

      // Create Gemini button
      createGeminiButton(item, cardContent, aiResponseDiv, hasCodeButton);
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
    /([\w\s\-\&]+?)\s*\(\s*([A-Za-z0-9\-.]+)\s*\)/g, // Pattern: definition (ACRONYM)
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

      // Try to use Python processing first
      if (window.processPDFWithPython) {
        try {
          showError("Processing with Python - this may take a moment...");
          const pythonResults = await window.processPDFWithPython(extractedText);
          progressBar.classList.add("is-hidden");

          if (pythonResults && pythonResults.length > 0) {
            return pythonResults;
          }
          // If Python processing returned no results, fall back to JavaScript
          showError("Python processing found no acronyms, using JavaScript fallback");
        } catch (error) {
          console.error("Python processing failed:", error);
          showError("Python processing failed, using JavaScript fallback");
        }
      }

      // Fallback to JavaScript processing if Python is not available or failed
      const acronyms = new Map();

      ACRONYM_PATTERNS.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(extractedText)) !== null) {
          // match[1] is the definition
          // match[2] is the acronym
          let definitionText = match[1].trim();
          const acronymText = match[2].trim();

          // Only proceed if acronym length is at least 2
          if (acronymText.length >= 2) {
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
              }
            }

            acronyms.set(acronymText, {
              acronym: acronymText,
              definition: definitionText,
              tags: ["PDF Import"],
            });
          }
        }
      });

      progressBar.classList.add("is-hidden");
      return Array.from(acronyms.values());
    } catch (error) {
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

    acronyms.forEach((item) => {
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
      if (item.tags && item.tags.length > 0) {
        const tagsContainer = document.createElement("div");
        tagsContainer.className = "tags";
        tagsContainer.style.cssText = "margin: 0.5rem 0 0 0;";
        const tagsList =
          typeof item.tags === "string"
            ? item.tags.split(",").map((t) => t.trim())
            : item.tags;

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

      // Create Gemini button
      createGeminiButton(item, cardContent, aiResponseDiv, hasCodeButton);
      // --- End AI Integration ---

      cardColumn.appendChild(card);
      resultsDiv.appendChild(cardColumn);
    });
  }

  async function handlePDFFile(file) {
    document.getElementById("fileName").textContent = file.name;

    try {
      // Get the page count display element
      const pageCountElement = document.getElementById("pageCount");
      pageCountElement.style.display = "none"; // Hide initially

      // Get page count from the PDF
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      // Display the page count
      pageCountElement.textContent = `PDF contains ${numPages} pages`;
      pageCountElement.style.display = "block"; // Make visible

      const extractedAcronyms = await parsePDF(file, pdf); // Pass the pdf object to avoid loading twice

      if (extractedAcronyms.length > 0) {
        // Filter out duplicates before merging
        const newAcronyms = extractedAcronyms.filter(
          (newAcronym) =>
            !acronymsData.acronyms.some(
              (existing) => existing.acronym === newAcronym.acronym
            )
        );

        acronymsData.acronyms = [...acronymsData.acronyms, ...newAcronyms];
        showUploadedAcronyms(newAcronyms);
        showError(
          `Successfully imported ${newAcronyms.length} new acronyms from PDF`
        );
      } else {
        showError("No acronyms found in the PDF");
      }
    } catch (error) {
      showError("Error processing PDF file");
      console.error(error);
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
    if (!acronymsData || !acronymsData.acronyms) {
      showError("No acronyms data available");
      return;
    }

    // Filter for acronyms uploaded via PDF (which have "PDF Import" tag)
    const uploadedAcronyms = acronymsData.acronyms.filter(item =>
      item.tags && item.tags.includes("PDF Import")
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
    return text.replace(linkRegex, (match, alias, url) => {
      // Create an anchor tag with the alias as text and url as href
      return `<a href="${url}" target="_blank" class="has-text-link">${alias}</a>`;
    });
  }

});
