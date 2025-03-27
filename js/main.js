document.addEventListener("DOMContentLoaded", () => {
  let acronymsData = null;

  // Add after existing variables
  const voiceButton = document.getElementById("voiceButton");
  let isListening = false;

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
    // Add this line at the start of the function
    showRandomAcronyms(); // Refresh suggestions on each search

    const searchTerm = document.getElementById("search").value.trim();
    const resultsDiv = document.getElementById("results");
    const errorDiv = document.getElementById("errorMessage");

    resultsDiv.innerHTML = ""; // Clear previous results
    resultsDiv.className = "columns is-multiline is-centered";
    errorDiv.classList.add("is-hidden"); // Hide previous errors

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
        description.innerHTML = `<strong>Description:</strong> ${item.description}`;
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

      cardColumn.appendChild(card);
      resultsDiv.appendChild(cardColumn);
    });
  }

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

  // Add after existing code

  const ACRONYM_PATTERNS = [
    /([\w\s\-\&]+?)\s*\(\s*([A-Za-z0-9\-.]+)\s*\)/g, // Pattern: definition (ACRONYM)
  ];

  async function parsePDF(file) {
    const progressBar = document.getElementById("pdfProgress");
    progressBar.classList.remove("is-hidden");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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
          .catch(() => {
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

      card.appendChild(cardContent);
      cardColumn.appendChild(card);
      resultsDiv.appendChild(cardColumn);
    });
  }

  async function handlePDFFile(file) {
    document.getElementById("fileName").textContent = file.name;
    try {
      const extractedAcronyms = await parsePDF(file);
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

});
