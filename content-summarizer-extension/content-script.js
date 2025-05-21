// content-script.js
// This script serves as the main coordinator for content script functionalities.
// It initializes core processing components and managers for UI and message handling.

// Global variables for core components, accessible within this script's scope.
let contentDetector, contentExtractor, summarizerEngine;

// Variables to store the last summary and its metadata for potential reuse or context.
let currentSummary = null;
let currentMetadata = null;

// Initialize components when the page (DOM and resources) is fully loaded.
window.addEventListener('load', () => {
  // Instantiate core content processing classes (defined in content-processor.js and engines.js).
  contentDetector = new ContentDetector();
  contentExtractor = new ContentExtractor();
  
  // Fetch user settings from chrome.storage.sync to initialize components like LLM provider
  // and to check for features like auto-summarize.
  chrome.storage.sync.get(['llmProvider', 'apiKey', 'model', 'autoSummarize', 'defaultSummaryLength'], (settings) => {
    // Create the LLM provider instance based on stored settings.
    // LLMProviderFactory and SummarizerEngine are defined in llm-providers.js and engines.js respectively.
    const provider = LLMProviderFactory.create(
      settings.llmProvider || 'openai', // Default to OpenAI if no setting is stored
      settings.apiKey || '',
      { model: settings.model } // Pass model selection
    );
    summarizerEngine = new SummarizerEngine(provider);

    // After the summarizer engine is ready, handle auto-summarization if enabled.
    // Default summary length is passed, defaulting to 'medium' if not set.
    handleAutoSummarize(settings.autoSummarize, settings.defaultSummaryLength || 'medium');
  });
  
  // Initialize the Floating Action Button (FAB) manager.
  // FabManager is defined in fabManager.js and should be globally available.
  if (typeof FabManager !== 'undefined' && FabManager.initialize) {
    FabManager.initialize(); // FabManager handles its own DOM injection and event listeners.
  } else {
    console.error("content-script.js: FabManager or FabManager.initialize is not defined. FAB will not be loaded.");
  }

  // Expose core functionalities to other content script modules (like contentScriptMessageHandler.js)
  // via a namespaced object on `window`. This allows the message handler to call these functions.
  // This must be done before the message handler is initialized.
  window.ContentScriptCore = {
    handleSummarizeRequest: handleSummarizeRequest
    // Other core functions can be added here if needed by the message handler.
  };
  
  // Initialize the main message handler for this content script.
  // ContentScriptMessageHandler is defined in contentScriptMessageHandler.js.
  if (typeof ContentScriptMessageHandler !== 'undefined' && ContentScriptMessageHandler.initialize) {
    ContentScriptMessageHandler.initialize(); // Sets up chrome.runtime.onMessage listener.
  } else {
    console.error("content-script.js: ContentScriptMessageHandler or its initialize function is not defined. Messages will not be handled.");
  }
});

// The main chrome.runtime.onMessage.addListener has been moved to contentScriptMessageHandler.js.

