async function loadState() {
  const result = await chrome.storage.local.get('lastBullyingDetection');
  const data = result.lastBullyingDetection || { isBullying: false, text: '' };

  const statusEl = document.getElementById('status');
  const textEl = document.getElementById('text');

  if (data.isBullying) {
    statusEl.textContent = 'Potential bullying detected';
    statusEl.classList.add('warning');
    textEl.textContent = data.text || 'Detected bullying content was found on the page.';
  } else {
    statusEl.textContent = 'No bullying detected';
    statusEl.classList.remove('warning');
    textEl.textContent = 'No bullying text detected yet.';
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'bullying-found') {
    loadState();
  }
});

loadState();
