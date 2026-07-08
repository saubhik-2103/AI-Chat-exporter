import {
  cleanClone,
  extractMath,
  convertLatexDelimiters,
  removeImages,
  extractUserImages,
  getChatTitle,
} from './base.js';

export const PLATFORM = {
  id: 'qwen',
  name: 'Qwen',
  host: 'chat.qwen.ai',
};

function cleanMonacoCodeBlocks(clone) {
  const codeBlocks = clone.querySelectorAll('.qwen-markdown-code, pre.qwen-markdown-code');
  codeBlocks.forEach(block => {
    // Try to get the language from the header
    const header = block.querySelector('.qwen-markdown-code-header');
    const lang = header?.textContent?.trim()?.split(/\s/)[0] || '';

    const viewLines = block.querySelectorAll('.view-line');
    let codeText = '';

    if (viewLines.length > 0) {
      codeText = Array.from(viewLines)
        .map(line => line.textContent)
        .join('\n');
    } else {
      const codeArea = block.querySelector('code, .monaco-editor, [class*="lines-content"]') || block;
      codeText = codeArea.textContent || '';
    }

    const pre = document.createElement('pre');
    const code = document.createElement('code');
    if (lang) code.className = `language-${lang.toLowerCase()}`;
    code.textContent = codeText;
    pre.appendChild(code);
    block.replaceWith(pre);
  });
}


function removeQwenUI(clone) {
  clone.querySelectorAll('.qwen-chat-thinking-tool-status-card-wraper, [class*="thinking-tool"]').forEach(el => el.remove());

  clone.querySelectorAll('.qwen-markdown-table-header').forEach(el => el.remove());

  clone.querySelectorAll('.qwen-markdown-code-header').forEach(el => el.remove());
}

export async function scrape() {
  const chatTitle = getChatTitle(
    ['\\s*-\\s*Qwen\\s*$', '\\s*\\|\\s*Qwen\\s*$'],
    'Exported Qwen Chat'
  );

  const messages = [];

  // Primary selectors
  const userNodes = document.querySelectorAll('.qwen-chat-message-user');
  const aiNodes = document.querySelectorAll('.qwen-chat-message-assistant');

  let allNodes = [
    ...Array.from(userNodes).map(n => ({ node: n, role: 'user' })),
    ...Array.from(aiNodes).map(n => ({ node: n, role: 'model' })),
  ];

  if (allNodes.length === 0) {
    const userFallback = document.querySelectorAll('[class*="message-user"], [data-role="user"]');
    const aiFallback = document.querySelectorAll('[class*="message-assistant"], [data-role="assistant"]');

    allNodes = [
      ...Array.from(userFallback).map(n => ({ node: n, role: 'user' })),
      ...Array.from(aiFallback).map(n => ({ node: n, role: 'model' })),
    ];
  }

  // Sort by DOM order
  allNodes.sort((a, b) => {
    const pos = a.node.compareDocumentPosition(b.node);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });

  for (const { node, role } of allNodes) {
    let contentNode;
    if (role === 'user') {
      contentNode = node.querySelector('.user-message-content') || node;
    } else {
      contentNode = node.querySelector('.custom-qwen-markdown, .qwen-markdown') || node;
    }

    const clone = cleanClone(contentNode);

    // Qwen-specific cleanup
    removeQwenUI(clone);
    cleanMonacoCodeBlocks(clone);

    // Standard processing
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
        htmlContent: '<p>Warning: Qwen DOM structure may have changed. Full page scrape executed.</p>' + chatArea.innerHTML,
      });
    }
  }

  return { title: chatTitle, messages, platform: PLATFORM.id };
}
