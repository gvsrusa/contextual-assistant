## Settings and Options Page

### Options Page HTML

```html
<!-- options.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Content Summarizer Settings</title>
  <link rel="stylesheet" href="options.css">
</head>
<body>
  <div class="container">
    <h1>Content Summarizer Settings</h1>
    
    <div class="settings-section">
      <h2>LLM Provider Configuration</h2>
      
      <div class="form-group">
        <label for="llm-provider">LLM Provider:</label>
        <select id="llm-provider">
          <option value="openai">OpenAI (GPT)</option>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="google">Google (Gemini)</option>
          <option value="local">Local LLM</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="api-key">API Key:</label>
        <input type="password" id="api-key" placeholder="Enter your API key">
        <small>Your API key is stored securely and only used for communication with the selected LLM provider.</small>
      </div>
      
      <div class="form-group" id="model-selection-container">
        <label for="model-selection">Model:</label>
        <select id="model-selection">
          <!-- This will be populated based on selected provider -->
        </select>
      </div>
      
      <div class="form-group" id="local-llm-container" style="display: none;">
        <label for="local-llm-url">Local LLM URL:</label>
        <input type="text" id="local-llm-url" placeholder="http://localhost:1234">
      </div>
    </div>
    
    <div class="settings-section">
      <h2>Summarization Options</h2>
      
      <div class="form-group">
        <label for="default-summary-length">Default Summary Length:</label>
        <select id="default-summary-length">
          <option value="short">Short (2-3 paragraphs)</option>
          <option value="medium" selected>Medium (4-6 paragraphs)</option>
          <option value="long">Long (7-10 paragraphs)</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="include-timestamps">Include Timestamps:</label>
        <input type="checkbox" id="include-timestamps" checked>
        <span>Include timestamps in video/audio summaries</span>
      </div>
      
      <div class="form-group">
        <label for="auto-summarize">Auto-Summarize:</label>
        <input type="checkbox" id="auto-summarize">
        <span>Automatically summarize supported content when page loads</span>
      </div>
    </div>
    
    <div class="settings-section">
      <h2>UI Options</h2>
      
      <div class="form-group">
        <label for="ui-position">UI Position:</label>
        <select id="ui-position">
          <option value="right">Right side</option>
          <option value="left">Left side</option>
          <option value="float">Floating (draggable)</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="ui-theme">UI Theme:</label>
        <select id="ui-theme">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">Match System Theme</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="show-fab">Show Quick Access Button:</label>
        <input type="checkbox" id="show-fab" checked>
        <span>Show floating action button on supported pages</span>
      </div>
    </div>
    
    <div class="button-row">
      <button id="save-btn" class="primary">Save Settings</button>
      <button id="reset-btn">Reset to Defaults</button>
    </div>
    
    <div id="status-message"></div>
  </div>
  <script src="options.js"></script>
</body>
</html>
```

### Options Page JavaScript

