// popup.js
// This script handles the logic for the extension's popup UI (popup.html).
// It allows users to initiate content summarization, view summaries, interact with a chat feature,
// and access settings or toggle the sidebar.

document.addEventListener('DOMContentLoaded', function() {
  // --- DOM Element References ---
  const summarizeBtn = document.getElementById('summarize-btn');
  const summaryContainer = document.getElementById('summary-container');
  const chatContainer = document.getElementById('chat-container');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const lengthSelector = document.getElementById('summary-length');

  // Load default summary length from storage and set the selector's initial value.
  chrome.storage.sync.get('defaultSummaryLength', function(data) {
    if (data.defaultSummaryLength && lengthSelector) {
      lengthSelector.value = data.defaultSummaryLength;
    }
  });
  
  // --- Initialization and Event Listeners ---

  // Query for the active tab to check page support and enable/disable UI elements.
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    if (!currentTab || !currentTab.url) {
        console.error("Popup: Could not get current tab information.");
        summarizeBtn.disabled = true;
        summarizeBtn.textContent = 'Error: No Tab Info';
        return;
    }
    
    // checkPageSupport is a placeholder; in a real scenario, it might check URL patterns, etc.
    checkPageSupport(currentTab.url).then(isSupported => {
      if (isSupported) {
        summarizeBtn.disabled = false;
        summarizeBtn.textContent = 'Summarize Content';
      } else {
        summarizeBtn.disabled = true;
        summarizeBtn.textContent = 'Unsupported Page';
      }
    });
  });
  
  // Event listener for the "Summarize Content" button.
  summarizeBtn.addEventListener('click', function() {
    summaryContainer.innerHTML = '<div class="loading">Summarizing content...</div>'; // Show loading state
    const length = lengthSelector.value; // Get desired summary length
    
    // Send a message to the content script of the active tab to initiate summarization.
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'summarize',
        options: { length }
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error("Error sending summarize message to content script:", chrome.runtime.lastError.message);
          if (chrome.runtime.lastError.message.includes("No tab with id") || chrome.runtime.lastError.message.includes("Receiving end does not exist")) {
            summaryContainer.innerHTML = '<div class="error">Cannot summarize this page. The extension may not have permission to access this URL (e.g., Chrome Web Store, system pages) or the page is not yet fully loaded. Try reloading the page.</div>';
          } else {
            summaryContainer.innerHTML = `<div class="error">Failed to communicate with the page: ${chrome.runtime.lastError.message}</div>`;
          }
          return;
        }

        if (response && response.success && response.summary && response.metadata) {
          chrome.storage.local.set({
            // Save the raw summary and metadata to local storage for other components (e.g., background script's ChatEngine).
            currentSummary: response.summary, // Raw summary text
            contentMetadata: response.metadata // Includes raw duration, title, etc.
          }, function() {
            if (chrome.runtime.lastError) {
              console.error("Popup: Error saving summary/metadata to local storage:", chrome.runtime.lastError);
            } else {
              console.log("Popup: Summary and metadata saved to local storage.");
            }
          });
           // Display the formatted summary and enable chat.
           // response.formattedSummaryHtml and response.metadata.formattedDuration are used here.
           displaySummary(response.formattedSummaryHtml, response.metadata);
           initializeChat(response.summary, response.metadata); // Pass raw summary for chat context
           attachTimestampClickListenersInPopup(); // Make timestamps in the summary clickable
        } else if (response && response.error) {
            // Handle errors received from the content script during summarization.
            let userFriendlyError = "Failed to generate summary.";
            const errorText = response.error.toLowerCase();
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
                userFriendlyError = `Failed to generate summary: ${response.error}`;
            }
            summaryContainer.innerHTML = `<div class="error">${userFriendlyError}</div>`;
        } else { 
            summaryContainer.innerHTML = '<div class="error">Failed to generate summary. No response or unexpected response from the page.</div>';
        }
      });
    });
  });
  
  // --- Chat Functionality ---

  // Event listeners for sending chat messages (click and Enter key).
  sendBtn.addEventListener('click', sendChatMessage);
  chatInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !event.shiftKey) { // Send on Enter, but not Shift+Enter
        e.preventDefault();
        sendChatMessage();
    }
  });
  
  // Sends the user's chat message to the background script for processing by ChatEngine.
  function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    appendChatMessage('user', message); // Display user's message in the UI
    chatInput.value = ''; // Clear the input field
    appendChatMessage('typing', '...'); // Show a typing indicator
    
    // Send the message to background.js.
    chrome.runtime.sendMessage({
      action: 'chat',
      message
    }, function(response) {
      // Remove typing indicator
      removeTypingIndicator();
      
      // Display response
      if (response && response.reply) {
        appendChatMessage('assistant', response.reply);
      } else if (response && response.error) {
        let chatError = "Error in chat.";
        const errorText = response.error.toLowerCase();
        if (errorText.includes("no summary available")) {
            chatError = "Chat error: No summary is available for the current page. Please summarize first.";
        } else if (errorText.includes("chat engine components are not available") || errorText.includes("llmproviderfactory") || errorText.includes("chatengine is not defined")) {
            chatError = "Chat error: Core chat components failed to initialize. Please try reloading the extension.";
        } else if (errorText.includes("api key")) {
            chatError = "Chat error: Invalid API Key for the selected LLM. Please check your settings.";
        } else if (errorText.includes("quota")) {
            chatError = "Chat error: API quota exceeded for the selected LLM.";
        } else {
            chatError = `Chat error: ${response.error}`;
        }
        appendChatMessage('error', chatError);
      } else {
        appendChatMessage('error', 'Failed to get response from chat. Unknown error.');
      }
    });
  }
  
  // --- UI Update Functions ---

  // Displays the summary content in the popup.
  // `formattedSummaryHtml`: Pre-formatted HTML string of the summary.
  // `metadata`: Object containing content metadata like title, author, formattedDuration.
  function displaySummary(formattedSummaryHtml, metadata) {
    let summaryDisplayHTML = `
      <h2>${metadata.title || 'Summary'}</h2>
      <div class="metadata">
        ${metadata.author ? `<span>By: ${metadata.author}</span>` : ''}
        ${metadata.type === 'video' && metadata.formattedDuration ? `<span>Duration: ${metadata.formattedDuration}</span>` : ''}
      </div>
      <div class="summary-content">
        ${formattedSummaryHtml} 
      </div>
    `;
    summaryContainer.innerHTML = summaryDisplayHTML;
    summaryContainer.classList.add('active'); // Make the summary section visible
  }
  
  // Local formatting functions (formatSummaryWithTimestamps, formatDuration) were removed
  // as this formatting is now handled by content-script.js (via contentScriptUtils.js)
  // and the pre-formatted HTML is passed in the response.

  // --- Navigation/Action Button Event Listeners ---

  // Settings button: Opens the extension's options page.
  const settingsButton = document.getElementById('settings-btn');
  if (settingsButton) {
    settingsButton.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // Expand button: Sends a message to the content script to toggle the sidebar.
  const expandButton = document.getElementById('expand-btn');
    if (expandButton) {
      expandButton.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleSidebar' }, (response) => {
              if (chrome.runtime.lastError) {
                console.error("Error toggling sidebar:", chrome.runtime.lastError.message);
                // Optionally, inform the user in the popup if sidebar toggle failed
              } else {
                console.log("Sidebar toggle message sent, response:", response);
              }
            });
          } else {
            console.error("Could not get active tab ID to toggle sidebar.");
          }
        });
      });
    }
});

