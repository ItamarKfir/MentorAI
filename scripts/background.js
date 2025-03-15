let lastProblemInfo = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'problemInfo') {
        chrome.storage.local.set({ currentProblem: message.data }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error storing problem info:', chrome.runtime.lastError);
            } else {
                console.log('Problem info updated in storage:', message.data.language);
            }
        });
    } else if (message.type === 'openExtension') {
        // Trigger the extension popup by clicking the extension icon programmatically
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            chrome.action.openPopup && chrome.action.openPopup() || 
            chrome.action.setPopup({ 
                tabId: tab.id,
                popup: 'popup/popup.html'
            }, () => {
                // After setting the popup, programmatically click the extension icon
                chrome.action.getUserSettings(() => {
                    chrome.action.setBadgeText({ text: '' });
                });
            });
        });
    }
});

// Clear problem data when navigating away from LeetCode
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && !changeInfo.url.includes('leetcode.com/problems/')) {
        chrome.storage.local.remove('currentProblem');
        lastProblemInfo = null;
    }
});

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('MentorAI Extension installed');
});

// Replace the openPopup code with this:
chrome.action.onClicked.addListener((tab) => {
    // The popup will open automatically if defined in manifest.json
    // No need to call openPopup
}); 