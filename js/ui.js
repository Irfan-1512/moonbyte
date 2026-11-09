
// Per-mode look: an accent colour for each page and quick-start chips under the welcome message.
const MODE_CHIPS = {
  general: ['What can you do?', 'Search latest tech news', 'Tell me a joke'],
  study: ['Explain normalization in DBMS', 'Quiz me on Java basics', 'Make a study plan for this week'],
  code: ['Explain async/await simply', 'Give me a small JavaScript project idea', 'How do I debug faster?'],
  style: ['Outfit for a college fest', 'Smart casual look under ₹3000', 'What colours go with navy?'],
  recipe: ['Butter chicken for 4', 'Quick veg biryani for 2', 'Easy pizza from scratch'],
};

function modeUi(mode, withChips = true) {
  document.body.dataset.mode = mode;

  const box = document.getElementById('chat-box');
  box.querySelectorAll('.chips').forEach((c) => c.remove());

  // Open the dedicated PowerPoint form when PPT mode is selected.
  if (mode === 'ppt' && typeof showPptForm === 'function') {
    showPptForm();
    return;
  }

  const list = MODE_CHIPS[mode];

  if (!withChips || !list) return;

  const wrap = document.createElement('div');
  wrap.className = 'chips';

  list.forEach((text) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = text;
    b.onclick = () => chipClick(text);
    wrap.appendChild(b);
  });

  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
}

function chipClick(text) {
  document.getElementById('user-input').value = text;
  sendMessage();
}
