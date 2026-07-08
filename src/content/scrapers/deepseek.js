import {
  cleanClone,
  extractMath,
  convertLatexDelimiters,
  removeImages,
  extractUserImages,
  getChatTitle,
} from './base.js';

export const PLATFORM = {
  id: 'deepseek',
  name: 'DeepSeek',
  host: 'chat.deepseek.com',
};

function findMessagePairs() {
  const results = [];

  const markdownBlocks = document.querySelectorAll('.ds-markdown');

  if (markdownBlocks.length > 0) {
    for (const mdBlock of markdownBlocks) {
      let aiContainer = mdBlock.closest('[class*="message"], [class*="chat"], [class*="turn"]') || mdBlock.parentElement;

      let prevSibling = aiContainer?.previousElementSibling;

      if (prevSibling && !prevSibling.querySelector('.ds-markdown')) {
        results.push({ node: prevSibling, role: 'user' });
      }

      results.push({ node: aiContainer, role: 'model' });
    }
  }

  // Deduplicate by node reference
  const seen = new Set();
  return results.filter(item => {
    if (seen.has(item.node)) return false;
    seen.add(item.node);
    return true;
  });
}

export async function scrape() {
  const chatTitle = getChatTitle(
    ['\\s*-\\s*DeepSeek\\s*$', '\\s*\\|\\s*DeepSeek\\s*$'],
    'Exported DeepSeek Chat'
  );

  const messages = [];
  const pairs = findMessagePairs();

  if (pairs.length > 0) {
    for (const { node, role } of pairs) {
      let contentNode;
      if (role === 'model') {
        contentNode = node.querySelector('.ds-markdown') || node;
      } else {
        contentNode = node;
      }

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
  }

  if (messages.length === 0) {
    const chatArea = document.querySelector('[class*="conversation"], [class*="chat-list"], main');
    if (chatArea) {
      const children = Array.from(chatArea.children);
      children.forEach((child, index) => {
        const hasMarkdown = child.querySelector('.ds-markdown');
        const role = hasMarkdown ? 'model' : 'user';
        const clone = cleanClone(child);
        removeImages(clone);
        let htmlString = clone.innerHTML.trim();
        htmlString = convertLatexDelimiters(htmlString);

        if (htmlString) {
          messages.push({ role, htmlContent: htmlString });
        }
      });
    }
  }

  return { title: chatTitle, messages, platform: PLATFORM.id };
}
