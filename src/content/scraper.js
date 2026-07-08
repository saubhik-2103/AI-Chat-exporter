export async function scrapeGeminiChat() {
  const titleElement = document.querySelector('title');
  const chatTitle = titleElement
    ? titleElement.innerText.replace(/\s*-\s*Google Gemini\s*$/i, '').replace(/\s*-\s*Gemini\s*$/i, '').trim()
    : 'Exported Gemini Chat';

  const messages = [];
  const chatNodes = document.querySelectorAll('user-query, model-response');

  for (const node of chatNodes) {
    const isUser = node.tagName.toLowerCase() === 'user-query';
    
    let contentNode;
    if (isUser) {
      contentNode = node.querySelector('.query-text, [data-test-id="user-query"]') || node;
    } else {
      contentNode = node.querySelector('.markdown, .message-content') || node;
    }

    const clone = contentNode.cloneNode(true);
    const uiButtons = clone.querySelectorAll('button, [role="button"], mat-icon, .action-buttons');
    uiButtons.forEach(btn => btn.remove());

    const allElements = clone.querySelectorAll('*');
    allElements.forEach(el => {
      if (el.textContent.trim() === 'You said') {
        el.remove();
      }
    });

    // math extraction
    const displayMathEls = clone.querySelectorAll('.math-block, .katex-display');
    displayMathEls.forEach(el => {
      const tex = el.getAttribute('data-math')
        || (el.querySelector('annotation[encoding="application/x-tex"]') || {}).textContent
        || null;
      if (tex) {
        const marker = document.createElement('span');
        marker.className = 'math-tex math-display';
        marker.setAttribute('data-tex', tex.trim());
        marker.textContent = tex.trim();
        el.replaceWith(marker);
      }
    });

    // Inline math
    const inlineMathEls = clone.querySelectorAll('.math-inline, .katex:not(.katex-display .katex)');
    inlineMathEls.forEach(el => {
      const tex = el.getAttribute('data-math')
        || (el.querySelector('annotation[encoding="application/x-tex"]') || {}).textContent
        || null;
      if (tex) {
        const marker = document.createElement('span');
        marker.className = 'math-tex';
        marker.setAttribute('data-tex', tex.trim());
        marker.textContent = tex.trim();
        el.replaceWith(marker);
      }
    });

    const cloneImages = clone.querySelectorAll('img');
    cloneImages.forEach(img => img.remove());

    let htmlString = clone.innerHTML.trim();

    // Image extraction
    if (isUser) {
      const attachedImages = node.querySelectorAll('img');
      let imagesHtml = '';
      
      for (const img of attachedImages) {
        const src = img.src || '';
        
        // Filter out tiny UI avatars
        if (src && !src.includes('/avatar/') && !img.className.includes('avatar') && !src.includes('data:image/svg')) {
          
          let base64 = null;

          try {
            if (src.startsWith('blob:')) {
              const res = await fetch(src);
              const blob = await res.blob();
              base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
              });
            } else {
              const response = await chrome.runtime.sendMessage({ action: 'FETCH_IMAGE', url: src });
              if (response && response.base64) {
                base64 = response.base64;
              }
            }
            
            // Fallback
            if (!base64) {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth || img.width || 100;
              canvas.height = img.naturalHeight || img.height || 100;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL('image/png');
              if (!dataUrl.startsWith('data:image/png;base64,AAAA')) {
                base64 = dataUrl;
              }
            }
          } catch (e) {
            console.warn('All image extraction methods failed:', e.message);
          }

          if (base64) {
            imagesHtml += `
              <div style="margin-bottom: 12px;">
                <img src="${base64}" alt="Attached image" style="max-width: 100%; height: auto;" />
              </div>
            `;
          } else {
            imagesHtml += `<img src="broken" alt="image" />`;
          }
        }
      }
      
      if (imagesHtml) {
        htmlString = imagesHtml + htmlString;
      }
    }

    messages.push({
      role: isUser ? 'user' : 'model',
      htmlContent: htmlString
    });
  }

  if (messages.length === 0) {
    const mainChat = document.querySelector('main, .conversation-container');
    if (mainChat) {
      messages.push({
        role: 'model',
        htmlContent: '<p>Warning: Gemini DOM structure changed. Full page scrape executed.</p>' + mainChat.innerHTML
      });
    }
  }

  return { title: chatTitle, messages };
}