```javascript
// options.js
document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const llmProviderSelect = document.getElementById('llm-provider');
  const apiKeyInput = document.getElementById('api-key');
  const modelSelectionSelect = document.getElementById('model-selection');
  const localLlmContainer = document.getElementById('local-llm-container');
  const localLlmUrlInput = document.getElementById('local-llm-url');
  const defaultSummaryLengthSelect = document.getElementById('default-summary-length');
  const includeTimestampsCheckbox = document.getElementById('include-timestamps');
  const autoSummarizeCheckbox = document.getElementById('auto-summarize');
  const uiPositionSelect = document.getElementById('ui-position');
  const uiThemeSelect = document.getElementById('ui-theme');
  const showFabCheckbox = document.getElementById('show-fab');
  const saveButton = document.getElementById('save-btn');
  const resetButton = document.getElementById('reset-btn');
  const statusMessage = document.getElementById('status-message');
  
  // Model options per provider
  const modelOptions = {
    openai: [
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
    ],
    anthropic: [
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
    ],
    google: [
      { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' },
      { value: 'gemini-1.0-ultra', label: 'Gemini 1.0 Ultra' }
    ],
    local: [
      { value: 'custom', label: 'Custom Model' }
    ]
  };
  
  // Load saved settings
  loadSettings();
  
  // Event listeners
  llmProviderSelect.addEventListener('change', updateModelOptions);
  saveButton.addEventListener('click', saveSettings);
  resetButton.addEventListener('click', resetSettings);
  
  function updateModelOptions() {
    const provider = llmProviderSelect.value;
    
    // Clear current options
    modelSelectionSelect.innerHTML = '';
    
    // Add options for selected provider
    modelOptions[provider].forEach(model => {
      const option = document.createElement('option');
      option.value = model.value;
      option.textContent = model.label;
      modelSelectionSelect.appendChild(option);
    });
    
    // Show/hide local LLM fields
    localLlmContainer.style.display = provider === 'local' ? 'block' : 'none';
  }
  
  function loadSettings() {
    chrome.storage.sync.get({
      // Default values
      llmProvider: 'openai',
      apiKey: '',
      model: 'gpt-4',
      localLlmUrl: 'http://localhost:1234',
      defaultSummaryLength: 'medium',
      includeTimestamps: true,
      autoSummarize: false,
      uiPosition: 'right',
      uiTheme: 'light',
      showFab: true
    }, function(items) {
      // Set form values
      llmProviderSelect.value = items.llmProvider;
      apiKeyInput.value = items.apiKey;
      updateModelOptions(); // Update model options before setting selected model
      modelSelectionSelect.value = items.model;
      localLlmUrlInput.value = items.localLlmUrl;
      defaultSummaryLengthSelect.value = items.defaultSummaryLength;
      includeTimestampsCheckbox.checked = items.includeTimestamps;
      autoSummarizeCheckbox.checked = items.autoSummarize;
      uiPositionSelect.value = items.uiPosition;
      uiThemeSelect.value = items.uiTheme;
      showFabCheckbox.checked = items.showFab;
      
      // Update visibility based on provider
      localLlmContainer.style.display = items.llmProvider === 'local' ? 'block' : 'none';
    });
  }
  
  function saveSettings() {
    chrome.storage.sync.set({
      llmProvider: llmProviderSelect.value,
      apiKey: apiKeyInput.value,
      model: modelSelectionSelect.value,
      localLlmUrl: localLlmUrlInput.value,
      defaultSummaryLength: defaultSummaryLengthSelect.value,
      includeTimestamps: includeTimestampsCheckbox.checked,
      autoSummarize: autoSummarizeCheckbox.checked,
      uiPosition: uiPositionSelect.value,
      uiTheme: uiThemeSelect.value,
      showFab: showFabCheckbox.checked
    }, function() {
      // Show success message
      statusMessage.textContent = 'Settings saved.';
      statusMessage.classList.add('success');
      
      // Clear message after a delay
      setTimeout(function() {
        statusMessage.textContent = '';
        statusMessage.classList.remove('success');
      }, 3000);
    });
  }
  
  function resetSettings() {
    // Confirm reset
    if (confirm('Reset all settings to defaults?')) {
      chrome.storage.sync.clear(function() {
        loadSettings();
        statusMessage.textContent = 'Settings reset to defaults.';
        statusMessage.classList.add('success');
        
        setTimeout(function() {
          statusMessage.textContent = '';
          statusMessage.classList.remove('success');
        }, 3000);
      });
    }
  }
});
```

## User Interface Design

### Popup UI

The extension popup provides a compact interface for quickly summarizing content and launching the chat feature.

#### Popup HTML

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Content Summarizer</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <header class="popup-header">
      <h1>Content Summarizer</h1>
      <div class="actions">
        <button id="settings-btn" title="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      </div>
    </header>
    
    <div class="content-status">
      <div id="content-type-indicator">Analyzing page content...</div>
    </div>
    
    <div class="summary-options">
      <div class="option-group">
        <label for="summary-length">Summary length:</label>
        <select id="summary-length">
          <option value="short">Short</option>
          <option value="medium" selected>Medium</option>
          <option value="long">Long</option>
        </select>
      </div>
      
      <button id="summarize-btn" class="primary-btn" disabled>Analyzing Content...</button>
    </div>
    
    <div id="summary-container" class="section-container">
      <!-- Summary content will be inserted here -->
    </div>
    
    <div id="chat-container" class="section-container">
      <div class="section-header">
        <h2>Chat with content</h2>
      </div>
      
      <div id="chat-messages">
        <!-- Chat messages will appear here -->
      </div>
      
      <div class="chat-input-container">
        <input type="text" id="chat-input" placeholder="Ask about this content..." disabled>
        <button id="send-btn" disabled>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
    
    <div class="expand-container">
      <button id="expand-btn" class="secondary-btn">Open in sidebar</button>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### In-Page UI Component

