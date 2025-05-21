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

  getType() {
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
    if (!this.apiKey) {
      console.log("OpenAIProvider: No API key provided, returning mock summary.");
      return Promise.resolve(`[Mock OpenAI Summary]: The content appears to be about: "${prompt.substring(0, 50)}..." Key points include A, B, and C. This is a mock response.`);
    }
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
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: "Unknown API error" } }));
      throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
    }
    const data = await response.json();
    return data.choices[0].text;
  }
  
  async chat(messages, options = {}) {
    if (!this.apiKey) {
      console.log("OpenAIProvider: No API key provided, returning mock chat reply.");
      const userMessage = messages.find(m => m.role === 'user');
      return Promise.resolve(`[Mock OpenAI Chat]: You asked about "${userMessage ? userMessage.content.substring(0,30) : 'your query' }...". My mock answer is that it's interesting.`);
    }
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
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: "Unknown API error" } }));
      throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
    }
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
      case 'gpt-3.5-turbo-16k': // Added for completeness, though not in original doc
        return this.model === 'gpt-3.5-turbo-16k' ? 16384 : 4096;
      default:
        return 4096; // Default for older or unknown models
    }
  }

  getType() {
    return 'openai';
  }
}

// Anthropic Claude Implementation
class AnthropicProvider extends LLMProvider {
  constructor(apiKey, options = {}) {
    super(apiKey, options);
    this.model = options.model || 'claude-3-opus-20240229';
  }
  
  async complete(prompt, options = {}) {
    if (!this.apiKey) {
      console.log("AnthropicProvider: No API key provided, returning mock summary.");
      return Promise.resolve(`[Mock Anthropic Summary]: The content appears to be about: "${prompt.substring(0, 50)}..." Key points include X, Y, and Z. This is a mock response.`);
    }
    // Anthropic's messages API is preferred over completions
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
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.7
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: "Unknown API error" } }));
      throw new Error(`Anthropic API Error: ${errorData.error?.message || response.statusText}`);
    }
    const data = await response.json();
    return data.content[0].text;
  }
  
  async chat(messages, options = {}) {
    if (!this.apiKey) {
      console.log("AnthropicProvider: No API key provided, returning mock chat reply.");
      const userMessage = messages.find(m => m.role === 'user');
      return Promise.resolve(`[Mock Anthropic Chat]: You asked about "${userMessage ? userMessage.content.substring(0,30) : 'your query' }...". My mock answer is that it's quite profound.`);
    }
    // Convert messages to Anthropic format if needed (system prompt handling)
    let anthropicMessages = messages;
    if (messages.length > 0 && messages[0].role === 'system') {
        // Anthropic expects system prompt as a separate parameter
        // For simplicity here, we'll prepend it to the first user message if that's the case
        // or just pass it as is if the API supports it directly in messages array.
        // The provided example already maps system to user for the first message.
         anthropicMessages = messages.map(msg => ({
            role: msg.role === 'system' ? 'user' : msg.role, // First system message as user
            content: msg.content
        }));
    }


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
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.7,
        system: messages.find(msg => msg.role === 'system')?.content // Official way to pass system prompt
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: "Unknown API error" } }));
      throw new Error(`Anthropic API Error: ${errorData.error?.message || response.statusText}`);
    }
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
      case 'claude-2.1':
        return 200000;
      case 'claude-2':
        return 100000;
      case 'claude-instant-1.2':
        return 100000;
      default:
        return 100000; // Default for older or unknown models
    }
  }

  getType() {
    return 'anthropic';
  }
}

// Add Gemini (Google) provider to the LLM options
class GoogleProvider extends LLMProvider {
  constructor(apiKey, options = {}) {
    super(apiKey, options);
    this.model = options.model || 'gemini-1.0-pro';
  }
  
  async complete(prompt, options = {}) {
    if (!this.apiKey) {
      console.log("GoogleProvider: No API key provided, returning mock summary.");
      return Promise.resolve(`[Mock Google Summary]: The content appears to be about: "${prompt.substring(0, 50)}..." Key points include 1, 2, and 3. This is a mock response.`);
    }
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
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: "Unknown API error" } }));
      throw new Error(`Google API Error: ${errorData.error?.message || response.statusText}`);
    }
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }
  
  async chat(messages, options = {}) {
    if (!this.apiKey) {
      console.log("GoogleProvider: No API key provided, returning mock chat reply.");
      const userMessage = messages.find(m => m.role === 'user');
      return Promise.resolve(`[Mock Google Chat]: You asked about "${userMessage ? userMessage.content.substring(0,30) : 'your query' }...". My mock answer is that it's a good question.`);
    }
    // Convert messages to Gemini format
    const geminiMessages = messages.map(msg => ({
      role: msg.role === 'system' ? 'user' : (msg.role === 'assistant' ? 'model' : msg.role), // System as user, assistant as model
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
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: "Unknown API error" } }));
      throw new Error(`Google API Error: ${errorData.error?.message || response.statusText}`);
    }
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }
  
  getContextLimit() {
    // Approximate, actual limits can vary based on model version and input type (text, image etc)
    switch(this.model) {
      case 'gemini-1.0-pro':
      case 'gemini-pro': // Alias
        return 32768; // Or 30720 tokens for text
      case 'gemini-1.0-ultra':
        return 32768; // Larger context, but often rate-limited
      case 'gemini-1.5-pro-latest':
      case 'gemini-1.5-flash-latest':
        return 1048576; // 1M context window
      default:
        return 32768; // Default for unknown Gemini models
    }
  }
  
  getType() {
    return 'google';
  }
}

