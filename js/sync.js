// Saves your chats to your Supabase account while you are logged in.
// Logged out: nothing here runs and chats stay in this browser only.
let currentChatId = null;
let syncUserId = null;
let syncQueue = Promise.resolve();

function newCloudChat() {
  currentChatId = null;
}

// Called after every finished reply (see sendMessage in app.js). Never blocks the chat.
function syncExchange() {
  if (!signedIn || !sb || currentMode === 'ppt') return;
  const pair = conversationHistory.slice(-2);
  if (pair.length < 2) return;
  const mode = currentMode;
  syncQueue = syncQueue
    .then(() => saveExchange(pair, mode))
    .catch((err) => console.log('Chat sync failed', err));
}

async function saveExchange(pair, mode) {
  if (!currentChatId) {
    const title = String(pair[0].content).slice(0, 40) || 'New chat';
    const { data, error } = await sb.from('chats').insert({ title, mode }).select('id').single();
    if (error) throw error;
    currentChatId = data.id;
  }
  const rows = pair.map((m) => ({ chat_id: currentChatId, role: m.role, content: m.content }));
  const { error } = await sb.from('messages').insert(rows);
  if (error) throw error;
  await refreshChatList();
}

// Shows your 8 latest saved chats in the sidebar
async function refreshChatList() {
  if (!signedIn || !sb) return;
  try {
    const { data, error } = await sb.from('chats')
      .select('id, title, mode')
      .order('created_at', { ascending: false })
      .limit(8);
    if (error) throw error;
    const box = document.getElementById('chat-history');
    box.innerHTML = '';
    data.forEach((c) => {
      const item = document.createElement('div');
      item.className = 'chat-history-item' + (c.id === currentChatId ? ' active' : '');
      item.textContent = c.title || 'Conversation';
      item.setAttribute('role', 'button');
      item.tabIndex = 0;
      item.onclick = () => openCloudChat(c.id, c.mode);
      item.onkeydown = (e) => { if (e.key === 'Enter') openCloudChat(c.id, c.mode); };
      box.appendChild(item);
    });
  } catch (err) {
    console.log('Chat list failed', err);
  }
}

// Switches the mode buttons without clearing the chat
function applyMode(mode) {
  if (!modes[mode]) return;
  currentMode = mode;
  systemPrompt = modes[mode];
  document.body.dataset.mode = mode;
  document.querySelectorAll('.mode-btn').forEach((b) => {
    const active = b.getAttribute('onclick') === `switchMode('${mode}', this)`;
    b.classList.toggle('active', active);
    if (active) document.getElementById('mode-title').textContent = b.textContent.trim();
  });
}

async function openCloudChat(id, mode) {
  if (!signedIn || !sb) return;
  const { data, error } = await sb.from('messages')
    .select('role, content')
    .eq('chat_id', id)
    .order('id', { ascending: true })
    .limit(200);
  if (error) { console.log('Chat load failed', error); return; }
  document.getElementById('chat-box').innerHTML = '';
  conversationHistory.length = 0;
  data.forEach((m) => {
    conversationHistory.push({ role: m.role, content: m.content });
    addMessage(m.role === 'user' ? 'user' : 'assistant', m.content);
  });
  currentChatId = id;
  applyMode(mode);
  localStorage.setItem('moonbyte-history', JSON.stringify(conversationHistory.slice(-100)));
  refreshChatList();
}

// Called from auth.js whenever the login state changes
function syncAuthChanged(session) {
  const uid = session && session.user ? session.user.id : null;
  if (uid === syncUserId) return;            // same person (token refresh), nothing to do
  syncUserId = uid;
  currentChatId = null;
  setTimeout(renderChatHistory, 0);          // not inside the auth callback (library advice)
}

// After logging out, nothing from your account stays on screen or in this browser
function resetChatView() {
  currentChatId = null;
  conversationHistory.length = 0;
  localStorage.removeItem('moonbyte-history');
  document.getElementById('chat-box').innerHTML = '';
  addMessage('assistant', 'Logged out. Your saved chats are safe in your account. 🌙');
  renderChatHistory();
  modeUi(currentMode);
}