// Core function to handle summarization requests.
// This can be called from the message handler in response to messages from popup, sidebar, or FAB.
// `options`: Contains settings for summarization, e.g., { length: 'medium', includeTimestamps: true }.
// `sendResponse`: Callback function to send the result (summary or error) back to the caller.
async function handleSummarizeRequest(options, sendResponse) {
  try {
    // Detect content type
    const contentType = contentDetector.detect(window.location.href);
    
    // Extract content
    const content = await contentExtractor.extract(contentType);

    // Prepare summarization options, fetching includeTimestamps if not provided
    let effectiveOptions = { ...options };

    if (typeof options.includeTimestamps === 'undefined') {
      const settings = await new Promise(resolve => {
        chrome.storage.sync.get({ includeTimestamps: true }, items => resolve(items));
      });
      effectiveOptions.includeTimestamps = settings.includeTimestamps;
      console.log(`handleSummarizeRequest: includeTimestamps not in options, fetched from storage: ${settings.includeTimestamps}`);
    }
    
    // Generate summary
    const summary = await summarizerEngine.summarize(content, effectiveOptions);
    
    // Store for later use
    currentSummary = summary; // Keep raw summary for potential internal use
    
    // Prepare formatted data for UI
    const formattedSummaryHtml = formatSummaryWithTimestamps(summary, content.type); // from contentScriptUtils.js
    const formattedDuration = content.duration ? formatDuration(content.duration) : null; // from contentScriptUtils.js

    currentMetadata = { // Store raw metadata as well
      title: content.title,
      author: content.author,
      type: content.type,
      duration: content.duration, // raw duration
      url: content.url
    };
    
    // Send response with raw summary, raw metadata, AND formatted versions for UI
    sendResponse({
      success: true,
      summary: summary, // Raw summary
      formattedSummaryHtml: formattedSummaryHtml, // Pre-formatted HTML for display
      metadata: { // Keep original metadata structure but add formatted duration
          title: content.title,
          author: content.author,
          type: content.type,
          duration: content.duration, // raw duration
          formattedDuration: formattedDuration, // pre-formatted duration string
          url: content.url
      }
    });
    
  } catch (error) {
    console.error('Summarization failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// createSidebarHTML function has been moved to sidebarManager.js
// addFloatingActionButton, showInPageSummaryInterface, updateInPageSummary, showSummaryError
// have been moved to fabManager.js


// Other UI helper functions... (If any remain specific to content-script.js general tasks)

// Utility functions for formatting, timestamp handling, and video navigation
// are now expected to be in contentScriptUtils.js and loaded before this script.
// FAB and its in-page summary UI are managed by fabManager.js

function handleAutoSummarize(autoSummarizeEnabled, defaultLength) {
  if (autoSummarizeEnabled) {
    console.log("Auto-summarize is enabled. Checking content type.");
    // Ensure contentDetector is ready
    if (!contentDetector) {
      console.warn("AutoSummarize: ContentDetector not ready yet. Retrying.");
      // Retry, but ensure not to create an infinite loop if contentDetector never loads.
      setTimeout(() => handleAutoSummarize(autoSummarizeEnabled, defaultLength), 500);
      return;
    }

    const contentType = contentDetector.detect(window.location.href);
    if (contentType !== 'unknown' && contentType !== 'audio') { // Don't auto-summarize raw audio files for now
      console.log(`Auto-summarizing content of type: ${contentType} with length: ${defaultLength || 'medium'}`);
      // Wait a bit for the page to fully settle
      setTimeout(() => {
        // Ensure FabManager is available and its method to show UI can be called.
        // FabManager.showInPageSummaryInterface() is responsible for creating the UI
        // and then sending a 'summarizeForFab' message.
        if (typeof FabManager !== 'undefined' && FabManager.showInPageSummaryInterface) {
            console.log("Auto-summarize: Triggering FabManager.showInPageSummaryInterface");
            // Check if user has disabled FAB. If so, auto-summarize might not be desired,
            // or it should happen without visual UI until user interacts.
            // For now, let's respect that auto-summarize implies showing the in-page summary.
            chrome.storage.sync.get({ showFab: true }, (fabSettings) => {
                if (fabSettings.showFab) { // Only show UI if FAB itself would be shown
                    FabManager.showInPageSummaryInterface(); 
                } else {
                    console.log("Auto-summarize: FAB is disabled in settings, so auto-summary UI will not be shown. Summarizing in background.");
                    // If FAB is hidden, we can still summarize, but the result won't be shown automatically.
                    // It will be in storage for the sidebar/popup if opened.
                     chrome.runtime.sendMessage({ action: 'summarizeForFab', options: { length: defaultLength } }, (response) => {
                        if (response && response.success) {
                            console.log("Auto-summary (no UI) successful:", response.metadata.title);
                            chrome.storage.local.set({
                                currentSummary: response.summary,
                                contentMetadata: response.metadata
                            });
                        } else {
                            console.error("Auto-summary (no UI) failed:", response ? response.error : "No response");
                        }
                    });
                }
            });
        } else {
            console.warn("Auto-summarize: FabManager.showInPageSummaryInterface not available to show UI.");
        }
      }, 2000); // Increased delay slightly
    } else {
      console.log("Auto-summarize: Content type is 'unknown' or 'audio', not summarizing automatically.");
    }
  }
}