// Recipe mode: recipe cards (photo, tick-off ingredients, step timers, diet checks)
// and the "My Cook Book" window (needs login to save).
let shownRecipes = [];

const FLAGS = ['meat', 'nuts', 'dairy', 'gluten'];
const DIETS = [
  { flag: 'meat', label: 'Vegetarian', why: 'not vegetarian' },
  { flag: 'nuts', label: 'Nut-free', why: 'contains nuts' },
  { flag: 'dairy', label: 'Dairy-free', why: 'contains dairy' },
  { flag: 'gluten', label: 'Gluten-free', why: 'contains gluten' },
];

const clip = (v, max) => String(v ?? '').trim().slice(0, max);

// Cleans a recipe from the model (or the database) so the card can trust it
function normalizeRecipe(r) {
  if (!r || typeof r !== 'object') return null;
  const title = clip(r.title, 80);
  const ingredients = (Array.isArray(r.ingredients) ? r.ingredients : [])
    .filter((i) => i && typeof i === 'object' && clip(i.item, 80))
    .slice(0, 15)
    .map((i) => ({
      amount: clip(i.amount, 30),
      item: clip(i.item, 80),
      flags: (Array.isArray(i.flags) ? i.flags : []).filter((f) => FLAGS.includes(f)),
    }));
  const steps = (Array.isArray(r.steps) ? r.steps : [])
    .filter((s) => s && typeof s === 'object' && clip(s.text, 300))
    .slice(0, 12)
    .map((s) => {
      const m = Math.round(Number(s.minutes));
                  const wiki = clip(s.wiki, 60);
      return { text: clip(s.text, 300), minutes: m >= 1 && m <= 180 ? m : 0, wiki: WIKI_TITLE.test(wiki) ? wiki : '' };
    });
  if (!title || !ingredients.length || !steps.length) return null;
  const servings = Math.round(Number(r.servings));
  return {
    title,
    wiki: clip(r.wiki, 60),
    servings: servings >= 1 && servings <= 50 ? servings : 0,
    ingredients,
    steps,
  };
}

const fmtTime = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

function timerHtml(minutes) {
  const secs = minutes * 60;
  return `<div class="timer" data-seconds="${secs}">
    <span class="timer-time">${fmtTime(secs)}</span>
    <button type="button" class="mini-btn" onclick="timerToggle(this)">Start</button>
    <button type="button" class="mini-btn" onclick="timerReset(this)">Reset</button>
  </div>`;
}

// savedId is set when the card is shown inside the cook book window
function recipeHtml(r, idx, savedId) {
  const photo = WIKI_TITLE.test(r.wiki)
    ? `<img class="recipe-photo" data-wiki="${escHtml(r.wiki)}" data-size="480" alt="" hidden>`
      + '<div class="photo-credit" hidden>Photo: Wikipedia</div>' : '';
  const ings = r.ingredients.map((i) =>
    `<li><label><input type="checkbox" data-flags="${i.flags.join(' ')}">`
    + `<span>${escHtml((i.amount ? i.amount + ' ' : '') + i.item)}</span></label></li>`).join('');
      const steps = r.steps.map((s) =>
    `<li><span>${escHtml(s.text)}</span>${s.minutes ? timerHtml(s.minutes) : ''}${s.wiki
      ? `<img class="step-photo" data-wiki="${escHtml(s.wiki)}" data-size="480" alt="" hidden><div class="photo-credit" hidden>Photo: Wikipedia</div>` : ''}</li>`).join('');
  const diets = DIETS.map((d) =>
    `<label class="diet"><input type="checkbox" data-diet="${d.flag}"> ${d.label}</label>`).join('');
  const actions = savedId
    ? `<button type="button" class="outfit-btn danger" onclick="deleteRecipe('${escHtml(savedId)}')">Remove</button>`
    : `<button type="button" class="outfit-btn" onclick="findSubstitutes(this)">Find substitutes for what I'm missing</button>
       <button type="button" class="outfit-btn" onclick="saveRecipe(${idx}, this)">＋ Add to my cook book</button>`;
  return `<div class="recipe-card" data-title="${escHtml(r.title)}">
    ${photo}
    <div class="recipe-title">${escHtml(r.title)}${r.servings ? ' · serves ' + r.servings : ''}</div>
    <div class="recipe-sub">Tick what you already have.</div>
    <ul class="ing-list">${ings}</ul>
    <ol class="step-list">${steps}</ol>
    <div class="diet-row">${diets}</div>
    <div class="diet-warn" aria-live="polite"></div>
    <div class="recipe-actions">${actions}</div>
  </div>`;
}

// Returns true if the reply was handled (card drawn, or a friendly error shown)
function showRecipeReply(div, reply) {
  const data = parseJsonReply(reply);
  if (!data) return looksLikeJson(reply) ? showFormatFailure(div) : false;

  const recipe = normalizeRecipe(data.recipe);
  const message = typeof data.message === 'string' ? data.message : '';
  if (!message && !recipe) return showFormatFailure(div);

  const idx = shownRecipes.length;
  if (recipe) shownRecipes.push(recipe);
  div.innerHTML = '<div class="msg-avatar ai-av">🌙</div><div class="msg-content">'
    + (message ? `<div class="msg-bubble">${formatReply(escHtml(message))}</div>` : '')
    + (recipe ? recipeHtml(recipe, idx) : '')
    + '</div>';

  replaceLastAssistant([message, recipe ? 'Recipe: ' + recipe.title : ''].filter(Boolean).join('\n'));
  loadImages(div);
  if (message) speak(message);
  return true;
}

