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