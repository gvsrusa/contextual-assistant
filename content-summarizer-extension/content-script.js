// content-script.js
let contentDetector, contentExtractor, summarizerEngine;
let currentSummary = null;
let currentMetadata = null;
// Add a variable to track sidebar state
let sidebarInjected = false;
let sidebarElement = null;

// Initialize components when page loads
window.addEventListener('load', () => {
  // Initialize content processing components
  contentDetector = new ContentDetector();
  contentExtractor = new ContentExtractor();
  
  // Check current user settings and initialize LLM provider
  chrome.storage.sync.get(['llmProvider', 'apiKey', 'model'], (settings) => {
    const provider = LLMProviderFactory.create(
      settings.llmProvider || 'openai',
      settings.apiKey || '',
      { model: settings.model }
    );
    
    summarizerEngine = new SummarizerEngine(provider);
  });
  
  // Add floating action button if appropriate
  addFloatingActionButton();
});

// Modify existing message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'summarize') {
    handleSummarizeRequest(request.options, sendResponse);
    return true; // Keep channel open for async response
  } else if (request.action === 'toggleSidebar') {
    if (sidebarInjected && sidebarElement) {
      sidebarElement.remove();
      sidebarElement = null;
      sidebarInjected = false;
      sendResponse({status: "Sidebar removed"});
    } else {
      chrome.storage.sync.get(['uiTheme', 'uiPosition', 'includeTimestamps'], (settings) => {
        const sidebarHTML = createSidebarHTML(settings);
        sidebarElement = document.createElement('div');
        sidebarElement.innerHTML = sidebarHTML;
        document.body.appendChild(sidebarElement.firstChild); // Appends the actual sidebar div, not the wrapper
        sidebarInjected = true;
        // Add basic close/minimize functionality
        const actualSidebarDOM = document.getElementById('content-summarizer-sidebar');
        if (actualSidebarDOM) {
            const minimizeBtn = actualSidebarDOM.querySelector('#cs-minimize-btn');
            if (minimizeBtn) {
                minimizeBtn.addEventListener('click', () => {
                    // For now, just log. True minimization is more complex.
                    console.log("Minimize sidebar clicked");
                    actualSidebarDOM.style.display = actualSidebarDOM.style.display === 'none' ? 'flex' : 'none';
                });
            }

            // Add Tab Switching Logic
            const tabButtons = actualSidebarDOM.querySelectorAll('.cs-tab-btn');
            const tabContents = actualSidebarDOM.querySelectorAll('.cs-tab-content');

            tabButtons.forEach(button => {
              button.addEventListener('click', () => {
                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // Add active class to clicked button and corresponding content
                button.classList.add('active');
                const tabId = button.dataset.tab;
                const activeContent = actualSidebarDOM.querySelector(`#cs-${tabId}-tab`);
                if (activeContent) {
                  activeContent.classList.add('active');
                }
                console.log(`Switched to tab: ${tabId}`);
              });
            });

            // "Open Full Settings" button in sidebar's Options tab
            const openFullSettingsBtn = actualSidebarDOM.querySelector('#cs-open-settings');
            if (openFullSettingsBtn) {
              openFullSettingsBtn.addEventListener('click', () => {
                chrome.runtime.sendMessage({ action: 'openOptionsPage' });
              });
            }

            const csIncludeTimestamps = actualSidebarDOM.querySelector('#cs-include-timestamps');
            const csUiTheme = actualSidebarDOM.querySelector('#cs-ui-theme');

            // Load initial quick settings values and set up listeners
            chrome.storage.sync.get(['includeTimestamps', 'uiTheme'], (settings) => {
              if (csIncludeTimestamps) {
                csIncludeTimestamps.checked = settings.includeTimestamps !== undefined ? settings.includeTimestamps : true; // Default to true
                
                csIncludeTimestamps.addEventListener('change', (event) => {
                  const newIncludeTimestamps = event.target.checked;
                  console.log("Sidebar Quick Setting: Include Timestamps changed to", newIncludeTimestamps);
                  chrome.storage.sync.set({ includeTimestamps: newIncludeTimestamps });
                  // This setting will be read by SummarizerEngine when a summary is generated.
                });
              }

              if (csUiTheme) {
                const currentTheme = settings.uiTheme || 'light'; // Default to light
                csUiTheme.value = currentTheme;
                // Apply initial theme to sidebar (if not already applied by createSidebarHTML)
                actualSidebarDOM.classList.remove('light', 'dark', 'system');
                if (currentTheme === 'system') {
                    // For 'system', determine if OS is dark or light and apply accordingly
                    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                    actualSidebarDOM.classList.add(prefersDark ? 'dark' : 'light');
                } else {
                    actualSidebarDOM.classList.add(currentTheme);
                }

                csUiTheme.addEventListener('change', (event) => {
                  const newTheme = event.target.value;
                  console.log("Sidebar Quick Setting: UI Theme changed to", newTheme);
                  chrome.storage.sync.set({ uiTheme: newTheme });
                  
                  // Dynamically update sidebar theme
                  actualSidebarDOM.classList.remove('light', 'dark', 'system'); // Remove all theme classes
                   if (newTheme === 'system') {
                    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                    actualSidebarDOM.classList.add(prefersDark ? 'dark' : 'light');
                  } else {
                    actualSidebarDOM.classList.add(newTheme);
                  }
                });
              }
            });
            
            // Listener for system theme changes if 'system' is selected
            const systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const systemThemeChangeListener = (e) => {
                if (csUiTheme && csUiTheme.value === 'system' && actualSidebarDOM) {
                    actualSidebarDOM.classList.remove('light', 'dark');
                    actualSidebarDOM.classList.add(e.matches ? 'dark' : 'light');
                    console.log("System theme changed, sidebar updated to:", e.matches ? 'dark' : 'light');
                }
            };
            systemThemeMediaQuery.addEventListener('change', systemThemeChangeListener);
            
            // Make sure to remove the listener when the sidebar is closed to prevent memory leaks.
            // This can be done in the closeBtn event listener or when sidebarElement is removed.
            // For example, when sidebarElement is set to null:
            // (This part needs to be integrated into the existing close logic)
            // if (closeBtn) {
            //   closeBtn.addEventListener('click', () => {
            //     actualSidebarDOM.remove();
            //     sidebarElement = null;
            //     sidebarInjected = false;
            //     systemThemeMediaQuery.removeEventListener('change', systemThemeChangeListener); // Remove listener
            //   });
            // }
            // The above listener removal should be tied to the actual sidebar removal logic.
            // Let's refine the close button logic to include this:

            const closeBtn = actualSidebarDOM.querySelector('#cs-close-btn');
            if (closeBtn) {
                // Check if a listener already exists to avoid duplicates if toggleSidebar is called multiple times
                // A more robust way is to manage listeners more centrally or ensure this part of code runs once per sidebar instance.
                // For now, we'll assume it's okay or the previous approach of replacing the node handles it.
                // However, for media query listeners, explicit removal is good.
                const newCloseBtn = closeBtn.cloneNode(true); // Re-cloning to ensure clean listeners if this block runs multiple times
                closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

                newCloseBtn.addEventListener('click', () => {
                    if (actualSidebarDOM) actualSidebarDOM.remove(); // Use actualSidebarDOM directly
                    sidebarElement = null;
                    sidebarInjected = false;
                    systemThemeMediaQuery.removeEventListener('change', systemThemeChangeListener); // Remove listener
                    console.log("Sidebar closed, system theme listener removed.");
                });
            }

            const summaryLengthSelect = actualSidebarDOM.querySelector('#cs-summary-length');
            const regenerateSummaryBtn = actualSidebarDOM.querySelector('#cs-regenerate-btn');
            const summaryContainerInSidebar = actualSidebarDOM.querySelector('#cs-summary-container');

            // Function to display summary in the sidebar (similar to updateInPageSummary but for sidebar elements)
            function displaySummaryInSidebar(summary, metadata) {
              if (summaryContainerInSidebar) {
                let summaryHTML = `
                  <h4>${metadata.title || 'Summary'}</h4>
                  <div class="cs-metadata">
                    ${metadata.author ? `<span>By: ${metadata.author}</span>` : ''}
                    ${metadata.type === 'video' && metadata.duration ? `<span>Duration: ${formatDuration(metadata.duration)}</span>` : ''}
                  </div>
                  <div class="cs-summary-content">
                    ${formatSummaryWithTimestamps(summary, metadata.type)}
                  </div>
                `;
                summaryContainerInSidebar.innerHTML = summaryHTML;
                // Attach timestamp handlers if needed (will be a separate task if complex)
                attachTimestampHandlersToSidebar(); // Call a function to attach handlers
              }
            }
            
            // Function to show loading state in sidebar summary container
            function showLoadingInSidebarSummary() {
                if (summaryContainerInSidebar) {
                    summaryContainerInSidebar.innerHTML = `<div class="cs-loading"><div class="cs-spinner"></div><p>Generating summary...</p></div>`;
                }
            }

            // Function to show error in sidebar summary container
            function showErrorInSidebarSummary(errorMsg) {
                if (summaryContainerInSidebar) {
                    summaryContainerInSidebar.innerHTML = `<div class="cs-error-message">Error: ${errorMsg}</div>`;
                }
            }


            // Event listener for the "Generate Summary" button in the sidebar
            if (regenerateSummaryBtn && summaryLengthSelect) {
              regenerateSummaryBtn.addEventListener('click', () => {
                const selectedLength = summaryLengthSelect.value;
                showLoadingInSidebarSummary(); // Show loading state in sidebar

                // Call the existing handleSummarizeRequest, but adapt its response handling
                // to update the sidebar instead of the separate in-page summary container or popup.
                handleSummarizeRequest({ length: selectedLength }, (response) => {
                  if (response && response.success && response.summary && response.metadata) {
                    displaySummaryInSidebar(response.summary, response.metadata);
                    // Also save to local storage so chat tab can use it
                    chrome.storage.local.set({
                      currentSummary: response.summary,
                      contentMetadata: response.metadata
                    });
                  } else {
                    showErrorInSidebarSummary( (response && response.error) ? response.error : 'Failed to generate summary.');
                  }
                });
              });
            }

            // Populate sidebar summary if a summary already exists (e.g., from popup or FAB)
            chrome.storage.local.get(['currentSummary', 'contentMetadata'], (data) => {
              if (data.currentSummary && data.contentMetadata && summaryContainerInSidebar) {
                displaySummaryInSidebar(data.currentSummary, data.contentMetadata);
                // Set the summary length dropdown to reflect the length of the current summary if possible,
                // or default to medium. This is a UX improvement, can be basic for now.
                // For simplicity, we'll just ensure the button is enabled.
                if (summaryLengthSelect) {
                    // Try to guess length or default
                    // This part is tricky without knowing how length was stored or inferred.
                    // For now, just ensure it's enabled.
                }
              } else if (summaryContainerInSidebar) {
                // Initial state if no summary is loaded yet
                summaryContainerInSidebar.innerHTML = `<div class="cs-loading"><div class="cs-spinner"></div><p>Select options and click Generate Summary, or summarize via popup/FAB.</p></div>`;
              }
            });
const chatMessagesContainer = actualSidebarDOM.querySelector('#cs-chat-messages');
            const chatInput = actualSidebarDOM.querySelector('#cs-chat-input');
            const chatSendBtn = actualSidebarDOM.querySelector('#cs-chat-send-btn');

            // Function to append a message to the sidebar chat UI
            function appendMessageToSidebarChat(role, text) {
              if (chatMessagesContainer) {
                const messageDiv = document.createElement('div');
                messageDiv.classList.add('cs-chat-message', `cs-${role}-message`);
                // Sanitize text before adding as HTML, or use textContent if no HTML is needed in messages
                messageDiv.textContent = text; // Using textContent for safety
                chatMessagesContainer.appendChild(messageDiv);
                chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight; // Scroll to bottom
              }
            }
            
            // Function to handle sending a chat message from the sidebar
            async function handleSidebarChatSend() {
              if (!chatInput || !chatSendBtn || !chatMessagesContainer) return;

              const messageText = chatInput.value.trim();
              if (messageText === '') return;

              appendMessageToSidebarChat('user', messageText);
              chatInput.value = ''; // Clear input
              chatSendBtn.disabled = true; // Disable send button while waiting
              appendMessageToSidebarChat('system', 'Thinking...'); // Typing indicator

              try {
                // Send message to background.js for processing with ChatEngine
                const response = await new Promise((resolve, reject) => {
                  chrome.runtime.sendMessage({ action: 'chat', message: messageText }, (response) => {
                    if (chrome.runtime.lastError) {
                      reject(new Error(chrome.runtime.lastError.message));
                    } else if (response && response.error) {
                      reject(new Error(response.error));
                    } else {
                      resolve(response);
                    }
                  });
                });
                
                // Remove "Thinking..." indicator
                const thinkingIndicator = chatMessagesContainer.querySelector('.cs-system-message:last-child');
                if (thinkingIndicator && thinkingIndicator.textContent === 'Thinking...') {
                    thinkingIndicator.remove();
                }

                if (response && response.reply) {
                  appendMessageToSidebarChat('assistant', response.reply);
                } else {
                  appendMessageToSidebarChat('system', 'No reply received or an unknown error occurred.');
                }
              } catch (error) {
                console.error("Error sending chat message from sidebar:", error);
                 // Remove "Thinking..." indicator
                const thinkingIndicator = chatMessagesContainer.querySelector('.cs-system-message:last-child');
                if (thinkingIndicator && thinkingIndicator.textContent === 'Thinking...') {
                    thinkingIndicator.remove();
                }
                appendMessageToSidebarChat('system', `Error: ${error.message}`);
              } finally {
                chatSendBtn.disabled = false; // Re-enable send button
                chatInput.focus();
              }
            }

            // Event listeners for chat input and send button in the sidebar
            if (chatInput && chatSendBtn) {
              chatInput.addEventListener('input', () => {
                // Enable send button only if there's text
                chatSendBtn.disabled = chatInput.value.trim() === '';
              });

              chatInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault(); // Prevent new line on Enter
                  handleSidebarChatSend();
                }
              });

              chatSendBtn.addEventListener('click', handleSidebarChatSend);
            }
            
            // When the sidebar is opened, check if a summary exists to enable chat
            // This relies on the summary being saved to chrome.storage.local by the summary tab or popup
            chrome.storage.local.get(['currentSummary'], (data) => {
                if (data.currentSummary && chatInput && chatSendBtn) {
                    chatInput.disabled = false;
                    // chatSendBtn is handled by input listener
                    if (chatMessagesContainer && chatMessagesContainer.children.length <=1) { // only if it has the initial system message or is empty
                         const initialSystemMessage = chatMessagesContainer.querySelector('.cs-system-message');
                         if(initialSystemMessage) initialSystemMessage.textContent = "Summary loaded. Ask questions about the content.";
                         else appendMessageToSidebarChat('system', "Summary loaded. Ask questions about the content.");
                    }
                } else if (chatInput) {
                    chatInput.disabled = true;
                    if (chatMessagesContainer && chatMessagesContainer.children.length <=1) {
                         const initialSystemMessage = chatMessagesContainer.querySelector('.cs-system-message');
                         if(initialSystemMessage) initialSystemMessage.textContent = "Please generate a summary first to enable chat.";
                         else appendMessageToSidebarChat('system', "Please generate a summary first to enable chat.");
                    }
                }
            });

            // Listen for storage changes to enable/disable chat if summary becomes available/unavailable
            // (e.g. if summary is generated in popup while sidebar is open)
            chrome.storage.onChanged.addListener((changes, namespace) => {
              if (namespace === 'local' && (changes.currentSummary || changes.contentMetadata)) {
                if (sidebarInjected && actualSidebarDOM) { // Check if sidebar is currently active
                  chrome.storage.local.get(['currentSummary', 'contentMetadata'], (data) => {
                    if (data.currentSummary && chatInput && chatSendBtn) {
                      chatInput.disabled = false;
                      if (chatMessagesContainer) {
                          const initialSystemMessage = chatMessagesContainer.querySelector('.cs-system-message');
                          if(initialSystemMessage && initialSystemMessage.textContent.includes("Please generate a summary first")) {
                             initialSystemMessage.textContent = "Summary (re)loaded. Ask questions about the content.";
                          }
                      }
                      // Reset chat engine in background script because context (summary) changed
                      chrome.runtime.sendMessage({ action: 'resetChatEngine' });

                    } else if (chatInput) {
                      chatInput.disabled = true;
                       if (chatMessagesContainer) {
                          const initialSystemMessage = chatMessagesContainer.querySelector('.cs-system-message');
                          if(initialSystemMessage) initialSystemMessage.textContent = "Summary not available. Please generate a summary first.";
                      }
                    }
                  });
                }
              }
            });
        }
        sendResponse({status: "Sidebar injected"});
      });
    }
    return true; // Indicate async response for settings fetch
  } else if (request.action === 'navigateVideo') {
    if (typeof handleVideoNavigation === 'function') {
        handleVideoNavigation(request.time);
        sendResponse({status: "Navigation attempted in content script"});
    } else {
        console.warn("handleVideoNavigation function not defined yet in content script.");
        sendResponse({status: "Navigation handler not ready in content script", error: "handleVideoNavigation not defined"});
    }
    return false; // Can be false as handleVideoNavigation is synchronous
  }
  // Ensure other message types are handled or ignored gracefully
});

