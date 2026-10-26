function init() {
  if (!document.body) return;

  const alertContainer = document.createElement('div');
  alertContainer.id = 'cb-alert-container';
  document.body.appendChild(alertContainer);

  function scanDocumentText() {
    const root = document.body;
    if (!root) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest('#cb-alert-container')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const texts = [];
    let node;
    while ((node = walker.nextNode())) {
      const value = node.textContent?.trim();
      if (value) texts.push(value);
    }

    texts.forEach(text => handleTextContent(text));
  }

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        processNewContent(mutation.addedNodes);
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  function processNewContent(nodes) {
    nodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        handleTextContent(node.textContent);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const text = node.textContent?.trim();
        if (text) handleTextContent(text);
      }
    });
  }

  function handleTextContent(text) {
    if (!text || typeof text !== 'string') return;

    const cleanText = text
      .replace(/[^\w\s.,!?'\-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanText.length > 5) {
      chrome.runtime.sendMessage({
        action: 'analyzeContent',
        text: cleanText.substring(0, 500),
        url: location.href
      });
    }
  }

  scanDocumentText();

  chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'bullying-found') {
      showBullyingAlert(request.text, alertContainer);
    }
  });
}

function showBullyingAlert(text, alertContainer) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'cb-alert';
  alertDiv.innerHTML = `
    <div class="cb-alert-content">
      <h3>⚠️ Potential Bullying Content Found</h3>
      <button class="cb-close-btn" type="button">×</button>
    </div>
  `;

  alertDiv.querySelector('.cb-close-btn').addEventListener('click', () => {
    alertDiv.remove();
  });

  alertContainer.appendChild(alertDiv);
  setTimeout(() => alertDiv.remove(), 5000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}