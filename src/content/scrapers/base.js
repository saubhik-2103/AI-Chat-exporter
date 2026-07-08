export function cleanClone(node) {
  const clone = node.cloneNode(true);
  const uiElements = clone.querySelectorAll(
    'button, [role="button"], mat-icon, .action-buttons, [data-testid*="copy"], [data-testid*="thumb"], [data-testid*="share"]'
  );
  uiElements.forEach(el => el.remove());
  return clone;
}


export function extractMath(clone) {
  // Display math
  const displayMathEls = clone.querySelectorAll('.math-block, .katex-display, .math-display');
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
}

export function convertLatexDelimiters(html) {
  html = html.replace(/\\\[([\s\S]*?)\\\]/g, (_, tex) => {
    return `<span class="math-tex math-display" data-tex="${escapeAttr(tex.trim())}">${escapeHtml(tex.trim())}</span>`;
  });
  html = html.replace(/\\\(([\s\S]*?)\\\)/g, (_, tex) => {
    return `<span class="math-tex" data-tex="${escapeAttr(tex.trim())}">${escapeHtml(tex.trim())}</span>`;
  });

  return html;
}

export function removeImages(clone) {
  clone.querySelectorAll('img').forEach(img => img.remove());
}
export async function extractUserImages(originalNode) {
  const attachedImages = originalNode.querySelectorAll('img');
  let imagesHtml = '';

  for (const img of attachedImages) {
    const src = img.src || '';

    if (
      src &&
      !src.includes('/avatar/') &&
      !img.className.includes('avatar') &&
      !src.includes('data:image/svg') &&
      (img.naturalWidth || 0) > 32
    ) {
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

        // Fallback: Canvas extraction
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
        console.warn('[AI Exporter] Image extraction failed:', e.message);
      }

      if (base64) {
        imagesHtml += `
          <div style="margin-bottom: 12px;">
            <img src="${base64}" alt="Attached image" style="max-width: 100%; height: auto;" />
          </div>
        `;
      }
    }
  }

  return imagesHtml;
}


export function getChatTitle(suffixPatterns, fallback) {
  const titleElement = document.querySelector('title');
  if (!titleElement) return fallback;

  let title = titleElement.innerText.trim();
  for (const pattern of suffixPatterns) {
    title = title.replace(new RegExp(pattern, 'i'), '').trim();
  }
  return title || fallback;
}


function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
