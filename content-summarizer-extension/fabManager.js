// fabManager.js: Manages the Floating Action Button (FAB) for quick access to summarization
// and the in-page summary interface it triggers.

// FabManager IIFE (Immediately Invoked Function Expression) to encapsulate FAB logic
const FabManager = (() => {
  let fabInjected = false; // Flag to ensure only one FAB is added to the page
  let currentInPageSummaryContainer = null; // Reference to the currently displayed in-page summary UI

  // --- UI Update Functions for the In-Page Summary Container ---

  // Populates the in-page summary container with the summary and metadata.
  // `container`: The DOM element of the in-page summary UI.
  // `summary`: The raw summary text (though formatSummaryWithTimestamps will process it).
  // `metadata`: An object containing title, author, type, formattedDuration.
  function updateInPageSummary(container, summary, metadata) {
    console.log("FabManager: updateInPageSummary called with:", metadata, summary);
    const body = container.querySelector('.content-summarizer-body');
    if (body) {
      // Functions formatDuration and formatSummaryWithTimestamps are from contentScriptUtils.js
      body.innerHTML = `
        <h3>${metadata.title || 'Summary'}</h3>
        <div class="metadata">
          ${metadata.author ? `<span>By: ${metadata.author}</span>` : ''}
          ${metadata.type === 'video' && metadata.duration ? `<span>Duration: ${formatDuration(metadata.duration)}</span>` : ''}
        </div>
        <div class="summary-content" style="white-space: pre-wrap;">${formatSummaryWithTimestamps(summary, metadata.type)}</div>
      `;
      // If summary contains timestamps, attach handlers.
      // Assuming attachTimestampHandlersToSidebar can be generalized or a new similar function is made for in-page summaries.
      // For now, let's assume formatSummaryWithTimestamps adds the necessary classes and data attributes.
      // And a generic timestamp handler attachment function might be needed in contentScriptUtils.js
      if ((metadata.type === 'video' || metadata.type === 'audio') && typeof attachTimestampHandlersToInPageSummary === 'function') {
        attachTimestampHandlersToInPageSummary(container.querySelector('.summary-content'));
      }
    }
  }

  // Displays an error message within the in-page summary container.
  // `container`: The DOM element of the in-page summary UI.
  // `error`: The error message string.
  function showSummaryError(container, error) {
    console.error("FabManager: showSummaryError called with:", error);
    const body = container.querySelector('.content-summarizer-body');
    if (body) {
        let userFriendlyError = "Failed to generate summary."; // Default error
        if (typeof error === 'string') {
            const errorText = error.toLowerCase();
            // Customize error messages based on keywords for better user experience
            if (errorText.includes("api key")) {
                userFriendlyError = "Failed to generate summary: Invalid API Key. Please check your settings.";
            } else if (errorText.includes("quota")) {
                userFriendlyError = "Failed to generate summary: API quota exceeded. Please check your LLM provider account.";
            } else if (errorText.includes("network error") || errorText.includes("failed to fetch")) {
                userFriendlyError = "Failed to generate summary: A network error occurred. Please check your internet connection.";
            } else if (errorText.includes("unsupported content") || errorText.includes("could not extract content")) {
                userFriendlyError = "Failed to generate summary: This content type is not supported or content could not be extracted.";
            } else if (errorText.includes("llmproviderfactory") || errorText.includes("summarizerengine")) {
                userFriendlyError = "Failed to generate summary: Core summarization components failed to initialize.";
            } else {
                userFriendlyError = `Failed to generate summary: ${error}`; // Use the raw error if not specifically handled
            }
        } else {
            userFriendlyError = `Failed to generate summary: An unexpected error occurred.`;
        }
        body.innerHTML = `<div class="content-summarizer-error">${userFriendlyError}</div>`;
    }
  }

  // --- FAB and In-Page Summary UI Logic ---

  // Creates and displays the in-page summary interface.
  // This UI is typically shown when the FAB is clicked or when auto-summarize is triggered.
  function showInPageSummaryInterface() {
    // Ensure only one in-page summary UI is active at a time.
    if (currentInPageSummaryContainer) {
        currentInPageSummaryContainer.remove();
        currentInPageSummaryContainer = null;
    }

    const container = document.createElement('div');
    // 'content-summarizer-container' is the main modal-like window for the in-page summary.
    container.className = 'content-summarizer-container'; 
    
    // Initial HTML structure with a loading state.
    container.innerHTML = `
      <div class="content-summarizer-header">
        <h2>Content Summary</h2>
        <button class="content-summarizer-close">×</button>
      </div>
      <div class="content-summarizer-body">
        <div class="content-summarizer-loading">
          <div class="cs-spinner"></div>
          <p>Analyzing content and generating summary...</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);
    currentInPageSummaryContainer = container; // Keep a reference to the active container
    
    // Event listener for the close button on the in-page summary UI.
    container.querySelector('.content-summarizer-close').addEventListener('click', () => {
      container.remove();
      currentInPageSummaryContainer = null; // Clear the reference when closed
    });
    
    // Sends a message to contentScriptMessageHandler (handled by content-script.js)
    // to initiate the summarization process for the FAB's UI.
    // Fetch default summary length before sending the message
    chrome.storage.sync.get({ defaultSummaryLength: 'medium' }, (storageSettings) => {
      const summaryLengthToUse = storageSettings.defaultSummaryLength;
      chrome.runtime.sendMessage({ action: 'summarizeForFab', options: { length: summaryLengthToUse } }, (response) => {
        if (currentInPageSummaryContainer) { // Check if the container wasn't closed while waiting
          if (response && response.success) {
            updateInPageSummary(currentInPageSummaryContainer, response.summary, response.metadata);
          // Save to local storage so sidebar chat can use it if opened later
          chrome.storage.local.set({
            currentSummary: response.summary,
            contentMetadata: response.metadata
          });
        } else {
          showSummaryError(currentInPageSummaryContainer, (response && response.error) ? response.error : 'Failed to generate summary.');
        }
      }
    });
  }

  // Adds the Floating Action Button (FAB) to the current page if conditions are met.
  function addFloatingActionButton() {
    if (fabInjected) return; // Prevent adding multiple FABs

    // contentDetector is initialized in content-script.js and should be globally available.
    // This check with a retry handles cases where FabManager.initialize might run
    // slightly before contentDetector is assigned in content-script.js's load event.
    if (typeof ContentDetector === 'undefined' || !contentDetector) {
        console.warn("FabManager: ContentDetector not initialized yet. Retrying FAB addition in 200ms.");
        setTimeout(addFloatingActionButton, 200); 
        return;
    }
    
    // Respects the user's preference for showing the FAB, stored in chrome.storage.sync.
    chrome.storage.sync.get({ showFab: true }, (settings) => {
        if (!settings.showFab) {
            console.log("FabManager: Show FAB setting is disabled.");
            return;
        }

        const contentType = contentDetector.detect(window.location.href);
        if (contentType === 'unknown') {
            console.log("FabManager: Content type unknown, FAB not added.");
            return;
        }
      
        const fab = document.createElement('div');
        fab.className = 'content-summarizer-fab';
        // Using a simple text or SVG icon for the FAB
        fab.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="24px" height="24px"><path d="M0 0h24v24H0z" fill="none"/><path d="M4 18h16v-2H4v2zm0-5h16v-2H4v2zm0-7v2h16V6H4z"/></svg>`;
        fab.title = 'Summarize Content (Content Summarizer)';
      
        fab.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent click from bubbling to other elements
          showInPageSummaryInterface();
        });
      
        document.body.appendChild(fab);
        fabInjected = true;
        console.log("FabManager: FAB added to page.");
    });
  }

  // Public API
  return {
    initialize: addFloatingActionButton
  };
})();