For a more integrated experience, the extension can inject a sidebar or overlay UI directly into the page.

#### Sidebar Component HTML Template

```javascript
// Function to create sidebar HTML
function createSidebarHTML(settings) {
  return `
    <div class="cs-sidebar ${settings.theme}" id="content-summarizer-sidebar">
      <div class="cs-sidebar-header">
        <h2>Content Summarizer</h2>
        <div class="cs-sidebar-controls">
          <button id="cs-minimize-btn" title="Minimize">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="4 14 10 14 10 20"></polyline>
              <polyline points="20 10 14 10 14 4"></polyline>
              <line x1="14" y1="10" x2="21" y2="3"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </button>
          <button id="cs-close-btn" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
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
            
            <button id="cs-regenerate-btn" class="cs-btn cs-primary-btn">
              Generate Summary
            </button>
          </div>
          
          <div id="cs-summary-container">
            <div class="cs-loading">
              <div class="cs-spinner"></div>
              <p>Select options and click Generate Summary</p>
            </div>
          </div>
        </div>
        
        <div class="cs-tab-content" id="cs-chat-tab">
          <div id="cs-chat-messages">
            <div class="cs-chat-message cs-system-message">
              Ask questions about the content and I'll answer based on the summary.
            </div>
          </div>
          
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
              <input type="checkbox" id="cs-include-timestamps" checked>
            </div>
            
            <div class="cs-setting-item">
              <label for="cs-ui-theme">Theme</label>
              <select id="cs-ui-theme">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
            
            <button id="cs-open-settings" class="cs-btn cs-secondary-btn">
              Open Full Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}
```

## Advanced Features

### Timestamp Navigation for Videos

The extension can make timestamps in video summaries clickable to allow direct navigation to specific points in the video.

```javascript
// Attach timestamp click handlers to the summary
function attachTimestampHandlers() {
  const timestampLinks = document.querySelectorAll('.timestamp-link');
  
  timestampLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Get timestamp value
      const timestamp = link.dataset.time;
      
      // Convert HH:MM:SS format to seconds
      const seconds = convertTimestampToSeconds(timestamp);
      
      // Send message to content script to navigate video
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'navigateVideo',
          time: seconds
        });
      });
    });
  });
}

// Convert timestamp string to seconds
function convertTimestampToSeconds(timestamp) {
  const parts = timestamp.split(':').map(Number);
  
  // Handle HH:MM:SS format
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  // Handle MM:SS format
  else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  
  return 0;
}

// Content script handler for video navigation
function handleVideoNavigation(time) {
  // For YouTube
  if (window.location.href.includes('youtube.com')) {
    const video = document.querySelector('video');
    if (video) {
      video.currentTime = time;
      video.play();
    }
  }
  // For other video platforms, implement similar logic
}
```

### Context Management Protocol

To effectively manage token usage and context window limitations across different LLMs, the extension implements a flexible context management protocol.

```javascript
class ContextManager {
  constructor(llmProvider) {
    this.llmProvider = llmProvider;
    this.maxContextLength = llmProvider.getContextLimit();
    this.tokenCountEstimator = new TokenCountEstimator(llmProvider.getType());
  }
  
  prepareContext(summary, chat, currentQuestion) {
    // Get base context (system message + summary)
    const baseContext = this.createBaseContext(summary);
    
    // Estimate tokens for base context and current question
    const baseContextTokens = this.tokenCountEstimator.estimateTokens(baseContext);
    const questionTokens = this.tokenCountEstimator.estimateTokens(currentQuestion);
    
    // Reserve tokens for response (typically 25-30% of max)
    const reservedResponseTokens = Math.floor(this.maxContextLength * 0.3);
    
    // Calculate how many tokens we have available for chat history
    const availableForChatHistory = this.maxContextLength - baseContextTokens - questionTokens - reservedResponseTokens;
    
    // Prepare chat history within token limits
    const processedChatHistory = this.fitChatHistoryToTokenLimit(chat, availableForChatHistory);
    
    // Combine everything into final context
    return {
      systemMessage: baseContext,
      chatHistory: processedChatHistory,
      currentQuestion,
      estimatedTokens: baseContextTokens + questionTokens + 
                      this.tokenCountEstimator.estimateTokens(processedChatHistory.join('\n'))
    };
  }
  
  createBaseContext(summary) {
    return `You are an AI assistant summarizing and answering questions about content. 
    Here is a summary of the content:
    
    ${summary}
    
    Base your answers on this summary. If you don't know something or it's not covered in the summary, 
    say so rather than making up information.`;
  }
  
