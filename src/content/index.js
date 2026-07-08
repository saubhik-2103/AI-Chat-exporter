import * as geminiScraper from './scrapers/gemini.js';
import * as chatgptScraper from './scrapers/chatgpt.js';
import * as deepseekScraper from './scrapers/deepseek.js';
import * as claudeScraper from './scrapers/claude.js';
import * as lechatScraper from './scrapers/lechat.js';
import * as qwenScraper from './scrapers/qwen.js';

const SCRAPERS = [
  geminiScraper,
  chatgptScraper,
  deepseekScraper,
  claudeScraper,
  lechatScraper,
  qwenScraper,
];

function detectPlatform() {
  const hostname = window.location.hostname;
  for (const mod of SCRAPERS) {
    if (hostname.includes(mod.PLATFORM.host)) {
      return mod;
    }
  }
  return null;
}

const activeScraper = detectPlatform();

if (!activeScraper) {
  console.warn('[AI Exporter] No scraper found for:', window.location.hostname);
}

const platformName = activeScraper?.PLATFORM?.name || 'AI Chat';

let btnX = 80;
let btnY = 20;

const exportBtn = document.createElement('button');
exportBtn.innerText = `✦ Export to PDF`;
exportBtn.style.cssText = `
  position: fixed !important;
  top: ${btnY}px !important;
  left: ${btnX}px !important;
  z-index: 9999 !important;
  background: #2563EB !important;
  color: white !important;
  padding: 10px 16px !important;
  border-radius: 8px !important;
  font-weight: bold !important;
  cursor: grab !important;
  border: none !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
  font-size: 14px !important;
  line-height: 1.2 !important;
  margin: 0 !important;
  box-sizing: border-box !important;
  height: auto !important;
  width: auto !important;
  min-height: 0 !important;
  min-width: 0 !important;
  max-height: none !important;
  max-width: none !important;
  letter-spacing: normal !important;
  text-transform: none !important;
  text-shadow: none !important;
  transition: background 0.2s !important;
  user-select: none !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
`;
document.body.appendChild(exportBtn);

const popupIframe = document.createElement('iframe');
popupIframe.src = chrome.runtime.getURL("index.html#/popup");
popupIframe.style.cssText = `
  position: fixed !important;
  top: ${btnY + 50}px !important;
  left: ${btnX}px !important;
  width: 380px !important;
  height: 520px !important;
  z-index: 10000 !important;
  border: none !important;
  border-radius: 16px !important;
  box-shadow: 0 25px 60px rgba(0,0,0,0.3) !important;
  display: none !important;
  background: transparent !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
`;
document.body.appendChild(popupIframe);

const backdrop = document.createElement('div');
backdrop.style.cssText = `
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 9999 !important;
  background: rgba(0,0,0,0.15) !important;
  display: none !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
`;
document.body.appendChild(backdrop);


function updatePopupPosition() {
  const popupTop = Math.min(btnY + 50, window.innerHeight - 540);
  const popupLeft = Math.min(btnX, window.innerWidth - 400);
  popupIframe.style.setProperty('top', Math.max(0, popupTop) + 'px', 'important');
  popupIframe.style.setProperty('left', Math.max(0, popupLeft) + 'px', 'important');
}

function setBtnPosition(x, y) {
  btnX = x;
  btnY = y;
  exportBtn.style.setProperty('left', x + 'px', 'important');
  exportBtn.style.setProperty('top', y + 'px', 'important');
  updatePopupPosition();
}

if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.local.get(['exportBtnPosition'], (result) => {
    if (result.exportBtnPosition) {
      setBtnPosition(result.exportBtnPosition.x, result.exportBtnPosition.y);
    }
  });
}


let isDragging = false;
let wasDragged = false;
let dragStartX = 0;
let dragStartY = 0;
let offsetX = 0;
let offsetY = 0;

exportBtn.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return; // left-click only
  isDragging = true;
  wasDragged = false;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  offsetX = e.clientX - btnX;
  offsetY = e.clientY - btnY;
  exportBtn.style.setProperty('cursor', 'grabbing', 'important');
  exportBtn.style.setProperty('transition', 'background 0.2s', 'important'); // keep bg transition, remove position transition
  e.preventDefault(); // prevent text selection
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;

  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;

  if (!wasDragged && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
  wasDragged = true;

  const newX = Math.max(0, Math.min(e.clientX - offsetX, window.innerWidth - exportBtn.offsetWidth));
  const newY = Math.max(0, Math.min(e.clientY - offsetY, window.innerHeight - exportBtn.offsetHeight));
  setBtnPosition(newX, newY);
});

document.addEventListener('mouseup', () => {
  if (!isDragging) return;
  isDragging = false;
  exportBtn.style.setProperty('cursor', 'grab', 'important');

  if (wasDragged) {
    // Save position to persist across reloads
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ exportBtnPosition: { x: btnX, y: btnY } });
    }
  }
});


let isOpen = false;

function togglePopup() {
  isOpen = !isOpen;
  popupIframe.style.setProperty('display', isOpen ? 'block' : 'none', 'important');
  backdrop.style.setProperty('display', isOpen ? 'block' : 'none', 'important');
  exportBtn.innerText = isOpen ? "✕ Close" : `✦ Export to PDF`;
  exportBtn.style.setProperty('background', isOpen ? "#b8dc26ff" : "#2563EB", 'important');
  if (isOpen) updatePopupPosition();
}

exportBtn.addEventListener('click', async () => {
  if (wasDragged) return;

  if (!isOpen) {
    const originalText = exportBtn.innerText;
    exportBtn.innerText = "⏳ Extracting...";

    try {
      if (activeScraper) {
        const scrapedChatData = await activeScraper.scrape();
        await chrome.storage.local.set({ currentExportData: scrapedChatData });
      } else {
        console.error('[AI Exporter] No scraper available for this platform.');
      }
    } catch (e) {
      console.error("[AI Exporter] Scraping failed", e);
      if (e.message && e.message.includes("Extension context invalidated")) {
        alert("⚠️ Extension Updated!\n\nYou must refresh this page (F5 or Cmd+R) for the exporter to work.");
      }
    }

    exportBtn.innerText = originalText;
  }
  togglePopup();
});

backdrop.addEventListener('click', togglePopup);

window.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'CLOSE_POPUP' && isOpen) {
    togglePopup();
  }
});