async function handleSummarizeRequest(options, sendResponse) {
  try {
    // Detect content type
    const contentType = contentDetector.detect(window.location.href);
    
    // Extract content
    const content = await contentExtractor.extract(contentType);
    
    // Generate summary
    const summary = await summarizerEngine.summarize(content, options);
    
    // Store for later use
    currentSummary = summary;
    currentMetadata = {
      title: content.title,
      author: content.author,
      type: content.type,
      duration: content.duration,
      url: content.url
    };
    
    // Send response back to popup
    sendResponse({
      success: true,
      summary,
      metadata: currentMetadata
    });
    
  } catch (error) {
    console.error('Summarization failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Add createSidebarHTML(settings) function here (from lines 345-436 of the architecture doc)
function createSidebarHTML(settings) {
  // Default theme if not provided or invalid
  const theme = settings && ['light', 'dark', 'system'].includes(settings.uiTheme) ? settings.uiTheme : 'light';
  // Default position if not provided or invalid
  const position = settings && ['left', 'right'].includes(settings.uiPosition) ? settings.uiPosition : 'right'; // 'float' needs more complex handling for a later task

  return `
    <div class="cs-sidebar ${theme}" id="content-summarizer-sidebar" style="${position}: 0;">
      <div class="cs-sidebar-header">
        <h2>Content Summarizer</h2>
        <div class="cs-sidebar-controls">
          <button id="cs-minimize-btn" title="Minimize">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline>
              <line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </button>
          <button id="cs-close-btn" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="cs-sidebar-tabs">
        <button class="cs-tab-btn active" data-tab="summary">Summary</button>
        <button class="cs-tab-btn" data-tab="chat">Chat</button>
        <button class="cs-tab-btn" data-tab="settings">Options</button>
      </div>
      <div class="cs-sidebar-content">
        <div class="cs-tab-content active" id="cs-summary-tab">
          <div class="cs-summary-options">
            <select id="cs-summary-length">
              <option value="short">Short Summary</option>
              <option value="medium" selected>Medium Summary</option>
              <option value="long">Detailed Summary</option>
            </select>
            <button id="cs-regenerate-btn" class="cs-btn cs-primary-btn">Generate Summary</button>
          </div>
          <div id="cs-summary-container"><div class="cs-loading"><div class="cs-spinner"></div><p>Select options and click Generate Summary</p></div></div>
        </div>
        <div class="cs-tab-content" id="cs-chat-tab">
          <div id="cs-chat-messages"><div class="cs-chat-message cs-system-message">Ask questions about the content.</div></div>
          <div class="cs-chat-input-container">
            <textarea id="cs-chat-input" placeholder="Ask about the content..." rows="2"></textarea>
            <button id="cs-chat-send-btn" class="cs-btn cs-primary-btn" disabled>Send</button>
          </div>
        </div>
        <div class="cs-tab-content" id="cs-settings-tab">
          <div class="cs-quick-settings">
            <h3>Quick Settings</h3>
            <div class="cs-setting-item">
              <label for="cs-include-timestamps">Include timestamps</label>
              <input type="checkbox" id="cs-include-timestamps" ${settings.includeTimestamps !== false ? 'checked' : ''}>
            </div>
            <div class="cs-setting-item">
              <label for="cs-ui-theme">Theme</label>
              <select id="cs-ui-theme">
                <option value="light" ${settings.uiTheme === 'light' ? 'selected' : ''}>Light</option>
                <option value="dark" ${settings.uiTheme === 'dark' ? 'selected' : ''}>Dark</option>
                <option value="system" ${settings.uiTheme === 'system' ? 'selected' : ''}>System</option>
              </select>
            </div>
            <button id="cs-open-settings" class="cs-btn cs-secondary-btn">Open Full Settings</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function addFloatingActionButton() {
  // Only add if we're on a supported content type
  // Ensure contentDetector is initialized before calling detect
  if (!contentDetector) {
    console.warn("ContentDetector not initialized yet in addFloatingActionButton");
    // Optionally, retry after a short delay or ensure initialization order
    setTimeout(addFloatingActionButton, 100); // Retry after 100ms
    return;
  }
  const contentType = contentDetector.detect(window.location.href);
  if (contentType === 'unknown') return;
  
  // Create button element
  const button = document.createElement('div');
  button.className = 'content-summarizer-fab';
  button.innerHTML = 'S'; // Placeholder for Summarize icon
  button.title = 'Summarize Content';
  
  // Add click handler
  button.addEventListener('click', () => {
    // Show in-page summary interface
    showInPageSummaryInterface();
  });
  
  // Append to body
  document.body.appendChild(button);
}

function showInPageSummaryInterface() {
  // Create UI container
  const container = document.createElement('div');
  container.className = 'content-summarizer-container';
  
  // Add loading state initially
  container.innerHTML = `
    <div class="content-summarizer-header">
      <h2>Content Summary</h2>
      <button class="content-summarizer-close">×</button>
    </div>
    <div class="content-summarizer-body">
      <div class="content-summarizer-loading">
        Analyzing content and generating summary...
      </div>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(container);
  
  // Add close handler
  container.querySelector('.content-summarizer-close').addEventListener('click', () => {
    container.remove();
  });
  
  // Start summarization process
  handleSummarizeRequest({ length: 'medium' }, (response) => {
    if (response.success) {
      updateInPageSummary(container, response.summary, response.metadata);
    } else {
      showSummaryError(container, response.error);
    }
  });
}

// Add these stubs at the end of content-script.js or in a logical place

function updateInPageSummary(container, summary, metadata) {
  console.log("updateInPageSummary called with:", metadata, summary);
  const body = container.querySelector('.content-summarizer-body');
  if (body) {
    body.innerHTML = `
      <h3>${metadata.title || 'Summary'}</h3>
      <div class="metadata">
        ${metadata.author ? `<span>By: ${metadata.author}</span>` : ''}
        ${metadata.type === 'video' && metadata.duration ? `<span>Duration: ${metadata.duration}s</span>` : ''}
      </div>
      <div class="summary-content" style="white-space: pre-wrap;">${summary}</div>
    `;
  }
}

function showSummaryError(container, error) {
  console.error("showSummaryError called with:", error);
  const body = container.querySelector('.content-summarizer-body');
  if (body) {
    body.innerHTML = `<div class="content-summarizer-error">Error: ${error}</div>`;
  }
}
// Other UI helper functions...

// Ensure these functions are defined in content-script.js scope
// (They might have been added as stubs in popup.js previously,
//  but content-script.js needs its own versions or access to shared utility functions)

function formatDuration(totalSeconds) {
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds)) return "N/A";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  let formatted = "";
  if (hours > 0) {
    formatted += `${hours}:`;
  }
  formatted += `${minutes < 10 && hours > 0 ? '0' : ''}${minutes}:`;
  formatted += `${seconds < 10 ? '0' : ''}${seconds}`;
  return formatted;
}

function formatSummaryWithTimestamps(summary, contentType) {
  // Basic formatting, actual timestamp linking will come later in a dedicated task
  let formattedSummary = summary.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  if (contentType === 'video' || contentType === 'audio') {
    // Simple regex for placeholder, real implementation will be more robust
    formattedSummary = formattedSummary.replace(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g, (match, timestamp) => {
      return `<a href="#" class="cs-timestamp-link" data-time="${timestamp}">${match}</a>`;
    });
  }
  return `<p>${formattedSummary}</p>`;
}

// Add or ensure this function exists in content-script.js
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

// Refine this existing function in content-script.js
function attachTimestampHandlersToSidebar() {
    const actualSidebarDOM = document.getElementById('content-summarizer-sidebar');
    if (!actualSidebarDOM) return;

    const timestampLinks = actualSidebarDOM.querySelectorAll('.cs-timestamp-link');
    timestampLinks.forEach(link => {
        const newLink = link.cloneNode(true); // Re-clone to ensure clean listeners
        link.parentNode.replaceChild(newLink, link);

        newLink.addEventListener('click', (e) => {
            e.preventDefault();
            const timestampStr = newLink.dataset.time;
            const seconds = convertTimestampToSeconds(timestampStr); // Use the refined function
            
            if (typeof handleVideoNavigation === 'function') {
                handleVideoNavigation(seconds);
            } else {
                console.warn("handleVideoNavigation not defined in content-script.js for sidebar timestamps.");
            }
        });
    });
}

// Ensure handleVideoNavigation(timeInSeconds) is robust
// The version from lines 488-499 of the architecture document is good.
// (It was added in a previous step and should be largely fine).
function handleVideoNavigation(timeInSeconds) {
    console.log(`Attempting to navigate video to ${timeInSeconds}s`);
    // Basic YouTube handler
    if (window.location.href.includes('youtube.com')) {
        const video = document.querySelector('video.html5-main-video'); // More specific selector for YouTube
        if (video) {
            video.currentTime = timeInSeconds;
            if (video.paused) { // Only play if it was paused
                video.play();
            }
            console.log(`YouTube video time set to ${timeInSeconds}s`);
            // Attempt to scroll to the player if it's not in view
            video.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            console.warn("YouTube video element not found for navigation.");
        }
    }
    // Add other platform handlers like Vimeo, etc.
    // else if (window.location.href.includes('vimeo.com')) { ... }
    else {
        console.log("Video navigation not implemented for this site. Trying generic approach.");
        const videos = document.querySelectorAll('video');
        if (videos.length > 0) {
            // Try to control the first video element found
            const video = videos[0];
            video.currentTime = timeInSeconds;
            if (video.paused) {
                video.play();
            }
            video.scrollIntoView({ behavior: 'smooth', block: 'center' });
            console.log(`Generic video time set to ${timeInSeconds}s for the first video element found.`);
        } else {
            console.warn("No video element found on the page for generic navigation.");
        }
    }
}