  fitChatHistoryToTokenLimit(chatHistory, tokenLimit) {
    if (chatHistory.length === 0) return [];
    
    // Start with most recent messages
    const processedHistory = [];
    let totalTokens = 0;
    
    // Process from most recent to oldest
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const message = chatHistory[i];
      const messageTokens = this.tokenCountEstimator.estimateTokens(message);
      
      // Check if adding this message would exceed our limit
      if (totalTokens + messageTokens > tokenLimit) {
        // We can't fit any more messages
        break;
      }
      
      // Add message to processed history (at the beginning to maintain chronological order)
      processedHistory.unshift(message);
      totalTokens += messageTokens;
    }
    
    // If we couldn't include all messages, add a note about the conversation history
    if (processedHistory.length < chatHistory.length) {
      const omittedCount = chatHistory.length - processedHistory.length;
      processedHistory.unshift(`[Note: ${omittedCount} earlier messages were omitted due to context length limitations]`);
    }
    
    return processedHistory;
  }
}

// Helper class to estimate token counts
class TokenCountEstimator {
  constructor(modelType) {
    this.modelType = modelType;
  }
  
  estimateTokens(text) {
    if (!text) return 0;
    
    // Simple estimation: ~4 chars per token for English text
    // This is a rough approximation; production systems should use model-specific tokenizers
    // For OpenAI's tiktoken, Anthropic's claude-tokenizer, etc.
    const estimatedTokens = Math.ceil(text.length / 4);
    
    return estimatedTokens;
  }
}
```

### Modular LLM Integration

The following demonstrates how the extension can integrate with multiple LLM providers through a unified interface.

```javascript
// Add Gemini (Google) provider to the LLM options
class GoogleProvider extends LLMProvider {
  constructor(apiKey, options = {}) {
    super(apiKey, options);
    this.model = options.model || 'gemini-1.0-pro';
  }
  
  async complete(prompt, options = {}) {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + this.model + ':generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: options.maxTokens || 500,
          temperature: options.temperature || 0.7
        }
      })
    });
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }
  
  async chat(messages, options = {}) {
    // Convert messages to Gemini format
    const geminiMessages = messages.map(msg => ({
      role: msg.role === 'system' ? 'user' : msg.role,
      parts: [{ text: msg.content }]
    }));
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + this.model + ':generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 500,
          temperature: options.temperature || 0.7
        }
      })
    });
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }
  
  getContextLimit() {
    switch(this.model) {
      case 'gemini-1.0-pro':
        return 32768;
      case 'gemini-1.0-ultra':
        return 32768;
      default:
        return 32768;
    }
  }
  
  getType() {
    return 'google';
  }
}

// Add local LLM provider integration
class LocalLLMProvider extends LLMProvider {
  constructor(apiUrl, options = {}) {
    super('', options); // No API key needed
    this.apiUrl = apiUrl;
    this.model = options.model || 'custom';
  }
  
  async complete(prompt, options = {}) {
    try {
      const response = await fetch(this.apiUrl + '/v1/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          max_tokens: options.maxTokens || 500,
          temperature: options.temperature || 0.7
        })
      });
      
      const data = await response.json();
      return data.choices[0].text;
    } catch (error) {
      console.error('Local LLM error:', error);
      throw new Error('Failed to connect to local LLM service');
    }
  }
  
  async chat(messages, options = {}) {
    try {
      const response = await fetch(this.apiUrl + '/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages,
          max_tokens: options.maxTokens || 500,
          temperature: options.temperature || 0.7
        })
      });
      
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Local LLM error:', error);
      throw new Error('Failed to connect to local LLM service');
    }
  }
  
  getContextLimit() {
    // This can be configurable or auto-detected from the local service
    return this.options.contextLimit || 4096;
  }
  
  getType() {
    return 'local';
  }
}

