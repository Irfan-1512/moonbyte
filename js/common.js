// Helpers shared by several features (Style, Recipe, Wardrobe, Cook Book).

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Pulls a JSON object out of a model reply (it may come wrapped in text or code fences)
function parseJsonReply(reply) {
  const m = typeof reply === 'string' ? reply.match(/\{[\s\S]*\}/) : null;
  if (!m) return null;
  try {
    const data = JSON.parse(m[0]);
    return data && typeof data === 'object' ? data : null;
  } catch { return null; }
}

// True when a reply was meant to be JSON (so a broken one is not shown as raw code)
function looksLikeJson(reply) {
  return typeof reply === 'string' && /^\s*(```(json)?\s*)?\{/.test(reply);
}

// Keeps the saved chat history readable instead of raw JSON
function replaceLastAssistant(text) {
  const last = conversationHistory[conversationHistory.length - 1];
  if (last && last.role === 'assistant') {
    last.content = text;
    localStorage.setItem('moonbyte-history', JSON.stringify(conversationHistory));
  }
}

function showFormatFailure(div) {
  const text = "I couldn't format that one. Please ask again.";
  div.innerHTML = '<div class="msg-avatar ai-av">🌙</div><div class="msg-content">'
    + '<div class="msg-bubble">' + text + '</div></div>';
  replaceLastAssistant(text);
  return true;
}

// ---- Pictures from Wikipedia (free, no API key) ----
const WIKI_TITLE = /^[\w\s'().,&-]{2,60}$/;   // safe article titles only
const WIKI_HOST = /^https:\/\/(upload|thumb)\.wikimedia\.org\//;   // Wikipedia now serves thumbnails from either host
const imageCache = new Map();                  // "title|size" -> promise of image url ('' = none)

async function fetchWikiThumb(title, size) {
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  if (!WIKI_TITLE.test(cleanTitle)) return '';

  try {
    // 1. Direct page title lookup (supports automatic redirects)
    const directApi = 'https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail'
      + '&pithumbsize=' + size + '&redirects=1&format=json&origin=*&titles=' + encodeURIComponent(cleanTitle);
    const res = await fetch(directApi);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const pages = Object.values((data.query && data.query.pages) || {});
    const src = pages[0] && pages[0].thumbnail && pages[0].thumbnail.source;
    if (typeof src === 'string' && WIKI_HOST.test(src)) return src;

    // 2. Search fallback if direct match has no image or the article title differed slightly
    const searchApi = 'https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrlimit=3&prop=pageimages&piprop=thumbnail'
      + '&pithumbsize=' + size + '&format=json&origin=*&gsrsearch=' + encodeURIComponent(cleanTitle);
    const searchRes = await fetch(searchApi);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const searchPages = Object.values((searchData.query && searchData.query.pages) || {})
        .sort((x, y) => (x.index || 0) - (y.index || 0));
      const hit = searchPages.find((p) => p.thumbnail && WIKI_HOST.test(String(p.thumbnail.source)));
      if (hit && hit.thumbnail && hit.thumbnail.source) return hit.thumbnail.source;
    }
  } catch (err) {
    console.log('Image lookup failed for', cleanTitle, err);
  }
  return '';
}

// One lookup per title and size, normalized to prevent duplicate fetches
function wikiThumb(title, size = 160) {
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  if (!cleanTitle) return Promise.resolve('');
  const key = cleanTitle.toLowerCase() + '|' + size;
  if (!imageCache.has(key)) imageCache.set(key, fetchWikiThumb(cleanTitle, size));
  return imageCache.get(key);
}

// Fills in <img data-wiki="Title"> pictures after cards are on the page.
// If no picture exists or image loading fails, the slot and its credit line are cleanly removed.
function loadImages(root) {
  if (!root) return;
  root.querySelectorAll('img[data-wiki]').forEach(async (img) => {
    const title = img.dataset.wiki;
    const size = Math.min(Math.max(Number(img.dataset.size) || 160, 50), 800);
    const url = await wikiThumb(title, size);
    const next = img.nextElementSibling;
    const credit = next && next.classList.contains('photo-credit') ? next : null;
    if (url) {
      img.onerror = () => {
        img.remove();
        if (credit) credit.remove();
      };
      img.src = url;
      img.hidden = false;
      if (credit) credit.hidden = false;
    } else {
      img.remove();
      if (credit) credit.remove();
    }
  });
}

// ---- Sidebar chat items with a permanent-delete button ----
function chatItemLabel(text) {
  const span = document.createElement('span');
  span.className = 'chat-title';
  span.textContent = text;
  return span;
}

function chatDeleteButton(onDelete) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'chat-del';
  btn.textContent = '🗑';
  btn.title = 'Delete permanently';
  btn.setAttribute('aria-label', 'Delete this chat permanently');
  btn.onclick = (e) => {
    e.stopPropagation();
    if (confirm('Delete this chat permanently? This cannot be undone.')) onDelete();
  };
  return btn;
}

// Empties the screen and the saved copy in this browser, then shows a fresh start message
function showFreshChat(text) {
  conversationHistory.length = 0;
  localStorage.removeItem('moonbyte-history');
  document.getElementById('chat-box').innerHTML = '';
  addMessage('assistant', text);
  if (typeof modeUi === 'function') modeUi(currentMode);
}