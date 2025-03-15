class MentorAIPopup {
  constructor() {
    this.init();
  }

  async init() {
    this.bindElements();
    this.attachEventListeners();
    await this.checkApiKey();
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
    if (this.settingsBtn) {
      this.settingsBtn.addEventListener('click', () => this.toggleSettings());
    }

    if (this.saveApiKeyBtn) {
      this.saveApiKeyBtn.addEventListener('click', () => this.handleApiKey());
    }

    if (this.buttons.hint) {
      this.buttons.hint.addEventListener('click', () => this.getAIResponse('hint'));
    }

    if (this.buttons.solution) {
      this.buttons.solution.addEventListener('click', () => this.getAIResponse('solution'));
    }

    if (this.buttons.explanation) {
      this.buttons.explanation.addEventListener('click', () => this.getAIResponse('explanation'));
    }
  }

  toggleSettings() {
    if (this.apiKeySection.style.display === 'none' || this.apiKeySection.classList.contains('hidden')) {
      this.apiKeySection.style.display = 'flex';
      this.apiKeySection.classList.remove('hidden');
      this.apiKeyInput.type = 'text';
      this.saveApiKeyBtn.textContent = 'Save Key';
    } else {
      this.apiKeySection.style.display = 'none';
      this.apiKeySection.classList.add('hidden');
    }
  }

  async checkApiKey() {
    const { apiKey } = await chrome.storage.local.get('apiKey');
    if (apiKey) {
      this.apiKey = apiKey;
      this.apiKeySection.style.display = 'none';
      this.apiKeySection.classList.add('hidden');
      this.mainContent.classList.remove('hidden');
      this.apiKeyInput.value = '********';
      this.saveApiKeyBtn.textContent = 'Edit Key';
    }
  }

  async loadProblemInfo() {
    try {
      const data = await chrome.storage.local.get('currentProblem');
      const problemInfo = data.currentProblem;

      if (!problemInfo) {
        throw new Error('No problem information found');
      }

      console.log('Loaded problem info:', {
        title: problemInfo.title,
        language: problemInfo.language,
        codeLength: problemInfo.userCode?.length || 0
      });

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

  async handleApiKey() {
    if (this.saveApiKeyBtn.textContent === 'Edit Key') {
      this.apiKeyInput.value = '';
      this.apiKeyInput.type = 'text';
      this.saveApiKeyBtn.textContent = 'Save Key';
      return;
    }

    const apiKey = this.apiKeyInput.value.trim();
    if (!apiKey) {
      alert('Please enter a valid API key');
      return;
    }

    await chrome.storage.local.set({ apiKey });
    this.apiKey = apiKey;
    this.apiKeyInput.value = '********';
    this.apiKeyInput.type = 'password';
    this.saveApiKeyBtn.textContent = 'Edit Key';
    this.mainContent.style.display = 'block';
  }

  async getAIResponse(type) {
    if (!this.apiKey) {
      alert('Please set your OpenAI API key first');
      return;
    }

    try {
      const problemInfo = await this.loadProblemInfo();
      if (!problemInfo || !problemInfo.language) {
        throw new Error('No problem or language information available');
      }

      const prompt = this.generatePrompt(type, problemInfo);
      console.log('Generated prompt with language:', problemInfo.language);

      this.aiResponse.innerHTML = '<div class="loading">Getting AI assistance...</div>';

      const response = await this.callOpenAI(prompt);
      const formattedResponse = this.formatResponseWithCodeBackground(response);
      this.aiResponse.innerHTML = formattedResponse;
    } catch (error) {
      console.error('Error in getAIResponse:', error);
      this.aiResponse.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    }
  }

  generatePrompt(type, problemInfo) {
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

  async callOpenAI(prompt) {
    console.log('Making API call to OpenAI...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    const data = await response.json();
    console.log('OpenAI response:', data);
    return data.choices[0].message.content;
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