// Update the factory to support new providers
class LLMProviderFactory {
  static create(type, apiKeyOrUrl, options = {}) {
    switch (type.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider(apiKeyOrUrl, options);
      case 'anthropic':
        return new AnthropicProvider(apiKeyOrUrl, options);
      case 'google':
        return new GoogleProvider(apiKeyOrUrl, options);
      case 'local':
        return new LocalLLMProvider(apiKeyOrUrl, options);
      default:
        throw new Error(`Uns# Content Summarizer Chrome Extension - Technical Architecture

## Overview

This Chrome extension intelligently summarizes various forms of online content and provides an interactive chat interface for users to engage with the summarized content. The extension is designed with a modular architecture to support multiple LLMs and handle different content types effectively.

## Architecture

### High-Level Components

1. **Content Processor**
   - Detects and extracts content from different sources (videos, audio, text)
   - Handles transcription for audio/video content
   - Preprocesses content for summarization

2. **Summarization Engine**
   - Interfaces with LLMs to generate concise summaries
   - Manages context and token limits
   - Generates timestamps for audio/video content

3. **Chat Interface**
   - Provides interactive Q&A based on summarized content
   - Maintains conversation history
   - Handles context management for extended conversations

4. **LLM Integration Layer**
   - Abstracts communication with different LLM providers
   - Manages API keys and authentication
   - Handles response formatting and error handling

5. **User Interface**
   - Extension popup for quick access and controls
   - Embedded UI elements for in-page interactions
   - Settings and configuration panels

## Detailed Design

### 1. Content Processor

#### Content Detection and Extraction

```javascript
// Sample content detector logic
class ContentDetector {
  detect(url) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'video-youtube';
    } else if (url.match(/\.(mp3|wav|ogg)$/i)) {
      return 'audio';
    } else {
      // Default to article/blog detection
      return this.detectArticleContent();
    }
  }
  
  detectArticleContent() {
    // Logic to determine if the page contains an article
    const articleSelectors = [
      'article',
      '[role="article"]',
      '.post-content',
      '.article-body',
      // Add more common article container selectors
    ];
    
    for (const selector of articleSelectors) {
      if (document.querySelector(selector)) {
        return 'article';
      }
    }
    
    return 'unknown';
  }
}
```

#### Content Extraction Logic

```javascript
// Sample content extractor
class ContentExtractor {
  async extract(contentType, pageElements) {
    switch (contentType) {
      case 'video-youtube':
        return this.extractYouTubeContent();
      case 'audio':
        return this.extractAudioContent();
      case 'article':
        return this.extractArticleContent(pageElements);
      default:
        throw new Error('Unsupported content type');
    }
  }
  
  async extractYouTubeContent() {
    // Get video ID from URL
    const videoId = this.getYouTubeVideoId(window.location.href);
    
    // Get transcript using YouTube API or scraping
    const transcript = await this.getYouTubeTranscript(videoId);
    
    // Get video metadata
    const metadata = this.getYouTubeMetadata();
    
    return {
      type: 'video',
      source: 'youtube',
      videoId,
      title: metadata.title,
      author: metadata.author,
      duration: metadata.duration,
      transcript,
      url: window.location.href
    };
  }
  
  async extractArticleContent(selectors) {
    // Find the main content container
    let mainContent = null;
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        mainContent = element;
        break;
      }
    }
    
    if (!mainContent) {
      // Fallback: try to intelligently find the main content
      mainContent = this.findMainContent();
    }
    
    // Extract text content
    const title = document.title || '';
    const content = mainContent ? mainContent.innerText : '';
    const metadata = this.extractArticleMetadata();
    
    return {
      type: 'article',
      title,
      author: metadata.author,
      publishDate: metadata.publishDate,
      content,
      url: window.location.href
    };
  }
  
  // Other extraction methods...
}
```

#### Transcription Service Integration

```javascript
class TranscriptionService {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }
  
  async transcribeYouTubeVideo(videoId) {
    // First try to get built-in captions
    try {
      const captions = await this.getYouTubeCaptions(videoId);
      if (captions) return captions;
    } catch (error) {
      console.warn('Failed to get YouTube captions:', error);
    }
    
    // Fall back to external transcription service
    return this.useExternalTranscriptionService(videoId);
  }
  
  async getYouTubeCaptions(videoId) {
    // Logic to extract YouTube's built-in captions
    // This may involve analyzing the page structure or using YouTube's API
  }
  
  async useExternalTranscriptionService(videoId) {
    // Example integration with external API like AssemblyAI
    const audioUrl = await this.getAudioStreamUrl(videoId);
    
    // Submit transcription job
    const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: audioUrl
      })
    });
    
    const { id } = await response.json();
    
    // Poll for results
    return this.pollForTranscriptionResults(id);
  }
  
  // Additional transcription methods...
}
```

### 2. Summarization Engine

#### LLM-Based Summarization

```javascript
class SummarizerEngine {
  constructor(llmProvider) {
    this.llmProvider = llmProvider;
  }
  
