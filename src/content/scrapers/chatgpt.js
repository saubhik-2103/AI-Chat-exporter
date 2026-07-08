import {
  cleanClone,
  extractMath,
  convertLatexDelimiters,
  removeImages,
  extractUserImages,
  getChatTitle,
} from './base.js';

export const PLATFORM = {
  id: 'chatgpt',
  name: 'ChatGPT',
  host: 'chatgpt.com',
};

export async function scrape() {
  const chatTitle = getChatTitle(
    ['\\s*-\\s*ChatGPT\\s*$', '\\s*\\|\\s*ChatGPT\\s*$'],
    'Exported ChatGPT Chat'
  );

  const messages = [];

  const userNodes = document.querySelectorAll('[data-message-author-role="user"]');
  const assistantNodes = document.querySelectorAll('[data-message-author-role="assistant"]');

  const allNodes = [
    ...Array.from(userNodes).map(n => ({ node: n, role: 'user' })),
    ...Array.from(assistantNodes).map(n => ({ node: n, role: 'model' })),
  ];

  // Sort by DOM order
  allNodes.sort((a, b) => {
    const pos = a.node.compareDocumentPosition(b.node);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });

  for (const { node, role } of allNodes) {
    const contentNode =
      node.querySelector('.markdown, .whitespace-pre-wrap, [data-message-content]') || node;

    const clone = cleanClone(contentNode);

    extractMath(clone);
    removeImages(clone);

    let htmlString = clone.innerHTML.trim();
    htmlString = convertLatexDelimiters(htmlString);

    if (role === 'user') {
      const imagesHtml = await extractUserImages(node);
      if (imagesHtml) {
        htmlString = imagesHtml + htmlString;
      }
    }

    if (htmlString) {
      messages.push({ role, htmlContent: htmlString });
    }
  }

  // Fallback
  if (messages.length === 0) {
    const mainChat = document.querySelector('main, [role="main"]');
    if (mainChat) {
      messages.push({
        role: 'model',
        htmlContent: '<p>Warning: ChatGPT DOM structure may have changed. Full page scrape executed.</p>' + mainChat.innerHTML,
      });
    }
  }

  return { title: chatTitle, messages, platform: PLATFORM.id };
}
