chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'OPEN_PREVIEW') {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html#/preview') });
  }

  if (request.action === 'FETCH_IMAGE') {
    fetch(request.url)
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => sendResponse({ base64: reader.result });
        reader.onerror = () => sendResponse({ base64: null });
        reader.readAsDataURL(blob);
      })
      .catch(() => sendResponse({ base64: null }));

    return true;
  }
});
