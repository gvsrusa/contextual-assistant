# Contextual Assistant - Content Summarizer Chrome Extension

## Project Description

The Contextual Assistant is a Chrome extension designed to intelligently summarize various forms of online content, including articles, videos, and audio. It provides an interactive chat interface, allowing users to engage with the summarized content for deeper understanding and quick information retrieval. The extension features a modular architecture that supports multiple Large Language Models (LLMs) and is built to handle diverse content types effectively. Its goal is to enhance users' browsing experience by making information consumption more efficient and interactive.

## Features

### Current Features

*   **Versatile Content Summarization:** Generates concise summaries for web pages, articles, and video transcripts.
*   **Interactive Chat:** Allows users to ask questions and get answers based on the summarized content.
*   **Multi-LLM Support:** Integrates with various LLM providers:
    *   OpenAI (GPT models)
    *   Anthropic (Claude models)
    *   Google (Gemini models)
    *   Local LLMs (via a compatible API endpoint)
*   **Timestamp Navigation:** Clickable timestamps in video summaries allow direct navigation to specific points in the video.
*   **Context Management:** Intelligently manages conversation history and context length to optimize LLM interactions.
*   **User-Friendly Interface:**
    *   **Extension Popup:** Provides quick access to summarization, chat, and settings.
    *   **In-Page UI:** Offers a sidebar or overlay for a more integrated experience (as described in the architecture).
*   **Customizable Settings:** Users can configure:
    *   Preferred LLM provider and API key.
    *   Default summary length (short, medium, long).
    *   UI preferences (theme, position).
    *   Option to include timestamps in summaries.
    *   Auto-summarize feature.

### Planned Features (Based on Architecture Document)

*   **Advanced Content Detection:** Improved logic for identifying and extracting content from a wider variety of web page structures and article types.
*   **Enhanced Transcription Services:** Deeper integration with transcription services like AssemblyAI for more accurate video and audio content processing.
*   **Sophisticated Context Compression:** Advanced techniques for summarizing chat history to maintain longer conversations within LLM context limits.
*   **Floating Action Button (FAB):** A quick-access button on supported pages for easy summarization.
*   **Secure API Key Storage:** Enhanced security for storing user API keys, potentially integrating with system keychain.
*   **Performance Optimizations:**
    *   Content chunking for processing large documents or transcripts.
    *   Caching of extracted content to speed up repeated operations.
*   **Broader Platform Support:** While currently a Chrome extension, the architecture aims for modularity that could facilitate adaptation to other platforms.

## Installation Instructions

### From Chrome Web Store (Recommended for Users)

*   (Once published) A link to the Chrome Web Store page will be available here.

### From Source (For Developers or Testers)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/contextual-assistant.git
    cd contextual-assistant
    ```
2.  **Open Chrome and navigate to Extensions:** Go to `chrome://extensions/`.
3.  **Enable Developer Mode:** Toggle the "Developer mode" switch, usually found in the top right corner.
4.  **Load Unpacked Extension:**
    *   Click on the "Load unpacked" button.
    *   Select the directory where you cloned the repository (e.g., `contextual-assistant`).
5.  The extension icon should now appear in your Chrome toolbar.

## Basic Usage Instructions

1.  **Open the Extension:** Click the Contextual Assistant icon in your Chrome toolbar.
2.  **Summarize Content:**
    *   Navigate to a web page, article, or video you want to summarize.
    *   Open the extension popup.
    *   The extension will attempt to detect the content type.
    *   Select your desired summary length (short, medium, long).
    *   Click the "Summarize Content" button. The summary will appear in the popup.
3.  **Chat with Content:**
    *   Once a summary is generated, the chat interface will become active.
    *   Type your questions about the content into the chat input field and press Enter or click "Send."
    *   The AI will respond based on the information in the summary.
4.  **Access Settings:**
    *   In the popup, click the settings icon (usually a gear symbol) to open the options page.
    *   Here, you can configure your LLM provider, API key, default summary length, UI theme, and other preferences.

## Development Setup

To set up the development environment and contribute to the project:

1.  **Prerequisites:**
    *   Google Chrome browser.
    *   Git installed on your system.
    *   (Optional, if frontend dependencies are added later) Node.js and npm/yarn.
2.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-username/contextual-assistant.git
    cd contextual-assistant
    ```
3.  **Install Dependencies:**
    *   Currently, the project (based on the architecture document) primarily uses vanilla JavaScript, HTML, and CSS for the extension components. If build tools or specific frontend dependencies (e.g., for UI frameworks, SCSS compilation) are introduced, run:
        ```bash
        # npm install  (or yarn install)
        ```
        (Note: Add a `package.json` if such dependencies are needed.)
4.  **Load the Extension in Chrome:**
    *   Follow the steps in the "Installation Instructions > From Source" section to load the extension in developer mode.
5.  **Making Changes:**
    *   Modify the source code in your local repository.
    *   After saving changes, you typically need to reload the extension in `chrome://extensions/` for the changes to take effect. Click the "reload" icon (a circular arrow) for the Contextual Assistant extension.

## Contribution Guidelines

We welcome contributions to improve the Contextual Assistant! Here's how you can help:

### Reporting Bugs

*   If you find a bug, please check the [GitHub Issues](https://github.com/your-username/contextual-assistant/issues) page to see if it has already been reported.
*   If not, create a new issue. Provide a clear title, a detailed description of the bug, steps to reproduce it, and information about your environment (e.g., Chrome version, OS).

### Suggesting Features or Enhancements

*   If you have an idea for a new feature or an improvement to an existing one, please open an issue on GitHub.
*   Describe the feature, its potential benefits, and any implementation ideas you might have.

### Submitting Pull Requests (PRs)

1.  **Fork the Repository:** Create your own fork of the `contextual-assistant` repository on GitHub.
2.  **Create a Branch:** Create a new branch in your forked repository for your changes. Use a descriptive branch name (e.g., `feat/add-new-llm-provider` or `fix/summary-display-bug`).
    ```bash
    git checkout -b your-branch-name
    ```
3.  **Make Your Changes:** Implement your feature or bug fix. Ensure your code follows the project's coding style (if defined).
4.  **Test Your Changes:** Thoroughly test your modifications to ensure they work as expected and do not introduce new issues.
5.  **Commit Your Changes:** Write clear and concise commit messages.
    ```bash
    git add .
    git commit -m "Brief description of your changes"
    ```
6.  **Push to Your Fork:**
    ```bash
    git push origin your-branch-name
    ```
7.  **Create a Pull Request:**
    *   Go to the original `contextual-assistant` repository on GitHub.
    *   Click on "Pull requests" and then "New pull request."
    *   Choose your fork and branch to compare with the main repository's `main` or `develop` branch.
    *   Provide a clear title and description for your PR, explaining the changes you've made and why.
    *   Submit the pull request.

We will review your PR as soon as possible. Thank you for contributing!
---

*Note: Replace `your-username/contextual-assistant.git` with the actual repository URL once it's established.*