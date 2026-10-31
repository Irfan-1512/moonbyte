// Style mode outfit cards and the "My Wardrobe" window (needs login to save).
let shownOutfits = [];
const HEX = /^#[0-9a-f]{6}$/i;

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// savedId is set when the card is shown inside the wardrobe window
function outfitHtml(o, idx, savedId) {
  const items = (Array.isArray(o.items) ? o.items : [])
    .filter((it) => it && typeof it === 'object')
    .map((it) => {
      const dot = HEX.test(it.hex)
        ? `<span class="swatch" style="background:${it.hex}" aria-hidden="true"></span>` : '';
      const color = it.color ? ' · ' + escHtml(it.color) : '';
      return `<li>${dot}<span><strong>${escHtml(it.name)}</strong>${color}</span></li>`;
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

// Returns true if the reply was valid style JSON and cards were drawn
function showStyleReply(div, reply) {
  let data = null;
  try {
    const m = reply.match(/\{[\s\S]*\}/);
    data = m ? JSON.parse(m[0]) : null;
  } catch { data = null; }
  if (!data || typeof data !== 'object') return false;

  const outfits = (Array.isArray(data.outfits) ? data.outfits : [])
    .filter((o) => o && typeof o === 'object')
    .slice(0, 3);
  const message = typeof data.message === 'string' ? data.message : '';
  if (!message && !outfits.length) return false;

  const start = shownOutfits.length;
  shownOutfits.push(...outfits);
  div.innerHTML = '<div class="msg-avatar ai-av">🌙</div><div class="msg-content">'
    + (message ? `<div class="msg-bubble">${formatReply(escHtml(message))}</div>` : '')
    + outfits.map((o, i) => outfitHtml(o, start + i)).join('')
    + '</div>';

  // Keep the saved chat history readable instead of raw JSON
  const last = conversationHistory[conversationHistory.length - 1];
  if (last && last.role === 'assistant') {
    last.content = [message, ...outfits.map((o) => 'Outfit: ' + o.title)].filter(Boolean).join('\n');
    localStorage.setItem('moonbyte-history', JSON.stringify(conversationHistory));
  }
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
    ? data.map((row) => outfitHtml(row.outfit, -1, row.id)).join('')
    : '<p class="wardrobe-empty">Nothing saved yet. Ask for an outfit in Style mode and tap “Add to my wardrobe”.</p>';
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
