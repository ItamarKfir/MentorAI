class MentorAIPopup {
  constructor() {
    this.init();
  }

  async init() {
    this.bindElements();
    await this.loadSavedProviders();
    await this.initializeSettingsVisibility();
    this.attachEventListeners();
    await this.loadProblemInfo();
    
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.currentProblem) {
        const newProblemInfo = changes.currentProblem.newValue;
        ('Problem info updated:', {
          language: newProblemInfo.language,
          codeLength: newProblemInfo.userCode?.length || 0
        });
        this.updateUI(newProblemInfo);
      }
    });
  }

  bindElements() {
    // API Key elements
    this.apiKeySection = document.getElementById('apiKeySection');
    this.apiKeyInput = document.getElementById('apiKeyInput');
    this.apiProviderSelect = document.getElementById('apiProvider');
    this.modelProviderSelect = document.getElementById('modelProvider');
    this.savedProvidersContainer = document.getElementById('savedProviders');
    this.saveApiKeyBtn = document.getElementById('saveApiKey');
    this.settingsBtn = document.getElementById('settingsBtn');

    // Main content elements
    this.mainContent = document.getElementById('mainContent');
    this.problemTitle = document.getElementById('problemTitle');
    this.problemDifficulty = document.getElementById('problemDifficulty');
    this.aiResponse = document.getElementById('aiResponse');

    // Action buttons
    this.buttons = {
      hint: document.getElementById('getHint'),
      solution: document.getElementById('getSolution'),
      explanation: document.getElementById('getExplanation')
    };
  }

  attachEventListeners() {
    this.settingsBtn?.addEventListener('click', () => this.toggleSettings());
    this.saveApiKeyBtn?.addEventListener('click', () => this.handleApiKey());
    this.buttons.hint?.addEventListener('click', () => this.getAIResponse('hint'));
    this.buttons.solution?.addEventListener('click', () => this.getAIResponse('solution'));
    this.buttons.explanation?.addEventListener('click', () => this.getAIResponse('explanation'));
    this.apiProviderSelect?.addEventListener('change', () => this.updateApiKeyPlaceholder());
    this.modelProviderSelect?.addEventListener('change', () => this.updateSelectedProvider());
  }

  async initializeSettingsVisibility() {
    const providers = await SecureStorage.getAllProviders();
    if (providers.length > 0) {
      // Hide settings section if there are saved API keys
      this.apiKeySection.classList.add('hidden');
      this.mainContent.classList.remove('hidden');
    } else {
      // Show settings section if no API keys are saved
      this.apiKeySection.classList.remove('hidden');
      this.mainContent.classList.add('hidden');
    }
  }

  async loadSavedProviders() {
    const providers = await SecureStorage.getAllProviders();
    this.updateSavedProvidersUI(providers);
    this.updateModelProviderSelect(providers);
  }

  updateApiKeyPlaceholder() {
    const provider = this.apiProviderSelect.value;
    const placeholders = {
      'openai': 'Enter OpenAI API Key (sk-...)',
      'google': 'Enter Google AI API Key (AIza...)'
    };
    this.apiKeyInput.placeholder = placeholders[provider] || 'Enter API Key';
  }

  updateSavedProvidersUI(providers) {
    this.savedProvidersContainer.innerHTML = providers.map(provider => `
      <div class="saved-provider">
        <span class="provider-name">${provider.charAt(0).toUpperCase() + provider.slice(1)}</span>
        <button class="remove-btn" data-provider="${provider}" title="Remove ${provider} API key">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `).join('');

    // Add event listeners for remove buttons
    this.savedProvidersContainer.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const provider = btn.dataset.provider;
        await SecureStorage.clearApiKey(provider);
        await this.loadSavedProviders();
      });
    });
  }

  updateModelProviderSelect(providers) {
    this.modelProviderSelect.innerHTML = providers.map(provider => `
      <option value="${provider}">${provider.charAt(0).toUpperCase() + provider.slice(1)}</option>
    `).join('');
    
    // If we have providers, select the first one by default
    if (providers.length > 0) {
      this.modelProviderSelect.value = providers[0];
    }
  }

  updateSelectedProvider() {
    // This method is called when the model provider is changed
    // You can add any additional logic here if needed
    const selectedProvider = this.modelProviderSelect.value;
    console.log('Selected provider:', selectedProvider);
  }

  toggleSettings() {
    requestAnimationFrame(() => {
      this.apiKeySection.classList.toggle('hidden');
      if (!this.apiKeySection.classList.contains('hidden')) {
        this.updateApiKeyPlaceholder();
      }
    });
  }

  async handleApiKey() {
    if (this.saveApiKeyBtn.textContent === 'Edit Key') {
      this.apiKeyInput.value = '';
      this.apiKeyInput.type = 'text';
      this.saveApiKeyBtn.textContent = 'Save Key';
      return;
    }

    const apiKey = this.apiKeyInput.value.trim();
    const provider = this.apiProviderSelect.value;
    
    try {
      await SecureStorage.securelyStoreApiKey(apiKey, provider);
      this.apiKeyInput.value = '';
      this.apiKeyInput.type = 'password';
      this.saveApiKeyBtn.textContent = 'Save Key';
      await this.loadSavedProviders();
      
      // Hide API key section and show main content
      this.apiKeySection.classList.add('hidden');
      this.mainContent.classList.remove('hidden');
      
      this.showSuccess(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key saved successfully`);
    } catch (error) {
      this.showError(error.message);
    }
  }

  async loadProblemInfo() {
    try {
      const data = await chrome.storage.local.get('currentProblem');
      const problemInfo = data.currentProblem;

      if (!problemInfo) {
        throw new Error('No problem information found');
      }

      this.currentProblem = problemInfo;
      this.problemTitle.textContent = this.currentProblem.title;

      // Set difficulty with proper styling
      const difficulty = (this.currentProblem.difficulty || 'unknown').toLowerCase();
      this.problemDifficulty.textContent = this.currentProblem.difficulty || 'Unknown';
      this.problemDifficulty.className = `difficulty-badge ${difficulty}`;

      // Show main content if we have an API key
      if (this.apiKey) {
        this.mainContent.style.display = 'block';
      }

      return this.currentProblem;
    } catch (error) {
      console.error('Error loading problem info:', error);
      throw error;
    }
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    this.apiKeySection.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
  }

  showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    this.apiKeySection.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
  }

  async getAIResponse(type) {
    const provider = this.modelProviderSelect.value;
    if (!provider) {
      this.showError('Please select an AI provider');
      return;
    }

    try {
      const apiKey = await SecureStorage.getSecureApiKey(provider);
      if (!apiKey) {
        throw new Error(`No API key found for ${provider}`);
      }

      const problemInfo = await this.loadProblemInfo();
      if (!problemInfo || !problemInfo.language) {
        throw new Error('No problem or language information available');
      }

      const prompt = this.generatePrompt(type, problemInfo, provider);
      this.aiResponse.innerHTML = '<div class="loading">Getting AI assistance...</div>';

      const response = await this.callAI(prompt, provider, apiKey);
      const formattedResponse = this.formatResponseWithCodeBackground(response);
      this.aiResponse.innerHTML = formattedResponse;
    } catch (error) {
      console.error('Error in getAIResponse:', error);
      this.aiResponse.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    }
  }

  async callAI(prompt, provider, apiKey) {
    const endpoints = {
      'openai': 'https://api.openai.com/v1/chat/completions',
      'google': `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
    };

    let headers = {
      'Content-Type': 'application/json'
    };

    let body;
    switch (provider) {
      case 'openai':
        headers['Authorization'] = `Bearer ${apiKey}`;
        body = {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        };
        break;
      case 'google':
        body = {
          contents: [{
            parts: [{ text: prompt }]
          }]
        };
        break;
      default:
        throw new Error('Unknown provider');
    }

    const response = await fetch(endpoints[provider], {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to get AI response');
    }

    const data = await response.json();
    
    // Extract the response based on the provider's response format
    switch (provider) {
      case 'openai':
        return data.choices[0].message.content;
      case 'google':
        return data.candidates[0].content.parts[0].text;
      default:
        throw new Error('Unknown provider');
    }
  }

  generatePrompt(type, problemInfo, provider) {
    const language = problemInfo.language || 'Unknown';
    const baseContext = `You are a coding mentor helping with a ${language} solution for the following LeetCode problem:`;

    // Format the code block with the language directly
    const codeBlock = problemInfo.userCode ?
      `\nCurrent code:\n\`\`\`${language}\n${problemInfo.userCode}\n\`\`\`\n` :
      '\nNo code written yet.\n';

    const problemContext = `
Problem: ${problemInfo.title}
Difficulty: ${problemInfo.difficulty}
Language: ${language}

${problemInfo.description}
${codeBlock}`;

    switch (type) {
      case 'hint':
        return `${baseContext}
${problemContext}
Please provide a helpful hint for improving this ${language} code. Focus on potential optimizations and best practices.`;

      case 'solution':
        return `${baseContext}
${problemContext}
Please provide a complete ${language} solution with detailed explanations.`;

      case 'explanation':
        return `${baseContext}
${problemContext}
Please explain this ${language} code in detail, including its approach, complexity, and potential improvements.`;

      default:
        return `${baseContext}
${problemContext}
Please provide general guidance on solving this problem in ${language}.`;
    }
  }

  formatResponseWithCodeBackground(response) {
    // First, normalize any malformed code blocks (missing backticks)
    response = response.replace(/``(\w+)\n([\s\S]*?)`(?!\`)/g, '```$1\n$2```');
    
    // Replace code blocks with styled div, handling various language formats
    response = response.replace(/```([\w+#]+)?\n([\s\S]*?)```/g, (match, language, code) => {
      // Normalize language name
      let displayLanguage = (language || '').toLowerCase().trim();
      
      // Handle various language names
      const languageMap = {
        'cpp': 'cpp',
        'c++': 'cpp',
        'c': 'cpp',
        'c#': 'csharp',
        'csharp': 'csharp',
        'cs': 'csharp',
        'javascript': 'javascript',
        'js': 'javascript',
        'python': 'python',
        'py': 'python',
        'java': 'java'
      };

      displayLanguage = languageMap[displayLanguage] || displayLanguage;

      // Map language display names
      const languageDisplayNames = {
        'cpp': 'C++',
        'csharp': 'C#',
        'javascript': 'JavaScript',
        'python': 'Python',
        'java': 'Java'
      };
      
      const displayName = languageDisplayNames[displayLanguage] || 'Code';
      return `<div class="code-block ${displayLanguage}"><div class="code-header">${displayName}</div><pre><code>${code.trim()}</code></pre></div>`;
    });

    // Replace inline code with more precise pattern
    // Only match text between single backticks that doesn't contain newlines and is not at the end of a sentence
    response = response.replace(/`([^`\n]+?)`(?![.]$)/g, '<span class="inline-code">$1</span>');

    // Add general formatting for the rest of the response
    return response;
  }

  updateUI(newProblemInfo) {
    // Implement the logic to update the UI based on the new problem information
    console.log('Updating UI with new problem info:', newProblemInfo);
  }
}

// Initialize popup
new MentorAIPopup(); 