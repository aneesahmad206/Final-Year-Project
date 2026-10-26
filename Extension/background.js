let analysisQueue = [];
let isProcessing = false;

function setDetectionState(result) {
  const entry = {
    isBullying: !!result?.is_bullying,
    text: result?.original_text || result?.text || '',
    timestamp: Date.now()
  };

  chrome.storage.local.set({ lastBullyingDetection: entry });
  chrome.action.setBadgeText({ text: entry.isBullying ? '!' : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#d93025' });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'analyzeContent') {
    const tabId = sender?.tab?.id;
    if (typeof tabId === 'number') {
      analysisQueue.push({
        text: message.text,
        tabId
      });
      processQueue();
    }
    return true;
  }

  if (message.type === 'bullying-found') {
    setDetectionState({ is_bullying: true, original_text: message.text });
    return true;
  }
});

async function processQueue() {
  if (isProcessing || analysisQueue.length === 0) return;
  isProcessing = true;

  const { text, tabId } = analysisQueue.shift();

  try {
    const response = await fetch('http://localhost:8080/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (response.ok) {
      const result = await response.json();
      setDetectionState(result);

      if (result.is_bullying && typeof tabId === 'number') {
        chrome.tabs.sendMessage(tabId, {
          type: 'bullying-found',
          text
        }, () => {
          const err = chrome.runtime.lastError;
          if (err) {
            console.warn('No content script listener on tab:', err.message);
          }
        });
      }
    } else {
      console.error('Backend responded with status:', response.status);
    }
  } catch (error) {
    console.error('Detection error:', error);
  }

  isProcessing = false;
  setTimeout(processQueue, 100);
}

chrome.action.setBadgeText({ text: '' });