  async summarize(content, options = {}) {
    const { length = 'medium', includeTimestamps = true } = options;
    
    // Prepare content for summarization
    const processedContent = this.preprocessContent(content);
    
    // Build the prompt for summarization
    const prompt = this.buildSummarizationPrompt(
      processedContent, 
      content.type, 
      length,
      includeTimestamps
    );
    
    // Send to LLM provider for summarization
    const summary = await this.llmProvider.complete(prompt, {
      maxTokens: this.getMaxTokensForLength(length),
      temperature: 0.3  // Lower temperature for more focused summaries
    });
    
    // Post-process the summary
    return this.postprocessSummary(summary, content.type, includeTimestamps);
  }
  
  preprocessContent(content) {
    // Handle different content types
    switch (content.type) {
      case 'video':
      case 'audio':
        return this.preprocessTranscript(content.transcript);
      case 'article':
        return this.preprocessArticle(content.content);
      default:
        return content.content;
    }
  }
  
  buildSummarizationPrompt(content, contentType, length, includeTimestamps) {
    let prompt = `Summarize the following ${contentType}:\n\n${content}\n\n`;
    
    // Add instructions based on summary length
    switch (length) {
      case 'short':
        prompt += 'Provide a brief summary highlighting only the key points in 2-3 paragraphs.';
        break;
      case 'medium':
        prompt += 'Provide a comprehensive summary covering the main ideas and key supporting points in 4-6 paragraphs.';
        break;
      case 'long':
        prompt += 'Provide a detailed summary covering main ideas and significant details in 7-10 paragraphs.';
        break;
    }
    
    // Add timestamp instructions for audio/video content
    if (includeTimestamps && (contentType === 'video' || contentType === 'audio')) {
      prompt += ' Include timestamps in [HH:MM:SS] format for each key point or section.';
    }
    
    return prompt;
  }
  
  getMaxTokensForLength(length) {
    // Determine appropriate token limits based on summary length
    switch (length) {
      case 'short': return 300;
      case 'medium': return 600;
      case 'long': return 1200;
      default: return 600;
    }
  }
  
  postprocessSummary(summary, contentType, includeTimestamps) {
    // Clean up and format the summary
    let processedSummary = summary.trim();
    
    // If timestamps were requested but none are in the summary, try to add them
    if (includeTimestamps && (contentType === 'video' || contentType === 'audio') && 
        !processedSummary.match(/\[\d{2}:\d{2}(:\d{2})?\]/)) {
      processedSummary = this.addMissingTimestamps(processedSummary);
    }
    
    return processedSummary;
  }
  
  // Other summarization methods...
}
```

### 3. Chat Interface

#### Chat Logic

```javascript
class ChatEngine {
  constructor(llmProvider) {
    this.llmProvider = llmProvider;
    this.conversationHistory = [];
    this.summary = null;
    this.contentMetadata = null;
  }
  
  initialize(summary, contentMetadata) {
    this.summary = summary;
    this.contentMetadata = contentMetadata;
    this.conversationHistory = [
      { role: 'system', content: this.buildSystemPrompt() }
    ];
  }
  
  buildSystemPrompt() {
    return `You are an AI assistant helping with questions about the following ${this.contentMetadata.type}: 
    Title: ${this.contentMetadata.title}
    ${this.contentMetadata.author ? `Author/Creator: ${this.contentMetadata.author}` : ''}
    
    Here is a summary of the content:
    
    ${this.summary}
    
    Answer questions based on this summary. If you don't know the answer based on the provided information, say so rather than making up details.`;
  }
  
  async sendMessage(userMessage) {
    // Add user message to history
    this.conversationHistory.push({ role: 'user', content: userMessage });
    
    // Check if we need to manage context window size
    this.manageContextSize();
    
    // Send to LLM
    const response = await this.llmProvider.chat(this.conversationHistory);
    
    // Add response to history
    this.conversationHistory.push({ role: 'assistant', content: response });
    
    return response;
  }
  
  manageContextSize() {
    // Estimate token count
    const estimatedTokens = this.estimateTokenCount();
    
    // If approaching limit, compress older messages
    if (estimatedTokens > this.llmProvider.getContextLimit() * 0.8) {
      this.compressConversationHistory();
    }
  }
  
