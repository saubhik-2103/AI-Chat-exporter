import {
  cleanClone,
  extractMath,
  convertLatexDelimiters,
  removeImages,
  extractUserImages,
  getChatTitle,
} from './base.js';

export const PLATFORM = {
  id: 'lechat',
  name: 'Le Chat',
  host: 'chat.mistral.ai',
};

function findMessages() {
  const results = [];

  const roleMessages = document.querySelectorAll('[data-role], [data-testid*="message"]');
  if (roleMessages.length > 0) {
    for (const msg of roleMessages) {
      const role = msg.getAttribute('data-role');
      if (role === 'user' || role === 'human') {
        results.push({ node: msg, role: 'user' });
      } else if (role === 'assistant' || role === 'model') {
        results.push({ node: msg, role: 'model' });
      } else {
        // Try testid
        const testId = msg.getAttribute('data-testid') || '';
        if (testId.includes('user')) {
          results.push({ node: msg, role: 'user' });
        } else if (testId.includes('assistant') || testId.includes('bot')) {
          results.push({ node: msg, role: 'model' });
        }
      }
    }
  }

  if (results.length === 0) {
    const proseBlocks = document.querySelectorAll('.prose, .markdown, [class*="markdown"]');
    for (const prose of proseBlocks) {
      const container = prose.closest('[class*="message"], [class*="turn"], [class*="chat-item"]') || prose.parentElement;
      if (!container) continue;

      const prevSibling = container.previousElementSibling;

      if (prevSibling && !prevSibling.querySelector('.prose, .markdown, [class*="markdown"]')) {
        results.push({ node: prevSibling, role: 'user' });
      }
      results.push({ node: container, role: 'model' });
    }
  }

  const seen = new Set();
  return results.filter(item => {
    if (seen.has(item.node)) return false;
    seen.add(item.node);
    return true;
  });
}

export async function scrape() {
  const chatTitle = getChatTitle(
    ['\\s*-\\s*Le Chat\\s*$', '\\s*\\|\\s*Mistral\\s*$', '\\s*-\\s*Mistral\\s*$'],
    'Exported Le Chat Conversation'
  );

  const messages = [];
  const foundMessages = findMessages();

  for (const { node, role } of foundMessages) {
    const contentNode =
      node.querySelector('.prose, .markdown, [class*="markdown"], [class*="content"]') || node;

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
    const chatArea = document.querySelector('main, [role="main"], [class*="conversation"]');
    if (chatArea) {
      messages.push({
        role: 'model',
        htmlContent: '<p>Warning: Le Chat DOM structure may have changed. Full page scrape executed.</p>' + chatArea.innerHTML,
      });
    }
  }

  return { title: chatTitle, messages, platform: PLATFORM.id };
}
