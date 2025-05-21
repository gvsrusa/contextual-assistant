// sidebarManager.js: Manages the creation, display, and interaction of the sidebar UI.

const SidebarManager = (() => {
  let sidebarInjected = false; // Tracks if the sidebar DOM is currently injected into the page
  let sidebarElement = null;   // Holds the root DOM element of the sidebar (the wrapper div)
  let systemThemeMediaQuery = null; // Holds the MediaQueryList object for system theme changes
  let systemThemeChangeListener = null; // Holds the listener function for system theme changes
  let storageChangeListener = null; // Holds the listener function for chrome.storage.onChanged

  // Generates the HTML string for the sidebar.
  // `settings` object should contain uiTheme, uiPosition, includeTimestamps, and defaultSummaryLength.
  function createSidebarHTML(settings) {
    // Default theme if not provided or invalid
    const theme = settings && ['light', 'dark', 'system'].includes(settings.uiTheme) ? settings.uiTheme : 'light';
    // Default position if not provided or invalid
    const position = settings && ['left', 'right'].includes(settings.uiPosition) ? settings.uiPosition : 'right';

    let initialThemeClass = theme;
    if (theme === 'system') {
        initialThemeClass = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }

    return `
      <div class="cs-sidebar ${initialThemeClass}" id="content-summarizer-sidebar" style="${position === 'left' ? 'left: 0;' : 'right: 0;'}">
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
                <option value="medium">Medium Summary</option> <!-- Default selected removed -->
                <option value="long">Detailed Summary</option>
              </select>
              <button id="cs-regenerate-btn" class="cs-btn cs-primary-btn">Generate Summary</button>
            </div>
            <div id="cs-summary-container"><div class="cs-loading"><div class="cs-spinner"></div><p>Select options and click Generate Summary</p></div></div>
          </div>
          <div class="cs-tab-content" id="cs-chat-tab">
            <div id="cs-chat-messages"><div class="cs-chat-message cs-system-message">Ask questions about the content.</div></div>
            <div class="cs-chat-input-container">
              <textarea id="cs-chat-input" placeholder="Ask about the content..." rows="2" disabled></textarea>
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

  // Displays the generated summary in the sidebar's summary tab.
  // `summary`: The raw summary text.
  // `metadata`: An object containing title, author, type, duration of the content.
  // `actualSidebarDOM`: The root DOM element of the sidebar.
  function displaySummaryInSidebar(summary, metadata, actualSidebarDOM) {
    const summaryContainerInSidebar = actualSidebarDOM.querySelector('#cs-summary-container');
    if (summaryContainerInSidebar) {
      let summaryHTML = `
        <h4>${metadata.title || 'Summary'}</h4>
        <div class="cs-metadata">
          ${metadata.author ? `<span>By: ${metadata.author}</span>` : ''}
          // Uses formatDuration from contentScriptUtils.js
          ${metadata.type === 'video' && metadata.duration ? `<span>Duration: ${formatDuration(metadata.duration)}</span>` : ''}
        </div>
        <div class="cs-summary-content">
          // Uses formatSummaryWithTimestamps from contentScriptUtils.js
          ${formatSummaryWithTimestamps(summary, metadata.type)}
        </div>
      `;
      summaryContainerInSidebar.innerHTML = summaryHTML;
      // Attaches click listeners to any timestamps in the summary.
      // attachTimestampHandlersToSidebar is from contentScriptUtils.js
      attachTimestampHandlersToSidebar(); 
    }
  }
            
  // Shows a loading indicator in the sidebar's summary tab.
  function showLoadingInSidebarSummary(actualSidebarDOM) {
      const summaryContainerInSidebar = actualSidebarDOM.querySelector('#cs-summary-container');
      if (summaryContainerInSidebar) {
          summaryContainerInSidebar.innerHTML = `<div class="cs-loading"><div class="cs-spinner"></div><p>Generating summary...</p></div>`;
      }
  }

  // Displays an error message in the sidebar's summary tab.
  function showErrorInSidebarSummary(errorMsg, actualSidebarDOM) {
      const summaryContainerInSidebar = actualSidebarDOM.querySelector('#cs-summary-container');
      if (summaryContainerInSidebar) {
          let userFriendlyError = "Failed to generate summary.";
          if (typeof errorMsg === 'string') {
              const errorText = errorMsg.toLowerCase();
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
                  userFriendlyError = `Failed to generate summary: ${errorMsg}`;
              }
          } else {
              userFriendlyError = `Failed to generate summary: An unexpected error occurred.`;
          }
          summaryContainerInSidebar.innerHTML = `<div class="cs-error-message">${userFriendlyError}</div>`;
      }
  }

  // Appends a message to the sidebar's chat UI.
  // `role`: 'user', 'assistant', or 'system'.
  // `text`: The message content.
  // `actualSidebarDOM`: The root DOM element of the sidebar.
  function appendMessageToSidebarChat(role, text, actualSidebarDOM) {
    const chatMessagesContainer = actualSidebarDOM.querySelector('#cs-chat-messages');
    if (chatMessagesContainer) {
      const messageDiv = document.createElement('div');
      messageDiv.classList.add('cs-chat-message', `cs-${role}-message`);
      messageDiv.textContent = text; // Using textContent for security (prevents XSS)
      chatMessagesContainer.appendChild(messageDiv);
      chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight; // Auto-scroll to the latest message
    }
  }
            
  // Handles sending a chat message from the sidebar's chat input.
  // Interacts with the background script to get a response from the LLM.
  async function handleSidebarChatSend(actualSidebarDOM) {
    const chatInput = actualSidebarDOM.querySelector('#cs-chat-input');
    const chatSendBtn = actualSidebarDOM.querySelector('#cs-chat-send-btn');
    const chatMessagesContainer = actualSidebarDOM.querySelector('#cs-chat-messages');

    if (!chatInput || !chatSendBtn || !chatMessagesContainer) return;

    const messageText = chatInput.value.trim();
    if (messageText === '') return;

    appendMessageToSidebarChat('user', messageText, actualSidebarDOM);
    chatInput.value = '';
    chatSendBtn.disabled = true;
    appendMessageToSidebarChat('system', 'Thinking...', actualSidebarDOM);

    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'chat', message: messageText }, (res) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (res && res.error) {
            reject(new Error(res.error));
          } else {
            resolve(res);
          }
        });
      });
      
      const thinkingIndicator = chatMessagesContainer.querySelector('.cs-system-message:last-child');
      if (thinkingIndicator && thinkingIndicator.textContent === 'Thinking...') {
          thinkingIndicator.remove();
      }

      if (response && response.reply) {
        appendMessageToSidebarChat('assistant', response.reply, actualSidebarDOM);
      } else {
        appendMessageToSidebarChat('system', 'No reply received or an unknown error occurred.', actualSidebarDOM);
      }
    } catch (error) {
      console.error("Error sending chat message from sidebar:", error);
      const thinkingIndicator = chatMessagesContainer.querySelector('.cs-system-message:last-child');
      if (thinkingIndicator && thinkingIndicator.textContent === 'Thinking...') {
          thinkingIndicator.remove();
      }
      // Make chat error messages more user-friendly
      let chatError = "Chat error.";
      if (error && error.message) {
          const errorText = error.message.toLowerCase();
          if (errorText.includes("no summary available")) {
              chatError = "Chat error: No summary is available for the current page. Please summarize first.";
          } else if (errorText.includes("chat engine components are not available") || errorText.includes("llmproviderfactory") || errorText.includes("chatengine is not defined")) {
              chatError = "Chat error: Core chat components failed to initialize. Please try reloading the extension.";
          } else if (errorText.includes("api key")) {
              chatError = "Chat error: Invalid API Key for the selected LLM. Please check your settings.";
          } else if (errorText.includes("quota")) {
              chatError = "Chat error: API quota exceeded for the selected LLM.";
          } else if (error.message.startsWith("Error:")) { // Avoid "Error: Error: message"
              chatError = error.message;
          }
          else {
              chatError = `Chat error: ${error.message}`;
          }
      } else {
          chatError = "Chat error: An unknown error occurred.";
      }
      appendMessageToSidebarChat('system', chatError, actualSidebarDOM);
    } finally {
      chatSendBtn.disabled = false;
      chatInput.focus();
    }
  }

  // Main function to toggle the sidebar's visibility and set up its functionalities.
  // `sendResponseCallback`: Used to send a response back to the message sender (e.g., popup.js).
  function _handleToggleSidebar(sendResponseCallback) {
    if (sidebarInjected && sidebarElement) {
      // Sidebar exists, so remove it and clean up listeners.
      if (systemThemeMediaQuery && systemThemeChangeListener) {
          systemThemeMediaQuery.removeEventListener('change', systemThemeChangeListener);
          systemThemeMediaQuery = null;
          systemThemeChangeListener = null;
          console.log("System theme listener removed during sidebar removal.");
      }
      if (storageChangeListener && chrome.storage.onChanged.hasListener(storageChangeListener)) {
          chrome.storage.onChanged.removeListener(storageChangeListener);
          storageChangeListener = null;
          console.log("Storage change listener removed during sidebar removal.");
      }
      sidebarElement.remove(); 
      sidebarElement = null;
      sidebarInjected = false;
      sendResponseCallback({status: "Sidebar removed"});
    } else {
      // Sidebar doesn't exist, so create and inject it.
      chrome.storage.sync.get(['uiTheme', 'uiPosition', 'includeTimestamps', 'defaultSummaryLength'], (settings) => {
        const sidebarHTML = createSidebarHTML(settings); 
        sidebarElement = document.createElement('div'); 
        sidebarElement.innerHTML = sidebarHTML;
        const actualSidebarDOM = sidebarElement.firstChild; 
        document.body.appendChild(actualSidebarDOM);
        sidebarInjected = true;
        
        // ----- Setup all event listeners for the newly created sidebar -----
        const summaryLengthSelectElement = actualSidebarDOM.querySelector('#cs-summary-length');
        if (summaryLengthSelectElement && settings.defaultSummaryLength) {
            summaryLengthSelectElement.value = settings.defaultSummaryLength;
        }

        // Minimize button functionality
        const minimizeBtn = actualSidebarDOM.querySelector('#cs-minimize-btn');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                console.log("Minimize sidebar clicked");
                actualSidebarDOM.style.display = actualSidebarDOM.style.display === 'none' ? 'flex' : 'none';
            });
        }

        const tabButtons = actualSidebarDOM.querySelectorAll('.cs-tab-btn');
        const tabContents = actualSidebarDOM.querySelectorAll('.cs-tab-content');
        // Tab switching logic
        tabButtons.forEach(button => {
          button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            const tabId = button.dataset.tab;
            const activeContent = actualSidebarDOM.querySelector(`#cs-${tabId}-tab`);
            if (activeContent) activeContent.classList.add('active');
            console.log(`Sidebar: Switched to tab: ${tabId}`);
          });
        });

        // Link to open the full extension options page
        const openFullSettingsBtn = actualSidebarDOM.querySelector('#cs-open-settings');
        if (openFullSettingsBtn) {
          openFullSettingsBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'openOptionsPage' });
          });
        }

        const csIncludeTimestamps = actualSidebarDOM.querySelector('#cs-include-timestamps');
        const csUiTheme = actualSidebarDOM.querySelector('#cs-ui-theme');

        // Quick settings functionality (Include Timestamps, UI Theme)
        chrome.storage.sync.get(['includeTimestamps', 'uiTheme'], (storageSettings) => {
          if (csIncludeTimestamps) {
            csIncludeTimestamps.checked = storageSettings.includeTimestamps !== undefined ? storageSettings.includeTimestamps : true;
            csIncludeTimestamps.addEventListener('change', (event) => {
              chrome.storage.sync.set({ includeTimestamps: event.target.checked });
              // This setting is read by content-script.js when summarization is requested.
            });
          }

          if (csUiTheme) {
            const currentTheme = storageSettings.uiTheme || 'light'; // Default to light
            csUiTheme.value = currentTheme;
            // Initial theme is set by createSidebarHTML. This listener handles dynamic changes.
            csUiTheme.addEventListener('change', (event) => {
              const newTheme = event.target.value;
              chrome.storage.sync.set({ uiTheme: newTheme });
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
        
        // Listener for system theme changes (if "System" theme is selected)
        systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        systemThemeChangeListener = (e) => {
            if (csUiTheme && csUiTheme.value === 'system' && actualSidebarDOM) {
                actualSidebarDOM.classList.remove('light', 'dark');
                actualSidebarDOM.classList.add(e.matches ? 'dark' : 'light');
                console.log("Sidebar: System theme changed, sidebar updated to:", e.matches ? 'dark' : 'light');
            }
        };
        systemThemeMediaQuery.addEventListener('change', systemThemeChangeListener);

        // Close button functionality (ensures listeners are cleaned up)
        const closeBtn = actualSidebarDOM.querySelector('#cs-close-btn');
        if (closeBtn) {
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', () => {
                if (systemThemeMediaQuery && systemThemeChangeListener) {
                    systemThemeMediaQuery.removeEventListener('change', systemThemeChangeListener);
                    systemThemeMediaQuery = null;
                    systemThemeChangeListener = null;
                    console.log("System theme listener removed on close.");
                }
                if (actualSidebarDOM) actualSidebarDOM.remove();
                sidebarElement = null; // Clear the wrapper variable
                sidebarInjected = false;
            });
        }

        const summaryLengthSelect = actualSidebarDOM.querySelector('#cs-summary-length');
        const regenerateSummaryBtn = actualSidebarDOM.querySelector('#cs-regenerate-btn');
        
        // "Generate Summary" button in the summary tab
        if (regenerateSummaryBtn && summaryLengthSelect) {
          regenerateSummaryBtn.addEventListener('click', () => {
            const selectedLength = summaryLengthSelect.value;
            showLoadingInSidebarSummary(actualSidebarDOM);
            // Sends a message to contentScriptMessageHandler, which routes to handleSummarizeRequest
             chrome.runtime.sendMessage({ action: 'summarizeForSidebar', options: { length: selectedLength } }, (response) => {
                if (response && response.success && response.summary && response.metadata) {
                    displaySummaryInSidebar(response.summary, response.metadata, actualSidebarDOM);
                    // Save summary to local storage for chat tab and persistence
                    chrome.storage.local.set({
                        currentSummary: response.summary,
                        contentMetadata: response.metadata
                    });
                } else {
                    showErrorInSidebarSummary((response && response.error) ? response.error : 'Failed to generate summary.', actualSidebarDOM);
                }
            });
          });
        }

        // Populate sidebar summary tab if a summary already exists in local storage
        chrome.storage.local.get(['currentSummary', 'contentMetadata'], (data) => {
          const summaryContainerInSidebar = actualSidebarDOM.querySelector('#cs-summary-container');
          if (data.currentSummary && data.contentMetadata && summaryContainerInSidebar) {
            displaySummaryInSidebar(data.currentSummary, data.contentMetadata, actualSidebarDOM);
          } else if (summaryContainerInSidebar) { // If no summary, show initial message
            summaryContainerInSidebar.innerHTML = `<div class="cs-loading"><div class="cs-spinner"></div><p>Select options and click Generate Summary, or summarize via popup/FAB.</p></div>`;
          }
        });

        // Chat tab functionality
        const chatInput = actualSidebarDOM.querySelector('#cs-chat-input');
        const chatSendBtn = actualSidebarDOM.querySelector('#cs-chat-send-btn');
        const chatMessagesContainer = actualSidebarDOM.querySelector('#cs-chat-messages');

        if (chatInput && chatSendBtn) {
          chatInput.addEventListener('input', () => {
            chatSendBtn.disabled = chatInput.value.trim() === '';
          });
          chatInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSidebarChatSend(actualSidebarDOM);
            }
          });
          chatSendBtn.addEventListener('click', () => handleSidebarChatSend(actualSidebarDOM));
        }
        
        chrome.storage.local.get(['currentSummary'], (data) => {
            if (data.currentSummary && chatInput) {
                chatInput.disabled = false;
                if (chatMessagesContainer && chatMessagesContainer.children.length <=1) {
                     const initialSystemMessage = chatMessagesContainer.querySelector('.cs-system-message');
                     if(initialSystemMessage) initialSystemMessage.textContent = "Summary loaded. Ask questions about the content.";
                     else appendMessageToSidebarChat('system', "Summary loaded. Ask questions about the content.", actualSidebarDOM);
                }
            } else if (chatInput) {
                chatInput.disabled = true;
                 if (chatMessagesContainer && chatMessagesContainer.children.length <=1) {
                     const initialSystemMessage = chatMessagesContainer.querySelector('.cs-system-message');
                     if(initialSystemMessage) initialSystemMessage.textContent = "Please generate a summary first to enable chat.";
                     else appendMessageToSidebarChat('system', "Please generate a summary first to enable chat.", actualSidebarDOM);
                }
            }
        });

        // Listener for changes in chrome.storage (e.g., if summary is updated by popup/FAB)
        // This ensures the sidebar UI (summary tab, chat enablement) reflects the current state.
        if (storageChangeListener && chrome.storage.onChanged.hasListener(storageChangeListener)) {
             // Remove any previous listener to prevent duplicates if sidebar is rapidly toggled
            chrome.storage.onChanged.removeListener(storageChangeListener);
        }
        storageChangeListener = (changes, namespace) => {
          if (namespace === 'local' && (changes.currentSummary || changes.contentMetadata)) {
            // Check if the sidebar is currently injected and the DOM element is still part of the document
            if (sidebarInjected && actualSidebarDOM && document.body.contains(actualSidebarDOM)) { 
              console.log("Sidebar: Storage changed, updating sidebar content if necessary.");
              chrome.storage.local.get(['currentSummary', 'contentMetadata'], (data) => {
                if (data.currentSummary && data.contentMetadata) {
                    displaySummaryInSidebar(data.currentSummary, data.contentMetadata, actualSidebarDOM);
                }
                if (data.currentSummary && chatInput) {
                  chatInput.disabled = false;
                  const currentMessages = actualSidebarDOM.querySelector('#cs-chat-messages');
                  if (currentMessages) {
                      const initialSystemMessage = currentMessages.querySelector('.cs-system-message');
                      if(initialSystemMessage && initialSystemMessage.textContent.includes("Please generate a summary first")) {
                         initialSystemMessage.textContent = "Summary (re)loaded. Ask questions about the content.";
                      }
                  }
                  chrome.runtime.sendMessage({ action: 'resetChatEngine' });
                } else if (chatInput) {
                  chatInput.disabled = true;
                   const currentMessages = actualSidebarDOM.querySelector('#cs-chat-messages');
                   if (currentMessages) {
                      const initialSystemMessage = currentMessages.querySelector('.cs-system-message');
                      if(initialSystemMessage) initialSystemMessage.textContent = "Summary not available. Please generate a summary first.";
                  }
                }
              });
            }
          }
        });
        sendResponseCallback({status: "Sidebar injected"});
      });
    }
  }

  // Public API
  return {
    toggle: _handleToggleSidebar
    // No other methods need to be exposed for now.
    // `handleSummarizeRequest` will be invoked via a message from sidebarManager to content-script.
  };
})();
