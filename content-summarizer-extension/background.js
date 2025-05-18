// background.js
try {
  importScripts('llm-providers.js', 'engines.js');
} catch (e) {
  console.error("Error importing scripts in background.js:", e);
}

// ... rest of the file
// background.js
let chatEngine = null;

// Placeholder for LLMProviderFactory and ChatEngine if not yet defined
// class LLMProviderFactory { /* ... */ }
// class ChatEngine { /* ... */ }


// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'chat') {
    handleChatMessage(request.message, sendResponse);
    return true; // Keep channel open for async response
  } else if (request.action === 'openOptionsPage') {
    chrome.runtime.openOptionsPage();
    sendResponse({status: "Options page opening attempted"});
    return false; // No async response needed
  } else if (request.action === 'resetChatEngine') {
        chatEngine = null; // This will force re-initialization on next chat message
        console.log("Chat engine reset.");
        sendResponse({status: "Chat engine reset"});
        return false;
  }
  // Potentially other actions later
});

async function handleChatMessage(message, sendResponse) {
  try {
    if (!chatEngine) {
      // Get LLM settings from chrome.storage.sync (where options.js saves them)
      const syncSettings = await chrome.storage.sync.get({
        llmProvider: 'openai', // Default value if not set
        apiKey: '',
        model: 'gpt-4'     // Default model, ensure it's appropriate for default provider
      });

      // Get current summary and metadata from chrome.storage.local
      // These should be saved by popup.js after summarization
      const localData = await chrome.storage.local.get(['currentSummary', 'contentMetadata']);

      const summaryForChat = localData.currentSummary;
      const metadataForChat = localData.contentMetadata;

      if (!summaryForChat) {
        sendResponse({ error: 'No summary available for chat. Please summarize content on the active tab first.' });
        return;
      }

      // Ensure LLMProviderFactory and ChatEngine are available
      if (typeof LLMProviderFactory === 'undefined' || typeof ChatEngine === 'undefined') {
        console.error('LLMProviderFactory or ChatEngine is not defined. Check script imports.');
        sendResponse({ error: 'Chat engine components are not available.' });
        return;
      }
      
      const provider = LLMProviderFactory.create(
        syncSettings.llmProvider,
        syncSettings.apiKey,
        { model: syncSettings.model }
      );
      
      chatEngine = new ChatEngine(provider);
      // Provide a fallback for metadata if it's missing
      chatEngine.initialize(summaryForChat, metadataForChat || { title: "Summarized Content", type: "unknown" });
    }

    const reply = await chatEngine.sendMessage(message);
    sendResponse({ reply });

  } catch (error) {
    console.error('Chat processing error in background.js:', error);
    sendResponse({ error: error.message || 'An unknown error occurred during chat processing.' });
  }
}

// Listen for tab changes to reset chat context
chrome.tabs.onActivated.addListener(() => {
  chatEngine = null;
  console.log("Chat engine reset due to tab activation.");
});