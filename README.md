# MentorAI Chrome Extension

A Chrome extension that provides AI-powered assistance for solving LeetCode problems, offering hints, solutions, and explanations using multiple AI providers.

## Features

- 🤖 Multi-provider AI support (OpenAI GPT-3.5, Google Gemini)
- 💡 Contextual hints and optimization suggestions
- 📝 Detailed solution explanations
- 🔍 Code analysis and complexity assessment
- 🎨 Syntax-highlighted code formatting
- 🔐 Secure API key management

## Architecture

### Core Components

1. **Popup Interface**
   - React-based UI for user interactions
   - Settings management for API configurations
   - Response display with syntax highlighting

2. **AI Integration Layer**
   - Provider-agnostic API interface
   - Response formatting and normalization
   - Error handling and retry logic

3. **Security Layer**
   - Secure API key storage
   - Provider authentication management
   - Content Security Policy implementation

### Design Decisions

1. **Multi-Provider Support**
   - Modular provider integration system
   - Unified response format across providers
   - Provider-specific prompt optimization

2. **Security First**
   - Local storage encryption for API keys
   - Strict CSP rules
   - Minimal permission requirements

3. **User Experience**
   - Instant feedback for user actions
   - Smooth transitions between states
   - Clear error messaging

## Installation

1. **Clone and Setup**
   ```bash
   git clone https://github.com/ItamarKfir/MentorAI.git

2. **Configure API Keys**
   - Obtain API keys from supported providers:
     - OpenAI: https://platform.openai.com/
     - Google AI (Easy & Free): https://aistudio.google.com/apikey

3. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `MentorAI` directory

## Usage

1. **Initial Setup**
   - Click the MentorAI extension icon
   - Enter your API keys in the settings section
   - Select your preferred AI provider

2. **Getting Help**
   - Navigate to any LeetCode problem
   - Click the extension icon
   - Choose from:
     - Get Hint
     - Get Solution
     - Get Explanation

## Development

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- Chrome browser

## Future Enhancements

1. **Technical Improvements**
   - Add support for more AI providers
   - Implement response caching
   - Add offline mode with cached responses
   - Enhance error recovery mechanisms

2. **Feature Additions**
   - Time complexity analysis
   - Code performance metrics
   - Interactive debugging suggestions
   - Custom prompt templates

3. **User Experience**
   - Customizable UI themes
   - Keyboard shortcuts
   - Response history
   - Code diff visualization

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Itamar Kfir**
- Email: ItamarKfirs@gmail.com
- GitHub: [ItamarKfir](https://github.com/ItamarKfir)

## Acknowledgments

- OpenAI for GPT-3.5 API
- Google for Gemini API
- LeetCode for the problem platform
- Contributors and testers