async function checkPageSupport(url) {
  console.log("checkPageSupport called for:", url);
  // For now, let's assume all pages are supported for basic popup functionality
  return true;
}

function displaySummary(formattedSummaryHtml, metadata) { // Adjusted parameters
  console.log("displaySummary called with metadata:", metadata);
  const summaryContainer = document.getElementById('summary-container');
  if (summaryContainer) {
    // Uses pre-formatted HTML from content script's response
    summaryContainer.innerHTML = `
      <h2>${metadata.title || 'Summary'}</h2>
      <div class="metadata">
        ${metadata.author ? `<span>By: ${metadata.author}</span>` : ''}
        ${metadata.type === 'video' && metadata.formattedDuration ? `<span>Duration: ${metadata.formattedDuration}</span>` : ''}
      </div>
      <div class="summary-content">
        ${formattedSummaryHtml}
      </div>`;
    summaryContainer.classList.add('active');
  }
}

function initializeChat(rawSummary, metadata) { // rawSummary might be needed for ChatEngine context
  console.log("initializeChat called with:", summary, metadata);
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  if (chatInput) chatInput.disabled = false;
  if (sendBtn) sendBtn.disabled = false;
}

function appendChatMessage(role, message) {
  console.log("appendChatMessage called:", role, message);
  const chatMessages = document.getElementById('chat-messages');
  if (chatMessages) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', role);
    msgDiv.textContent = message;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function removeTypingIndicator() {
  console.log("removeTypingIndicator called");
  const typingIndicator = document.querySelector('.message.typing');
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

// convertTimestampToSeconds remains as it's used by attachTimestampClickListenersInPopup.
// It converts "HH:MM:SS" or "MM:SS" timestamp strings to seconds.
function convertTimestampToSeconds(timestamp) {
  if (!timestamp) return 0;
  const parts = timestamp.split(':').map(Number);

  if (parts.some(isNaN)) {
    console.warn("Popup: Invalid characters in timestamp parts:", timestamp);
    return 0;
  }
  
  if (parts.length === 3) { // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) { // MM:SS
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) { // SS (less common for display but good to handle)
    return parts[0];
  }
  console.warn("Popup: Invalid timestamp format for conversion:", timestamp);
  return 0;
}

// Attaches click listeners to timestamp links within the displayed summary.
// When clicked, these links send a message to the content script to navigate the video.
function attachTimestampClickListenersInPopup() {
  const summaryContainer = document.getElementById('summary-container');
  if (!summaryContainer) return;

  // Timestamp links are expected to have class="timestamp" and a "data-time" attribute
  // (e.g., <a href="#" class="timestamp" data-time="01:23">...</a>).
  // This is set up by formatSummaryWithTimestamps in contentScriptUtils.js.
  const timestampLinks = summaryContainer.querySelectorAll('a.timestamp'); 
  
  timestampLinks.forEach(link => {
    // Re-cloning the node and replacing it is a common technique to ensure
    // that any previously attached listeners are removed, preventing multiple triggers
    // if this function were ever called multiple times on the same DOM.
    const newLink = link.cloneNode(true); 
    link.parentNode.replaceChild(newLink, link);

    newLink.addEventListener('click', (e) => {
      e.preventDefault(); // Prevent default link navigation
      const timestampStr = newLink.dataset.time;
      const seconds = convertTimestampToSeconds(timestampStr);

      // Send message to content script to navigate the video.
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'navigateVideo',
            time: seconds
          }, (response) => { // Optional: handle response from content script
            if (chrome.runtime.lastError) {
              console.error("Popup: Error sending navigateVideo message:", chrome.runtime.lastError.message);
            } else {
              console.log("Popup: navigateVideo message sent, response:", response);
            }
          });
        } else {
          console.error("Popup: Could not get active tab ID for navigateVideo message.");
        }
      });
    });
  });
}