  estimateTokenCount() {
    // Simple approximation: ~4 chars per token
    return this.conversationHistory.reduce((total, msg) => {
      return total + (msg.content.length / 4);
    }, 0);
  }
  
  compressConversationHistory() {
    // Keep system message and last few exchanges intact
    const systemMessage = this.conversationHistory[0];
    const recentMessages = this.conversationHistory.slice(-4);
    
    // Summarize the middle part if needed
    if (this.conversationHistory.length > 5) {
      const messagesToCompress = this.conversationHistory.slice(1, -4);
      
      // Only compress if there's enough to justify it
      if (messagesToCompress.length >= 2) {
        const compressedHistory = `The conversation history includes discussion about: ${this.summarizeMessages(messagesToCompress)}`;
        
        // Rebuild conversation history
        this.conversationHistory = [
          systemMessage,
          { role: 'system', content: compressedHistory },
          ...recentMessages
        ];
      }
    }
  }
  
  summarizeMessages(messages) {
    // Extract key topics from messages
    // This could be done using simple keyword extraction or with LLM help
    // For simplicity, we'll just extract key phrases here
    
    const allText = messages.map(msg => msg.content).join(' ');
    const keywords = this.extractKeyTopics(allText);
    return keywords.join(', ');
  }
  
  extractKeyTopics(text) {
    // Simple topic extraction based on frequency and importance
    // In a real implementation, this could use more sophisticated NLP techniques
    // or call the LLM to summarize
    
    // Placeholder implementation
    return ['key topics', 'main questions discussed', 'central themes'];
  }
}
```

### 4. LLM Integration Layer

#### Abstract LLM Provider Interface

```javascript
// Base LLM provider interface
class LLMProvider {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.options = options;
  }
  
  async complete(prompt, options) {
    throw new Error('Method not implemented');
  }
  
  async chat(messages, options) {
    throw new Error('Method not implemented');
  }
  
  getContextLimit() {
    throw new Error('Method not implemented');
  }
}

// OpenAI Implementation
class OpenAIProvider extends LLMProvider {
  constructor(apiKey, options = {}) {
    super(apiKey, options);
    this.model = options.model || 'gpt-4';
  }
  
  async complete(prompt, options = {}) {
    const response = await fetch('https://api.openai.com/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        prompt,
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.7
      })
    });
    
    const data = await response.json();
    return data.choices[0].text;
  }
  
  async chat(messages, options = {}) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.7
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  getContextLimit() {
    switch(this.model) {
      case 'gpt-4':
        return 8192;
      case 'gpt-4-turbo':
        return 128000;
      case 'gpt-3.5-turbo':
        return 4096;
      default:
        return 4096;
    }
  }
}

// Anthropic Claude Implementation
class AnthropicProvider extends LLMProvider {
  constructor(apiKey, options = {}) {
    super(apiKey, options);
    this.model = options.model || 'claude-3-opus-20240229';
  }
  
  async complete(prompt, options = {}) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || 500
      })
    });
    
    const data = await response.json();
    return data.content[0].text;
  }
  
  async chat(messages, options = {}) {
    // Convert messages to Anthropic format if needed
    const anthropicMessages = messages.map(msg => ({
      role: msg.role === 'system' ? 'user' : msg.role,
      content: msg.content
    }));
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        messages: anthropicMessages,
        max_tokens: options.maxTokens || 500
      })
    });
    
    const data = await response.json();
    return data.content[0].text;
  }
  
  getContextLimit() {
    switch(this.model) {
      case 'claude-3-opus-20240229':
        return 200000;
      case 'claude-3-sonnet-20240229':
        return 200000;
      case 'claude-3-haiku-20240307':
        return 200000;
      default:
        return 100000;
    }
  }
}

// Factory to create appropriate provider
class LLMProviderFactory {
  static create(type, apiKey, options = {}) {
    switch (type.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider(apiKey, options);
      case 'anthropic':
        return new AnthropicProvider(apiKey, options);
      // Additional providers can be added here
      default:
        throw new Error(`Unsupported LLM provider: ${type}`);
    }
  }
}
```

### 5. User Interface Components

#### Extension Popup

```javascript
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
        if (response && response.summary) {
          displaySummary(response.summary, response.metadata);
          initializeChat(response.summary, response.metadata);
        } else {
          summaryContainer.innerHTML = '<div class="error">Failed to generate summary.</div>';
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
});
```

#### Embedded Content Interface

```javascript
// content-script.js
let contentDetector, contentExtractor, summarizerEngine;
let currentSummary = null;
let currentMetadata = null;

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
  
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'summarize') {
      handleSummarizeRequest(request.options, sendResponse);
      return true; // Keep channel open for async response
    }
  });
  
  // Add floating action button if appropriate
  addFloatingActionButton();
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