// Add local LLM provider integration
class LocalLLMProvider extends LLMProvider {
  constructor(apiUrl, options = {}) {
    super('', options); // No API key needed for local typically
    this.apiUrl = apiUrl;
    this.model = options.model || 'custom'; // Model name might be relevant for some local setups
  }
  
  async complete(prompt, options = {}) {
    if (!this.apiUrl || !this.apiUrl.startsWith('http')) {
      console.log("LocalLLMProvider: Invalid or missing API URL, returning mock summary.");
      return Promise.resolve(`[Mock Local LLM Summary]: For prompt "${prompt.substring(0,50)}...", this is a local mock response.`);
    }
    try {
      const response = await fetch(this.apiUrl + '/v1/completions', { // Assuming OpenAI-compatible API
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          model: this.model, // Some local servers might use this
          max_tokens: options.maxTokens || 500,
          temperature: options.temperature || 0.7,
          // Add other common parameters if needed: top_p, stop, etc.
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown local API error" }));
        throw new Error(`Local LLM API Error: ${errorData.message || response.statusText}`);
      }
      const data = await response.json();
      return data.choices[0].text;
    } catch (error) {
      console.error('Local LLM complete error:', error);
      if (error.message.includes('Failed to fetch')) { // Common browser error for network issues
          return Promise.resolve(`[Mock Local LLM Info]: Could not connect to local LLM at ${this.apiUrl}. Please ensure it's running.`);
      }
      throw new Error(`Failed to connect to local LLM service: ${error.message}`);
    }
  }
  
  async chat(messages, options = {}) {
    if (!this.apiUrl || !this.apiUrl.startsWith('http')) {
      console.log("LocalLLMProvider: Invalid or missing API URL, returning mock chat reply.");
      const userMessage = messages.find(m => m.role === 'user');
      return Promise.resolve(`[Mock Local LLM Chat]: Regarding "${userMessage ? userMessage.content.substring(0,30) : 'your query' }...", this is a local mock chat response.`);
    }
    try {
      const response = await fetch(this.apiUrl + '/v1/chat/completions', { // Assuming OpenAI-compatible API
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages,
          model: this.model, // Some local servers might use this
          max_tokens: options.maxTokens || 500,
          temperature: options.temperature || 0.7,
          // Add other common parameters if needed: top_p, stop, etc.
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown local API error" }));
        throw new Error(`Local LLM API Error: ${errorData.message || response.statusText}`);
      }
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Local LLM chat error:', error);
      if (error.message.includes('Failed to fetch')) {
          return Promise.resolve(`[Mock Local LLM Info]: Could not connect to local LLM at ${this.apiUrl}. Please ensure it's running and accessible.`);
      }
      throw new Error(`Failed to connect to local LLM service: ${error.message}`);
    }
  }
  
  getContextLimit() {
    // This is highly dependent on the local model and server configuration
    // It's best to make this configurable or attempt to fetch from the server if possible
    return this.options.contextLimit || 4096; // Default, but should be overridden
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
        return new LocalLLMProvider(apiKeyOrUrl, options); // apiKeyOrUrl is the URL for local
      default:
        console.error(`Unsupported LLM provider type: ${type}. Defaulting to OpenAI.`);
        // Fallback or throw error. For robustness, could default to a known provider or throw.
        // throw new Error(`Unsupported LLM provider type: ${type}`);
        return new OpenAIProvider(apiKeyOrUrl, options); // Example fallback
    }
  }
}

class ContextManager {
  constructor(llmProvider) {
    if (!llmProvider || typeof llmProvider.getContextLimit !== 'function' || typeof llmProvider.getType !== 'function') {
        throw new Error("Invalid LLMProvider instance provided to ContextManager.");
    }
    this.llmProvider = llmProvider;
    this.maxContextLength = llmProvider.getContextLimit();
    this.tokenCountEstimator = new TokenCountEstimator(llmProvider.getType());
  }
  
