// contentScriptMessageHandler.js: Handles message passing between the content script and other parts of the extension.

// ContentScriptMessageHandler IIFE to encapsulate message listening logic for the content script environment.
const ContentScriptMessageHandler = (() => {
  // Initializes the main message listener for the content script.
  // This listener handles requests from the popup, background script, or other extension components.
  function initialize() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // Note on `return true`: Indicates that `sendResponse` will be called asynchronously.
      // This is crucial for handlers that perform async operations (e.g., storage access, summarization).

      // --- Summarization Actions ---
      // These actions trigger the core summarization logic located in content-script.js.
      if (request.action === 'summarize' || 
          request.action === 'summarizeForSidebar' || 
          request.action === 'summarizeForFab') {
        // `handleSummarizeRequest` is exposed on `window.ContentScriptCore` by content-script.js.
        if (window.ContentScriptCore && typeof window.ContentScriptCore.handleSummarizeRequest === 'function') {
          window.ContentScriptCore.handleSummarizeRequest(request.options || {}, sendResponse);
        } else {
          console.error('ContentScriptMessageHandler: ContentScriptCore.handleSummarizeRequest is not available.');
          sendResponse({ success: false, error: 'Summarization handler is not available in content script.' });
        }
        return true; // `handleSummarizeRequest` is async.
      
      // --- Sidebar Toggle Action ---
      // Delegates to SidebarManager to show/hide the sidebar.
      } else if (request.action === 'toggleSidebar') {
        // `SidebarManager` is expected to be globally available (loaded via manifest.json).
        if (typeof SidebarManager !== 'undefined' && SidebarManager.toggle) {
          SidebarManager.toggle(sendResponse);
        } else {
          console.error("ContentScriptMessageHandler: SidebarManager or SidebarManager.toggle is not defined.");
          sendResponse({ status: "Error: SidebarManager not available", error: "SidebarManager is not available in content script." });
        }
        return true; // `SidebarManager.toggle` involves async operations like chrome.storage.sync.get.
      
      // --- Video Navigation Action ---
      // Handles requests to seek a video to a specific timestamp.
      } else if (request.action === 'navigateVideo') {
        // `handleVideoNavigation` is expected to be globally available from contentScriptUtils.js.
        if (typeof handleVideoNavigation === 'function') {
          handleVideoNavigation(request.time);
          sendResponse({ status: "Navigation attempted in content script." });
        } else {
          console.warn("ContentScriptMessageHandler: handleVideoNavigation function not defined (should be in contentScriptUtils.js).");
          sendResponse({ status: "Navigation handler not ready", error: "handleVideoNavigation is not defined in content script." });
        }
        return false; // `handleVideoNavigation` is currently synchronous.
      }
      
      // --- Default for Unhandled Actions ---
      // If an action is not handled by the `if/else if` chain, and `sendResponse` is not called,
      // the sender might receive an error "The message port closed before a response was received."
      // It's good practice to explicitly handle all expected actions or have a default response.
      // For now, unhandled actions will not send a response, which is acceptable if no response is expected.
      // console.log("ContentScriptMessageHandler: No handler for action:", request.action);
      // To explicitly send a response for unhandled actions:
      // sendResponse({ status: "Action not handled", action: request.action });
      // return false; 
    });
  }

  // Expose the initialize function to be called by content-script.js
  return {
    initialize: initialize
  };
})();
