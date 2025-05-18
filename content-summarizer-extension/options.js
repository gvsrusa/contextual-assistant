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