  prepareContext(summary, chatHistoryArray, currentQuestion) {
    // Ensure chatHistoryArray is an array
    const chat = Array.isArray(chatHistoryArray) ? chatHistoryArray : [];

    // Get base context (system message + summary)
    const baseContext = this.createBaseContext(summary);
    
    // Estimate tokens for base context and current question
    const baseContextTokens = this.tokenCountEstimator.estimateTokens(baseContext);
    const questionTokens = this.tokenCountEstimator.estimateTokens(currentQuestion);
    
    // Reserve tokens for response (typically 25-30% of max, or a fixed amount)
    const reservedResponseTokens = Math.min(Math.floor(this.maxContextLength * 0.3), 1024); // Cap response reservation
    
    // Calculate how many tokens we have available for chat history
    let availableForChatHistory = this.maxContextLength - baseContextTokens - questionTokens - reservedResponseTokens;
    
    // If available tokens are negative, it means base context + question already exceed limit
    if (availableForChatHistory < 0) {
        console.warn("Base context and question exceed token limit. Truncating summary or question may be needed.");
        // Attempt to fit by returning only the (potentially truncated) question and a minimal system prompt
        // This is a fallback, ideally the summary itself should be managed before this stage.
        const minimalSystemPrompt = "Answer the following question concisely:";
        const minimalSystemTokens = this.tokenCountEstimator.estimateTokens(minimalSystemPrompt);
        if (questionTokens + minimalSystemTokens <= this.maxContextLength - reservedResponseTokens) {
            return {
                systemMessage: minimalSystemPrompt,
                chatHistory: [],
                currentQuestion,
                estimatedTokens: minimalSystemTokens + questionTokens
            };
        }
        // If even that is too much, we have a problem.
        return {
            systemMessage: "Error: Content too long to process.",
            chatHistory: [],
            currentQuestion: "",
            estimatedTokens: this.tokenCountEstimator.estimateTokens("Error: Content too long to process.")
        };
    }
    
    // Prepare chat history within token limits
    const processedChatHistory = this.fitChatHistoryToTokenLimit(chat, availableForChatHistory);
    
    // Combine everything into final context
    const finalChatHistoryTokens = this.tokenCountEstimator.estimateTokens(
        processedChatHistory.map(m => `${m.role}: ${m.content}`).join('\n')
    );

    return {
      systemMessage: baseContext, // This is the initial system prompt part
      chatHistory: processedChatHistory, // This will be part of the 'messages' array
      currentQuestion, // This will be the last user message in the 'messages' array
      estimatedTokens: baseContextTokens + questionTokens + finalChatHistoryTokens
    };
  }
  
  createBaseContext(summary) {
    // This will be the 'system' message in an OpenAI-style chat completion request
    return `You are an AI assistant summarizing and answering questions about content. 
    Here is a summary of the content:
    
    ${summary}
    
    Base your answers on this summary. If you don't know something or it's not covered in the summary, 
    say so rather than making up information. Be concise.`;
  }
  
  fitChatHistoryToTokenLimit(chatHistory, tokenLimit) {
    if (!Array.isArray(chatHistory) || chatHistory.length === 0) return [];
    
    const processedHistory = [];
    let totalTokens = 0;
    
    // Process from most recent to oldest
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const message = chatHistory[i];
      // Ensure message has role and content
      if (!message || typeof message.role !== 'string' || typeof message.content !== 'string') {
          console.warn("Skipping invalid message in chat history:", message);
          continue;
      }
      const messageText = `${message.role}: ${message.content}`; // Simulating how it might be counted
      const messageTokens = this.tokenCountEstimator.estimateTokens(messageText);
      
      if (totalTokens + messageTokens <= tokenLimit) {
        processedHistory.unshift(message); // Add to beginning to maintain order
        totalTokens += messageTokens;
      } else {
        // Optional: Add a note if history is truncated
        if (i === chatHistory.length - 1 && processedHistory.length === 0) {
            // The most recent message itself is too long, try to truncate it
            // This is a simplistic truncation, better would be token-aware.
            const availableTokensForLastMessage = tokenLimit - totalTokens;
            if (availableTokensForLastMessage > 0) {
                let truncatedContent = message.content;
                while (this.tokenCountEstimator.estimateTokens(truncatedContent) > availableTokensForLastMessage && truncatedContent.length > 0) {
                    truncatedContent = truncatedContent.substring(0, truncatedContent.length - 100); // Cut chunks
                }
                 if (truncatedContent.length > 0) {
                    processedHistory.unshift({role: message.role, content: truncatedContent + "..."});
                    totalTokens += this.tokenCountEstimator.estimateTokens(truncatedContent + "...");
                 }
            }
        }
        // Add truncation note if some messages were included but not all
        if (processedHistory.length > 0 && processedHistory.length < chatHistory.length) {
             const omittedCount = chatHistory.length - processedHistory.length;
             const truncationMessage = {role: "system", content: `[Note: ${omittedCount} earlier messages were omitted due to context length limitations]`};
             const truncationTokens = this.tokenCountEstimator.estimateTokens(truncationMessage.content);
             // Check if we can fit the truncation message
             if (totalTokens + truncationTokens <= tokenLimit) {
                processedHistory.unshift(truncationMessage);
             }
        }
        break; 
      }
    }
    return processedHistory;
  }
}