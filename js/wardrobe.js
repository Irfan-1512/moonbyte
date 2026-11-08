// Style mode outfit cards and the "My Wardrobe" window (needs login to save).
let shownOutfits = [];
const HEX = /^#[0-9a-f]{6}$/i;

// savedId is set when the card is shown inside the wardrobe window
function outfitHtml(o, idx, savedId) {
  const items = (Array.isArray(o.items) ? o.items : [])
    .filter((it) => it && typeof it === 'object')
    .map((it) => {
      const dot = HEX.test(it.hex)
        ? `<span class="swatch" style="background:${it.hex}" aria-hidden="true"></span>` : '';
      const color = it.color ? ' · ' + escHtml(it.color) : '';
      const wiki = typeof it.wiki === 'string' ? it.wiki.trim() : '';
      const pic = WIKI_TITLE.test(wiki)
        ? `<img class="item-img" data-wiki="${escHtml(wiki)}" alt="" width="56" height="56" hidden>` : '';
      return `<li>${pic}${dot}<span><strong>${escHtml(it.name)}</strong>${color}</span></li>`;
    }).join('');
  const action = savedId
    ? `<button class="outfit-btn danger" onclick="deleteOutfit('${escHtml(savedId)}')">Remove</button>`
    : `<button class="outfit-btn" onclick="saveOutfit(${idx}, this)">＋ Add to my wardrobe</button>`;
  return `<div class="outfit-card">
    <div class="outfit-title">${escHtml(o.title)}</div>
    ${o.occasion ? `<div class="outfit-occasion">${escHtml(o.occasion)}</div>` : ''}
    <ul class="outfit-items">${items}</ul>
    ${o.tip ? `<div class="outfit-tip">💡 ${escHtml(o.tip)}</div>` : ''}
    ${action}
  </div>`;
}

// Returns true if the reply was handled (cards drawn, or a friendly error shown)
function showStyleReply(div, reply) {
  const data = parseJsonReply(reply);
  if (!data) return looksLikeJson(reply) ? showFormatFailure(div) : false;

  const outfits = (Array.isArray(data.outfits) ? data.outfits : [])
    .filter((o) => o && typeof o === 'object')
    .slice(0, 3);
  const message = typeof data.message === 'string' ? data.message : '';
  if (!message && !outfits.length) return showFormatFailure(div);

  const start = shownOutfits.length;
  shownOutfits.push(...outfits);
  div.innerHTML = '<div class="msg-avatar ai-av">🌙</div><div class="msg-content">'
    + (message ? `<div class="msg-bubble">${formatReply(escHtml(message))}</div>` : '')
    + outfits.map((o, i) => outfitHtml(o, start + i)).join('')
    + '</div>';

  replaceLastAssistant([message, ...outfits.map((o) => 'Outfit: ' + o.title)].filter(Boolean).join('\n'));
  loadImages(div);
  if (message) speak(message);
  return true;
}

async function saveOutfit(idx, btn) {
  const o = shownOutfits[idx];
  if (!o) return;
  if (!signedIn) return showAuth(true, 'Log in to save outfits to your wardrobe.');
  btn.disabled = true;
  const { error } = await sb.from('wardrobe').insert({
    title: String(o.title || 'Outfit').slice(0, 120),
    outfit: o,
  });
  if (error) {
    console.log('Wardrobe save failed', error);
    btn.disabled = false;
    btn.textContent = 'Could not save, try again';
    return;
  }
  btn.textContent = '✓ Saved to wardrobe';
}

async function openWardrobe() {
  if (!signedIn) return showAuth(true, 'Log in to see your wardrobe.');
  const list = document.getElementById('wardrobe-list');
  document.getElementById('wardrobe-modal').style.display = 'flex';
  list.textContent = 'Loading...';
  const { data, error } = await sb.from('wardrobe')
    .select('id, outfit')
    .order('created_at', { ascending: false });
  if (error) {
    console.log('Wardrobe load failed', error);
    list.textContent = 'Could not load your wardrobe. Try again.';
    return;
  }
  list.innerHTML = data.length
    ? data.map((row) => outfitHtml(row.outfit || {}, -1, row.id)).join('')
    : '<p class="sheet-empty">Nothing saved yet. Ask for an outfit in Style mode and tap “Add to my wardrobe”.</p>';
  loadImages(list);
  document.getElementById('wardrobe-close').focus();
}

function closeWardrobe() {
  document.getElementById('wardrobe-modal').style.display = 'none';
}

async function deleteOutfit(id) {
  const { error } = await sb.from('wardrobe').delete().eq('id', id);
  if (error) return console.log('Remove failed', error);
  openWardrobe();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeWardrobe();
});