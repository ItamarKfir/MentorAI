let detector = null;
let isInitializing = false;
let debounceTimer = null;
let hasShownWelcomeGlobally = false;

function debounce(func, wait) {
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(debounceTimer);
            func(...args);
        };
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(later, wait);
    };
}

class LeetCodeProblemDetector {
    constructor() {
        this.problemInfo = null;
        this.isProcessing = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.observers = [];
        this.logCount = 0;
        this.maxLogs = 5;
        this.languageRetryCount = 0;
        this.hasShownWelcome = false;
        this.init();
    }

    debugLog(message, data = null) {
        if (this.logCount >= this.maxLogs) return;
        this.logCount++;
        if (data) {
            console.log(message, data);
        } else {
            console.log(message);
        }

        if (this.logCount === this.maxLogs) {
            console.log('Logging limit reached. Further logs suppressed.');
        }
    }

    async init() {
        try {
            this.debugLog('LeetCode Problem Detector initializing...');
            if (this.retryCount >= this.maxRetries) {
                console.error('Max retries reached. Please refresh the page.');
                return;
            }

            // Check if extension context is valid
            if (!this.isExtensionValid()) {
                this.retryCount++;
                this.debugLog(`Retrying initialization (${this.retryCount}/${this.maxRetries})...`);
                setTimeout(() => this.init(), 1000);
                return;
            }

            await this.waitForProblemLoad();
            // Show welcome message after page loads
            this.showWelcomeMessage();
            await this.extractProblemInfo();
            this.setupCodeObserver();
        } catch (error) {
            console.error('Initialization error:', error);
            this.retryCount++;
            setTimeout(() => this.init(), 1000);
        }
    }

    isExtensionValid() {
        try {
            // Test if we can access chrome.runtime
            return chrome.runtime && chrome.runtime.id;
        } catch (e) {
            return false;
        }
    }

    async waitForProblemLoad() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 40;

