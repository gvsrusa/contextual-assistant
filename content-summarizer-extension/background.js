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
      const syncSettings = await chrome.storage.sync.get({
        llmProvider: 'openai', apiKey: '', model: 'gpt-4'
      });
      const localData = await chrome.storage.local.get(['currentSummary', 'contentMetadata']);

      if (!localData.currentSummary) {
        sendResponse({ error: 'ChatInitError: No summary available for chat. Please summarize content on the active tab first.' });
        return;
      }
      if (typeof LLMProviderFactory === 'undefined' || typeof ChatEngine === 'undefined') {
        console.error('LLMProviderFactory or ChatEngine is not defined. Check script imports.');
        sendResponse({ error: 'ChatInitError: Chat engine components are not available. Please try reloading the extension.' });
        return;
      }
      if (!syncSettings.apiKey && syncSettings.llmProvider !== 'local') { // Allow local LLM without API key
        sendResponse({ error: 'ChatInitError: API Key for the selected LLM is missing. Please check your settings.' });
        return;
      }
      
      let provider;
      try {
        provider = LLMProviderFactory.create(
          syncSettings.llmProvider,
          syncSettings.apiKey,
          { model: syncSettings.model }
        );
      } catch (providerError) {
        console.error("Failed to create LLM provider in background:", providerError);
        sendResponse({ error: `ChatInitError: Failed to initialize LLM provider (${syncSettings.llmProvider}): ${providerError.message}. Check console for details.` });
        return;
      }
      
      chatEngine = new ChatEngine(provider);
      chatEngine.initialize(localData.currentSummary, localData.contentMetadata || { title: "Summarized Content", type: "unknown" });
      console.log("ChatEngine initialized in background.js");
    }

    const reply = await chatEngine.sendMessage(message);
    sendResponse({ success: true, reply });

  } catch (error) {
    console.error('Chat processing error in background.js:', error);
    let detailedError = error.message || 'An unknown error occurred during chat processing.';
    if (error.message && error.message.toLowerCase().includes("api key")) {
        detailedError = "LLM API Key error: " + error.message + ". Please verify your API key in settings.";
    } else if (error.message && error.message.toLowerCase().includes("quota")) {
        detailedError = "LLM Quota error: " + error.message + ". Please check your LLM provider account.";
    }
    sendResponse({ success: false, error: detailedError });
  }
}

// Listen for tab changes to reset chat context
chrome.tabs.onActivated.addListener(() => {
  chatEngine = null;
  console.log("Chat engine reset due to tab activation.");
});