// ---- Diet check: warns when ticked diets clash with the ingredients ----
function updateDietWarning(card) {
  const active = [...card.querySelectorAll('input[data-diet]:checked')].map((b) => b.dataset.diet);
  const notes = [];
  active.forEach((flag) => {
    const diet = DIETS.find((d) => d.flag === flag);
    const hits = [...card.querySelectorAll('.ing-list input')]
      .filter((i) => (i.dataset.flags || '').split(' ').includes(flag))
      .map((i) => i.nextElementSibling.textContent);
    if (hits.length) notes.push(`${diet.label}: ${hits.join(', ')} (${diet.why}).`);
  });
  card.querySelector('.diet-warn').textContent = notes.length
    ? 'Heads up: ' + notes.join(' ') + ' Ask for a modified version, or swap these. Always check food labels.'
    : (active.length ? 'Looks fine for your choices. Always check food labels.' : '');
}

document.addEventListener('change', (e) => {
  if (!e.target.dataset || !e.target.dataset.diet) return;
  const card = e.target.closest('.recipe-card');
  if (card) updateDietWarning(card);
});

// ---- Substitutes: asks Moonbyte about the ingredients you did not tick ----
function findSubstitutes(btn) {
  const card = btn.closest('.recipe-card');
  const missing = [...card.querySelectorAll('.ing-list input:not(:checked)')]
    .map((i) => i.nextElementSibling.textContent);
  if (!missing.length) { btn.textContent = 'You have everything 🎉'; return; }
  const diets = [...card.querySelectorAll('input[data-diet]:checked')]
    .map((b) => DIETS.find((d) => d.flag === b.dataset.diet).label.toLowerCase());
  document.getElementById('user-input').value =
    `I'm making ${card.dataset.title} but I don't have: ${missing.join('; ')}. `
    + 'Suggest a substitute for each, with the amount to use.'
    + (diets.length ? ` Keep it ${diets.join(' and ')}.` : '');
  sendMessage();
}

// ---- Step timers ----
const timerState = new WeakMap();

function getTimer(box) {
  if (!timerState.has(box)) timerState.set(box, { left: Number(box.dataset.seconds), id: null });
  return timerState.get(box);
}

function paintTimer(box, t) {
  box.querySelector('.timer-time').textContent = t.left > 0 ? fmtTime(t.left) : 'Done!';
  box.classList.toggle('done', t.left <= 0);
}

function timerToggle(btn) {
  const box = btn.closest('.timer');
  const t = getTimer(box);
  if (t.id) { clearInterval(t.id); t.id = null; btn.textContent = 'Resume'; return; }
  if (t.left <= 0) t.left = Number(box.dataset.seconds);
  btn.textContent = 'Pause';
  paintTimer(box, t);
  t.id = setInterval(() => {
    if (!box.isConnected) { clearInterval(t.id); t.id = null; return; }   // card was removed
    t.left -= 1;
    paintTimer(box, t);
    if (t.left <= 0) {
      clearInterval(t.id);
      t.id = null;
      btn.textContent = 'Start';
      if (typeof speak === 'function') speak('Timer done');
    }
  }, 1000);
}

function timerReset(btn) {
  const box = btn.closest('.timer');
  const t = getTimer(box);
  clearInterval(t.id);
  t.id = null;
  t.left = Number(box.dataset.seconds);
  box.querySelector('button').textContent = 'Start';
  paintTimer(box, t);
}

// ---- Cook book (saved recipes) ----
async function saveRecipe(idx, btn) {
  const r = shownRecipes[idx];
  if (!r) return;
  if (!signedIn) return showAuth(true, 'Log in to save recipes to your cook book.');
  btn.disabled = true;
  const { error } = await sb.from('cookbook').insert({ title: r.title.slice(0, 120), recipe: r });
  if (error) {
    console.log('Cook book save failed', error);
    btn.disabled = false;
    btn.textContent = 'Could not save, try again';
    return;
  }
  btn.textContent = '✓ Saved to cook book';
}

async function openCookbook() {
  if (!signedIn) return showAuth(true, 'Log in to see your cook book.');
  const list = document.getElementById('cookbook-list');
  document.getElementById('cookbook-modal').style.display = 'flex';
  list.textContent = 'Loading...';
  const { data, error } = await sb.from('cookbook')
    .select('id, recipe')
    .order('created_at', { ascending: false });
  if (error) {
    console.log('Cook book load failed', error);
    list.textContent = 'Could not load your cook book. Try again.';
    return;
  }
  const cards = data
    .map((row) => ({ id: row.id, recipe: normalizeRecipe(row.recipe) }))
    .filter((row) => row.recipe)
    .map((row) => recipeHtml(row.recipe, -1, row.id));
  list.innerHTML = cards.length
    ? cards.join('')
    : '<p class="sheet-empty">Nothing saved yet. Ask for a recipe in Recipe mode and tap “Add to my cook book”.</p>';
  loadImages(list);
  document.getElementById('cookbook-close').focus();
}

function closeCookbook() {
  document.getElementById('cookbook-modal').style.display = 'none';
}

async function deleteRecipe(id) {
  if (!confirm('Remove this recipe permanently?')) return;
  const { error } = await sb.from('cookbook').delete().eq('id', id);
  if (error) return console.log('Remove failed', error);
  openCookbook();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeCookbook();
});