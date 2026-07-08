import {
  cleanClone,
  extractMath,
  removeImages,
  extractUserImages,
  getChatTitle,
} from './base.js';

export const PLATFORM = {
  id: 'gemini',
  name: 'Gemini',
  host: 'gemini.google.com',
};

export async function scrape() {
  const chatTitle = getChatTitle(
    ['\\s*-\\s*Google Gemini\\s*$', '\\s*-\\s*Gemini\\s*$'],
    'Exported Gemini Chat'
  );

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

    // Clean up UI buttons
    const clone = cleanClone(contentNode);

    const allElements = clone.querySelectorAll('*');
    allElements.forEach(el => {
      if (el.textContent.trim() === 'You said') {
        el.remove();
      }
    });

    extractMath(clone);

    removeImages(clone);

    let htmlString = clone.innerHTML.trim();

    // Extract user-attached images
    if (isUser) {
      const imagesHtml = await extractUserImages(node);
      if (imagesHtml) {
        htmlString = imagesHtml + htmlString;
      }
    }

    messages.push({
      role: isUser ? 'user' : 'model',
      htmlContent: htmlString,
    });
  }

  if (messages.length === 0) {
    const mainChat = document.querySelector('main, .conversation-container');
    if (mainChat) {
      messages.push({
        role: 'model',
        htmlContent: '<p>Warning: Gemini DOM structure changed. Full page scrape executed.</p>' + mainChat.innerHTML,
      });
    }
  }

  return { title: chatTitle, messages, platform: PLATFORM.id };
}