function addFloatingActionButton() {
  // Only add if we're on a supported content type
  const contentType = contentDetector.detect(window.location.href);
  if (contentType === 'unknown') return;
  
  // Create button element
  const button = document.createElement('div');
  button.className = 'content-summarizer-fab';
  button.innerHTML = '<svg>...</svg>'; // Add appropriate icon SVG
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

// Other UI helper functions...
```

### 6. Extension Configuration Files

#### Manifest File

```json
{
  "manifest_version": 3,
  "name": "Content Summarizer",
  "version": "1.0",
  "description": "Intelligently summarizes web content and enables interactive chat",
  "permissions": [
    "activeTab",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content-script.js"],
      "css": ["content-styles.css"]
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "options_page": "options.html"
}
```

#### Background Service Worker

```javascript
// background.js
let chatEngine = null;

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'chat') {
    handleChatMessage(request.message, sendResponse);
    return true; // Keep channel open for async response
  }
});

async function handleChatMessage(message, sendResponse) {
  try {
    // Initialize chat engine if needed
    if (!chatEngine) {
      // Get current summary and metadata from storage
      const { summary, metadata, llmSettings } = await chrome.storage.local.get([
        'currentSummary', 
        'contentMetadata',
        'llmProvider',
        'apiKey',
        'model'
      ]);
      
      if (!summary) {
        sendResponse({ error: 'No summary available for chat' });
        return;
      }
      
      // Create LLM provider
      const provider = LLMProviderFactory.create(
        llmSettings.provider || 'openai',
        llmSettings.apiKey || '',
        { model: llmSettings.model }
      );
      
      // Initialize chat engine
      chatEngine = new ChatEngine(provider);
      chatEngine.initialize(summary, metadata);
    }
    
    // Process message
    const reply = await chatEngine.sendMessage(message);
    
    // Send response
    sendResponse({ reply });
    
  } catch (error) {
    console.error('Chat processing error:', error);
    sendResponse({ error: error.message });
  }
}

// Listen for tab changes to reset chat context
chrome.tabs.onActivated.addListener(() => {
  chatEngine = null;
});
```

## Data Flow

1. **User initiates summarization:**
   - Extension detects content type
   - Content is extracted and processed
   - Summary is generated via LLM
   - Summary is displayed to user with interactive elements

2. **User interacts with chat:**
   - Question is sent to background script
   - Chat engine processes question with context from summary
   - LLM generates response
   - Response is displayed in chat interface

3. **Context management:**
   - Chat history is maintained and managed
   - Token limits are monitored
   - Context is compressed when needed

## Security Considerations

1. **API Key Management:**
   - API keys stored in Chrome's secure storage
   - Keys never exposed to page content
   - Optional integration with system keychain

2. **Data Privacy:**
   - Content processing happens locally when possible
   - Only necessary data sent to LLM APIs
   - No persistent storage of content beyond session

3. **Permission Scope:**
   - Minimal permissions requested
   - Clear user consent for content access

## Performance Optimization

1. **Content Processing:**
   - Chunking large content for processing
   - Progressive loading for long pages
   - Caching of extracted content

2. **UI Responsiveness:**
   - Asynchronous processing
   - Loading indicators for user feedback
   - Background processing for heavy tasks

3. **Resource Usage:**
   - Lazy initialization of components
   - Resource cleanup when inactive
   - Efficient context management

## Development and Testing Plan

1. **Phase 1: Core Architecture**
   - Implement basic extension structure
   - Create content detection and extraction logic
   - Set up LLM provider abstraction

2. **Phase 2: Summarization Engine**
   - Implement summarization logic
   - Add timestamp generation
   - Test with various content types

3. **Phase 3: Chat Interface**
   - Build interactive chat UI
   - Implement context management
   - Test conversation flow

4. **Phase 4: UI/UX Polish**
   - Refine user interface
   - Add customization options
   - Improve accessibility
   - Implement user feedback mechanisms

5. **Phase 5: Testing and Deployment**
   - Unit testing for individual components
   - Integration testing across the system
   - User acceptance testing
   - Preparation for Chrome Web Store submission