import {
  cleanClone,
  extractMath,
  convertLatexDelimiters,
  removeImages,
  extractUserImages,
  getChatTitle,
} from './base.js';

export const PLATFORM = {
  id: 'claude',
  name: 'Claude',
  host: 'claude.ai',
};

export async function scrape() {
  const chatTitle = getChatTitle(
    ['\\s*-\\s*Claude\\s*$', '\\s*\\|\\s*Claude\\s*$', '\\s*·\\s*Claude\\s*$'],
    'Exported Claude Chat'
  );

  const messages = [];

  const humanMsgs = document.querySelectorAll('[data-testid="human-message"]');
  const aiMsgs = document.querySelectorAll(
    '.font-claude-response, .font-claude-message, [data-testid="ai-message"], [data-testid="message-assistant"]'
  );

  let allNodes = [
    ...Array.from(humanMsgs).map(n => ({ node: n, role: 'user' })),
    ...Array.from(aiMsgs).map(n => ({ node: n, role: 'model' })),
  ];

  if (allNodes.length === 0) {
    const userByFont = document.querySelectorAll('.font-user-message, [data-testid="message-human"]');
    const aiByFont = document.querySelectorAll('.font-claude-message, .font-claude-response');

    allNodes = [
      ...Array.from(userByFont).map(n => ({ node: n, role: 'user' })),
      ...Array.from(aiByFont).map(n => ({ node: n, role: 'model' })),
    ];
  }

  if (allNodes.length === 0) {
    const markdownBlocks = document.querySelectorAll('.standard-markdown, .progressive-markdown, .markdown');
    for (const md of markdownBlocks) {
      const container = md.closest('[class*="message"], [class*="turn"], [class*="response"]') || md.parentElement;
      if (!container) continue;

      const prevSibling = container.previousElementSibling;
      if (prevSibling && !prevSibling.querySelector('.standard-markdown, .progressive-markdown, .markdown')) {
        allNodes.push({ node: prevSibling, role: 'user' });
      }
      allNodes.push({ node: container, role: 'model' });
    }

    // Deduplicate
    const seen = new Set();
    allNodes = allNodes.filter(item => {
      if (seen.has(item.node)) return false;
      seen.add(item.node);
      return true;
    });
  }

  // Sort by DOM order
  allNodes.sort((a, b) => {
    const pos = a.node.compareDocumentPosition(b.node);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });

  for (const { node, role } of allNodes) {
    // Find the content area within the message
    const contentNode =
      node.querySelector('.standard-markdown, .progressive-markdown, .markdown, .prose, [class*="message-content"]') || node;

    const clone = cleanClone(contentNode);
    extractMath(clone);
    removeImages(clone);

    let htmlString = clone.innerHTML.trim();
    htmlString = convertLatexDelimiters(htmlString);

    // Extract user-attached images
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

  // Fallback: whole conversation area
  if (messages.length === 0) {
    const chatArea = document.querySelector('[class*="conversation"], main, [role="main"]');
    if (chatArea) {
      messages.push({
        role: 'model',
        htmlContent: '<p>Warning: Claude DOM structure may have changed. Full page scrape executed.</p>' + chatArea.innerHTML,
      });
    }
  }

  return { title: chatTitle, messages, platform: PLATFORM.id };
}