            const checkInterval = setInterval(() => {
                if (!this.isExtensionValid()) {
                    clearInterval(checkInterval);
                    resolve(false);
                    return;
                }

                attempts++;
                // Try different selectors for LeetCode's new UI
                const editorElement = document.querySelector('.monaco-editor') || document.querySelector('[data-monaco-editor-id]');
                const descriptionElement = document.querySelector('[data-track-load="description_content"]') || document.querySelector('.description__24sA');
                const titleElement = document.querySelector('.mr-2') || document.querySelector('div[data-cy="question-title"]');

                this.debugLog('Checking elements:', {
                    editor: !!editorElement,
                    description: !!descriptionElement,
                    title: !!titleElement,
                    attempts,
                    url: window.location.href
                });

                if ((editorElement && descriptionElement && titleElement) || attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    resolve(true);
                }
            }, 500);
        });
    }

    async sendProblemInfo(problemInfo) {
        if (!this.isExtensionValid()) {
            throw new Error('Extension context invalid');
        }

        if (!problemInfo) {
            console.log('No problem info to send');
            return;
        }

        try {
            // Store in chrome.storage instead of localStorage
            await chrome.storage.local.set({
                currentProblem: {
                    ...problemInfo,
                    lastUpdate: Date.now()
                }
            });

            // Send message to background script
            await chrome.runtime.sendMessage({
                type: 'problemInfo',
                data: problemInfo
            });

            this.debugLog('Problem info stored and sent:', {
                language: problemInfo.language,
                codeLength: problemInfo.userCode?.length || 0
            });
        } catch (error) {
            console.error('Failed to send problem info:', error);
        }
    }

    setupCodeObserver() {
        if (!this.isExtensionValid()) return;

        // Create a debounced version of extractProblemInfo
        const debouncedExtract = debounce(() => {
            this.refreshProblemInfo();
        }, 500);

        // Observe code changes in Monaco editor
        const editorElement = document.querySelector('.monaco-editor');
        if (editorElement) {
            const codeObserver = new MutationObserver(debouncedExtract);
            codeObserver.observe(editorElement, {
                childList: true,
                subtree: true,
                characterData: true
            });
            this.observers.push(codeObserver);
        }

        // Observe language selector changes
        const languageSelector = document.querySelector('button.rounded.items-center.whitespace-nowrap');
        if (languageSelector) {
            const languageObserver = new MutationObserver(debouncedExtract);
            languageObserver.observe(languageSelector.parentElement, {
                childList: true,
                subtree: true,
                attributes: true
            });
            this.observers.push(languageObserver);
        }
    }

    async extractProblemInfo() {
        if (this.isProcessing || !this.isExtensionValid()) return;
        this.isProcessing = true;

        try {
            // Get language first
            const language = this.getProgrammingLanguage();
            if (language === 'Loading...') {
                setTimeout(() => this.extractProblemInfo(), 1000);
                return;
            }

            // Get the current code
            const userCode = await this.getEditorCode();

            // Try multiple selectors for the title
            let title = '';
            const titleSelectors = [
                'div[data-cy="question-title"]',
                '.mr-2',
                'div[data-track-load="description_content"] .mr-2'
            ];

            for (const selector of titleSelectors) {
                const titleElement = document.querySelector(selector);
                if (titleElement) {
                    title = titleElement.textContent.trim();
                    break;
                }
            }

            // If no title found, try getting it from document title
            if (!title) {
                title = document.title.split('- LeetCode')[0].trim();
            }

            // Try multiple selectors for the description
            const descriptionSelectors = [
                '[data-track-load="description_content"]',
                '.description__24sA',
                '.content__u3I1'
            ];

            let description = '';
            for (const selector of descriptionSelectors) {
                const descriptionElement = document.querySelector(selector);
                if (descriptionElement) {
                    description = descriptionElement.textContent.trim();
                    break;
                }
            }

            // Try multiple selectors for difficulty
            const difficultyElement = document.querySelector('.text-olive, .text-yellow, .text-pink, .difficulty-label');
            let difficulty = 'Unknown';
            if (difficultyElement) {
                const text = difficultyElement.textContent.trim().toLowerCase();
                if (text.includes('easy') || difficultyElement.classList.contains('text-olive')) {
                    difficulty = 'Easy';
                } else if (text.includes('medium') || difficultyElement.classList.contains('text-yellow')) {
                    difficulty = 'Medium';
                } else if (text.includes('hard') || difficultyElement.classList.contains('text-pink')) {
                    difficulty = 'Hard';
                }
            }
            const problemInfo = {
                title,
                description,
                difficulty,
                userCode,
                language,
                url: window.location.href,
                timestamp: Date.now()
            };

            // Check if code or language has changed
            const hasChanged = !this.problemInfo ||
                this.problemInfo.language !== language ||
                this.problemInfo.userCode !== userCode;

            if (hasChanged) {
                this.problemInfo = problemInfo;
                await this.sendProblemInfo(problemInfo);

                this.debugLog('Updated problem info:', {
                    language: language,
                    codeLength: userCode.length,
                    timestamp: new Date().toISOString()
                });
            }

        } catch (error) {
            console.error('Error extracting problem info:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    async getEditorCode() {
        try {
            const codeArea = document.querySelector('.view-lines');
            if (codeArea) {
                const codeLines = Array.from(codeArea.querySelectorAll('.view-line'));
                const code = codeLines
                    .map(line => {
                        const spans = Array.from(line.querySelectorAll('span'));
                        return spans.map(span => span.textContent).join('');
                    })
                    .join('\n')
                    .trim();

                // Log the code being extracted
                this.debugLog('Code extracted:', code.substring(0, 100) + '...');
                return code;
            }
            return '';
        } catch (error) {
            console.error('Error getting editor code:', error);
            return '';
        }
    }

    cleanup() {
        // Disconnect all observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
    }

    // Add method to detect programming language
    getProgrammingLanguage() {
        try {
            const languageButton = document.querySelector('button.rounded.items-center.whitespace-nowrap.focus\\:outline-none.inline-flex');
            if (languageButton) {
                // Get only the text content before the div element
                const textNodes = Array.from(languageButton.childNodes)
                    .filter(node => node.nodeType === Node.TEXT_NODE);

                if (textNodes.length > 0) {
                    const language = textNodes[0].textContent.trim();
                    if (language && language !== 'Choose a type') {
                        this.debugLog('Language detected from new UI selector:', language);
                        return language;
                    }
                }
            }

            // If no language is detected yet, wait a bit and retry
            if (this.languageRetryCount < 3) {
                this.languageRetryCount++;
                this.debugLog(`Language not detected yet, retry ${this.languageRetryCount}/3`);
                setTimeout(() => this.extractProblemInfo(), 1000);
                return 'Loading...';
            }

            this.debugLog('No language detected after retries');
            return 'Unknown';
        } catch (error) {
            this.debugLog('Error detecting programming language:', error);
            return 'Unknown';
        }
    }

    // Add a method to force refresh problem info
    async refreshProblemInfo() {
        this.languageRetryCount = 0; // Reset retry counter
        this.isProcessing = false; // Reset processing flag
        await this.extractProblemInfo();
    }

    showWelcomeMessage() {
        // Check global flag first
        if (hasShownWelcomeGlobally) return;
        hasShownWelcomeGlobally = true;

        // Create welcome message container
        const welcome = document.createElement('div');
        welcome.className = 'mentor-welcome';
        welcome.style.cursor = 'pointer'; // Add pointer cursor to indicate clickability

        // Create and add logo
        const logo = document.createElement('img');
        logo.src = chrome.runtime.getURL('assets/icon.png');
        logo.alt = 'MentorAI';
        welcome.appendChild(logo);

        // Add welcome text
        const text = document.createElement('span');
        text.textContent = 'Hi! I\'m here to help you! 😊 Click to open';
        welcome.appendChild(text);

        // Add click handler to open extension and remove welcome message
        welcome.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'openExtension' });
            if (welcome && welcome.parentElement) {
                welcome.parentElement.removeChild(welcome);
            }
        });

        // Add to page
        document.body.appendChild(welcome);
    }
}

function initializeDetector() {
    if (isInitializing) return;
    isInitializing = true;

    try {
        // Clean up existing detector if it exists
        if (detector) {
            detector.cleanup();
            detector = null;
        }
        detector = new LeetCodeProblemDetector();
    } catch (error) {
        console.error('Error initializing LeetCodeProblemDetector:', error);
    } finally {
        isInitializing = false;
    }
}

// Initialize with a delay to ensure the page is fully loaded
setTimeout(initializeDetector, 1000);

// Handle page navigation with debounce
let lastUrl = location.href;
new MutationObserver(
    debounce(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            if (url.includes('leetcode.com/problems/')) {
                initializeDetector();
            }
        }
    }, 1000)
).observe(document, { subtree: true, childList: true });

// Additional observer for dynamic content loading with debounce
new MutationObserver(
    debounce((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                const descriptionContent = document.querySelector('div[data-track-load="description_content"]');
                if (descriptionContent && !isInitializing) {
                    if (detector) {
                        detector.debugLog('Description content loaded, re-running detector');
                    }
                    initializeDetector();
                    break;
                }
            }
        }
    }, 1000)
).observe(document.body, { childList: true, subtree: true }); 