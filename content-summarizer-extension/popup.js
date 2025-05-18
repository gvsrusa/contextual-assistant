// popup.js
document.addEventListener('DOMContentLoaded', function() {
  // Initialize UI components
  const summarizeBtn = document.getElementById('summarize-btn');
  const summaryContainer = document.getElementById('summary-container');
  const chatContainer = document.getElementById('chat-container');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const lengthSelector = document.getElementById('summary-length');
  
  // Get current tab info
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    
    // Check if the page is supported
    checkPageSupport(currentTab.url).then(isSupported => {
      if (isSupported) {
        summarizeBtn.disabled = false;
        summarizeBtn.textContent = 'Summarize Content';
      } else {
        summarizeBtn.disabled = true;
        summarizeBtn.textContent = 'Unsupported Content';
      }
    });
  });
  
  // Handle summarize button click
  summarizeBtn.addEventListener('click', function() {
    // Show loading state
    summaryContainer.innerHTML = '<div class="loading">Summarizing content...</div>';
    
    // Get selected summary length
    const length = lengthSelector.value;
    
    // Send message to content script to start summarization
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'summarize',
        options: { length }
      }, function(response) {
        // Inside the chrome.tabs.sendMessage callback, after checking for response.summary:
        if (response && response.summary && response.metadata) {
          // ... existing code to displaySummary and initializeChat ...
          
          // Save summary and metadata for background.js (ChatEngine)
          chrome.storage.local.set({
            currentSummary: response.summary,
            contentMetadata: response.metadata
          }, function() {
            if (chrome.runtime.lastError) {
              console.error("Error saving summary/metadata to local storage:", chrome.runtime.lastError);
            } else {
              console.log("Summary and metadata saved to local storage.");
            }
          });
          // The existing displaySummary and initializeChat calls should follow or be part of this block
           displaySummary(response.summary, response.metadata); // Already there
           initializeChat(response.summary, response.metadata); // Already there
           attachTimestampClickListenersInPopup(); // <--- Add this call here
        } else if (response && response.error) { // Handle error from content script
            summaryContainer.innerHTML = `<div class="error">Failed to generate summary: ${response.error}</div>`;
        } else { // Generic error
            summaryContainer.innerHTML = '<div class="error">Failed to generate summary. No response or unexpected response.</div>';
        }
      });
    });
  });
  
  // Handle chat interaction
  sendBtn.addEventListener('click', sendChatMessage);
  chatInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendChatMessage();
  });
  
  function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Display user message
    appendChatMessage('user', message);
    chatInput.value = '';
    
    // Show typing indicator
    appendChatMessage('typing', '...');
    
    // Send to background script for processing
    chrome.runtime.sendMessage({
      action: 'chat',
      message
    }, function(response) {
      // Remove typing indicator
      removeTypingIndicator();
      
      // Display response
      if (response && response.reply) {
        appendChatMessage('assistant', response.reply);
      } else {
        appendChatMessage('error', 'Failed to get response');
      }
    });
  }
  
  function displaySummary(summary, metadata) {
    // Format and display the summary
    let summaryHTML = `
      <h2>${metadata.title}</h2>
      <div class="metadata">
        ${metadata.author ? `<span>By: ${metadata.author}</span>` : ''}
        ${metadata.type === 'video' ? `<span>Duration: ${formatDuration(metadata.duration)}</span>` : ''}
      </div>
      <div class="summary-content">
        ${formatSummaryWithTimestamps(summary, metadata.type)}
      </div>
const settingsButton = document.getElementById('settings-btn');
  if (settingsButton) {
    settingsButton.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
    `;
    
    summaryContainer.innerHTML = summaryHTML;
    summaryContainer.classList.add('active');
  }
  
  function formatSummaryWithTimestamps(summary, contentType) {
    if (contentType !== 'video' && contentType !== 'audio') {
      return `<p>${summary.replace(/\n\n/g, '</p><p>')}</p>`;
    }
    
    // Make timestamps clickable for video/audio content
    return summary.replace(/\[(\d{2}:\d{2}(?::\d{2})?)\]/g, function(match, timestamp) {
      return `<a href="#" class="timestamp" data-time="${timestamp}">${match}</a>`;
    }).replace(/\n\n/g, '</p><p>');
  }
  
  // Other UI helper functions...
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

function displaySummary(summary, metadata) {
  console.log("displaySummary called with:", summary, metadata);
  const summaryContainer = document.getElementById('summary-container');
  if (summaryContainer) {
    // This is a simplified version from the original snippet, 
    // the more detailed one is inside DOMContentLoaded
    summaryContainer.innerHTML = `<h2>Summary (Placeholder)</h2><p>${summary}</p>`;
    summaryContainer.classList.add('active');
  }
}

function initializeChat(summary, metadata) {
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

function formatDuration(duration) {
    console.log("formatDuration called with:", duration);
    if (!duration || typeof duration !== 'number') return "N/A";
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function formatSummaryWithTimestamps(summary, contentType) {
    console.log("formatSummaryWithTimestamps called for:", contentType);
    // Basic formatting, actual timestamp linking will come later
    // This is a simplified version from the original snippet, 
    // the more detailed one is inside DOMContentLoaded
    return `<p>${summary.replace(/\n\n/g, '</p><p>')}</p>`;
}

// Add this function to popup.js
function convertTimestampToSeconds(timestamp) {
  if (!timestamp) return 0;
  const parts = timestamp.split(':').map(Number);

  if (parts.some(isNaN)) {
    console.warn("Invalid characters in timestamp parts:", timestamp);
    return 0;
  }
  
  if (parts.length === 3) { // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) { // MM:SS
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) { // SS
    return parts[0];
  }
  console.warn("Invalid timestamp format for conversion:", timestamp);
  return 0;
}

// Add this function in popup.js
function attachTimestampClickListenersInPopup() {
  const summaryContainer = document.getElementById('summary-container');
  if (!summaryContainer) return;

  // The popup's formatSummaryWithTimestamps uses class="timestamp"
  const timestampLinks = summaryContainer.querySelectorAll('a.timestamp');
  timestampLinks.forEach(link => {
    const newLink = link.cloneNode(true); // Re-clone for clean listeners
    link.parentNode.replaceChild(newLink, link);

    newLink.addEventListener('click', (e) => {
      e.preventDefault();
      const timestampStr = newLink.dataset.time;
      const seconds = convertTimestampToSeconds(timestampStr);

      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'navigateVideo',
            time: seconds
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error("Error sending navigateVideo message from popup:", chrome.runtime.lastError.message);
            } else {
              console.log("Popup navigateVideo message sent, response:", response);
            }
          });
        } else {
          console.error("Could not get active tab ID from popup for navigateVideo.");
        }
      });
    });
  });
}