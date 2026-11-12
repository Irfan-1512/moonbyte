const conversationHistory = JSON.parse(localStorage.getItem('moonbyte-history')) || [];
let chatSessions = JSON.parse(localStorage.getItem('moonbyte-sessions')) || [];

const modes = {
  general: `You are Moonbyte, Irfan's personal AI. Talk to him like a close friend — casual, warm, real. Never sound robotic or formal.

Here's everything about Irfan:
- 2nd year CSE student at ACE Engineering College, Hyderabad
- Calm and chill personality
- Interests: web development, fashion, cooking, AI, Marvel (favourite: Moon Knight)
- Projects: Gentleman's Wardrobe (fashion website), My Kitchen Diaries (recipe app), Moonbyte (this AI)
- Favourite food: biryani and pizza
- Username: moonbyte
- Goals: campus placements in 3rd year, become a web developer
- Learning: HTML, CSS, JavaScript, Node.js, DSA

How to talk to him:
- Keep it short and casual like texting a friend
- No bullet points unless necessary
- No formal language
- Use his name sometimes but not every message
- Be real, be human, be warm`,

  study: `You are Moonbyte in Study Mode helping Irfan. He's a CSE student studying DBMS, OS, DSA, Java, web development. Explain simply like a friend who's good at studies. Keep it easy to understand, give examples, motivate him when needed. No robotic explanations.`,
  code: `You are Moonbyte in Code Mode. Help Irfan with code like a senior developer friend. He knows HTML, CSS, JavaScript and is learning more. Be direct, explain clearly, fix his bugs, suggest improvements. Talk casually.`,
  style: `You are Moonbyte in Style Mode, Irfan's personal fashion advisor and friend. He likes men's fashion and is a college student in Hyderabad (warm weather, practical budget). Be casual and real.
Respond ONLY with valid JSON, no text outside it, in this exact shape:
{"message": "short friendly reply, 1-3 sentences", "outfits": [{"title": "Outfit name", "occasion": "where to wear it", "items": [{"name": "Navy linen shirt", "color": "navy", "hex": "#1f2a44", "wiki": "Dress shirt"}],"tip": "one short styling tip"}]}
When he asks for outfit ideas, give 2 outfits (3 at most) with 3 to 5 items each. For a general fashion question, answer in "message" and use an empty "outfits" list. Every hex must be a 6-digit value like #1f2a44. "wiki" is the English Wikipedia article title for that kind of garment, kept generic (examples: T-shirt, Blazer, Jeans, Chino cloth, Loafer, Sneakers, Necklace). The outfit-level "wiki" is the English Wikipedia article title of the overall style that has photos of people wearing it, kept generic (examples: Smart casual, Business casual, Streetwear, Kurta, Sherwani, Blazer).`,
  recipe: `You are Moonbyte in Recipe Mode, Irfan's foodie friend. He loves biryani and pizza. Keep it fun, casual and practical.
Respond ONLY with valid JSON, no text outside it, in this exact shape:
{"message": "short friendly reply, 1-2 sentences", "recipe": {"title": "Butter chicken", "wiki": "Butter chicken", "servings": 4, "ingredients": [{"amount": "500 g", "item": "chicken thighs, boneless", "flags": ["meat"]}], "steps": [{"text": "Marinate the chicken for 30 minutes.", "minutes": 30}]}}
When he asks for a recipe, fill "recipe" (at most 12 ingredients and 8 short steps). For anything else (substitutes, tips, questions) answer in "message" and set "recipe" to null. "wiki" is the English Wikipedia article title of the dish. "flags" lists any of meat, nuts, dairy, gluten that the ingredient contains (use [] if none; fish counts as meat). "minutes" is only for steps with a set waiting or cooking time. Only include "wiki" for the main dish title (never for individual steps).`,
};

let currentMode = "general";
let systemPrompt = modes.general;

function renderChatHistory() {
  if (typeof signedIn !== 'undefined' && signedIn && typeof refreshChatList === 'function') {
    refreshChatList();
    return;
  }
  const container = document.getElementById('chat-history');
  if (!container) return;
  container.innerHTML = '';
  chatSessions.slice(-8).reverse().forEach((session, i) => {
    const div = document.createElement('div');
    div.className = 'chat-history-item' + (i === 0 ? ' active' : '');
    div.style.cursor = 'pointer';
    div.onclick = () => loadSession(session);
    div.appendChild(chatItemLabel(session.title || 'Conversation'));
    div.appendChild(chatDeleteButton(() => deleteLocalChat(session)));
    container.appendChild(div);
  });
}

let openedSession = null;

// Permanently removes a chat saved in this browser
function deleteLocalChat(session) {
  const i = chatSessions.indexOf(session);
  if (i === -1) return;
  chatSessions.splice(i, 1);
  localStorage.setItem('moonbyte-sessions', JSON.stringify(chatSessions));
  if (openedSession === session) {
    openedSession = null;
    showFreshChat('Chat deleted. 🌙');
  }
  renderChatHistory();
}

// Header 🗑️: permanently deletes the chat that is open right now
async function deleteCurrentChat() {
  if (!confirm('Delete this chat permanently? This cannot be undone.')) return;
  if (typeof signedIn !== 'undefined' && signedIn && typeof currentChatId !== 'undefined' && currentChatId) {
    await deleteCloudChat(currentChatId); // removes it from your account and clears the screen
    return;
  }
  if (openedSession) {
    deleteLocalChat(openedSession);
    return;
  } // opened from the sidebar
  showFreshChat('Chat deleted. 🌙'); // never saved anywhere else
  if (typeof newCloudChat === 'function') newCloudChat();
}

function loadSession(session) {
  openedSession = session;
  document.getElementById('chat-box').innerHTML = '';
  conversationHistory.length = 0;
  (session.messages || []).forEach(msg => {
    conversationHistory.push(msg);
    addMessage(msg.role === "user" ? "user" : "assistant", msg.content);
  });
  localStorage.setItem('moonbyte-history', JSON.stringify(conversationHistory));
}

window.onload = () => {
  initAvatar();
  const saved = localStorage.getItem('moonbyte-history');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const recent = parsed.slice(-30);
      recent.forEach(msg => {
        conversationHistory.push(msg);
        addMessage(msg.role === "user" ? "user" : "assistant", msg.content);
      });
      addMessage("assistant", "Welcome back Irfan! 🌙 I remember our last conversation.");
    } catch {
      addMessage("assistant", "Hey Irfan! 🌙 Moonbyte is online. What can I help you with today?");
    }
  } else {
    addMessage("assistant", "Hey Irfan! 🌙 Moonbyte is online. What can I help you with today?");
  }
  if (typeof modeUi === 'function') modeUi('general', !saved);
  renderChatHistory();
};

function switchMode(mode, btn) {
  if (currentMode === mode && conversationHistory.length > 0) return;

  if (conversationHistory.length > 0) {
    const firstMsg = conversationHistory.find(m => m.role === 'user');
    const title = firstMsg ? firstMsg.content.slice(0, 30) + '...' : 'Conversation';
    chatSessions.push({ title, time: Date.now(), messages: [...conversationHistory] });
    localStorage.setItem('moonbyte-sessions', JSON.stringify(chatSessions));
  }
  if (typeof newCloudChat === 'function') newCloudChat();
  currentMode = mode;
  systemPrompt = modes[mode] || modes.general;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  if (btn) {
    btn.classList.add('active');
    const titleEl = document.getElementById('mode-title');
    if (titleEl) titleEl.textContent = btn.textContent.trim();
  }
  document.getElementById('chat-box').innerHTML = '';

  // Clear transient mode caches so memory doesn't leak
  if (typeof shownOutfits !== 'undefined' && Array.isArray(shownOutfits)) shownOutfits.length = 0;
  if (typeof shownRecipes !== 'undefined' && Array.isArray(shownRecipes)) shownRecipes.length = 0;

  const welcomes = {
    general: "Hey Irfan! 🌙 Switched to General mode. What's on your mind?",
    study: "📚 Study Mode ON! What subject are we tackling today Irfan?",
    code: "💻 Code Mode ON! Share your code or tell me what you're building Irfan!",
    style: "👔 Style Mode ON! Let's talk fashion Irfan. What's the occasion?",
    recipe: "🍳 Recipe Mode ON! Hungry Irfan? Tell me what ingredients you have!",
    ppt: "📊 Presentation Mode ON! Fill in the form below and I'll build your deck, Irfan."
  };
  addMessage("assistant", welcomes[mode] || `Switched to ${mode} mode.`);
  if (typeof modeUi === 'function') modeUi(mode);
  conversationHistory.length = 0;
  localStorage.removeItem('moonbyte-history');
  renderChatHistory();
}

function clearMemory() {
  if (conversationHistory.length > 0) {
    const firstMsg = conversationHistory.find(m => m.role === 'user');
    const title = firstMsg ? firstMsg.content.slice(0, 30) + '...' : 'Conversation';
    chatSessions.push({ title, time: Date.now(), messages: [...conversationHistory] });
    localStorage.setItem('moonbyte-sessions', JSON.stringify(chatSessions));
    renderChatHistory();
  }
  localStorage.removeItem('moonbyte-history');
  conversationHistory.length = 0;
  if (typeof shownOutfits !== 'undefined' && Array.isArray(shownOutfits)) shownOutfits.length = 0;
  if (typeof shownRecipes !== 'undefined' && Array.isArray(shownRecipes)) shownRecipes.length = 0;

  document.getElementById('chat-box').innerHTML = '';
  addMessage("assistant", "Memory cleared! Fresh start Irfan. 🌙");
  if (typeof newCloudChat === 'function') newCloudChat();
  if (typeof modeUi === 'function') modeUi(currentMode);
}

async function sendMessage() {
  const input = document.getElementById("user-input");
  const btn = document.getElementById("send-btn");
  const bar = document.getElementById("command-bar");
  if (bar) bar.classList.remove('open');

  const userText = input.value.trim();
  if (!userText) {
    const wrap = document.querySelector('.input-wrap');
    if (wrap) {
      wrap.classList.add('shake');
      setTimeout(() => wrap.classList.remove('shake'), 400);
    }
    return;
  }

  addMessage("user", userText);
  document.querySelectorAll('.chips').forEach((c) => c.remove());
  input.value = "";
  btn.classList.add('clicked');
  setTimeout(() => btn.classList.remove('clicked'), 300);
  btn.disabled = true;

  // Safe arithmetic check: must have an operator, not be a date or fraction like 12/05 or 9/11
  const trimmed = userText.trim();
  const isDatePattern = /^\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?$/.test(trimmed);
  const hasOperator = /[+\-*/]/.test(trimmed);
  const mathCharsOnly = /^[\d\s+\-*/().]+$/.test(trimmed);
  let processedText = userText;

  if (!isDatePattern && hasOperator && mathCharsOnly) {
    const result = calculate(trimmed);
    if (result !== null && !isNaN(result)) {
      processedText = `${userText} = ${result}`;
    }
  }

  // Check if it's an explicit search command rather than casual questions starting with 'what is'
  const lowerText = userText.toLowerCase();
  const searchPrefixes = ['search:', 'search ', 'web search ', 'google ', '/search '];
  const newsTriggers = ['latest news', 'today news', 'breaking news', 'current weather'];
  const isSearch = currentMode === 'general' && (
    searchPrefixes.some(p => lowerText.startsWith(p)) ||
    newsTriggers.some(t => lowerText.includes(t))
  );
  const searchQuery = isSearch
    ? (userText.replace(/^(search[:\s]+|web search[:\s]+|google[:\s]+|\/search[:\s]+)/i, '').trim() || userText)
    : null;

  conversationHistory.push({ role: "user", content: processedText });
  const thinkingDiv = addMessage("thinking", "");
  thinkingDiv.innerHTML = `<div class="msg-avatar ai-av">🌙</div><div class="msg-content"><div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>`;

  try {
    let reply = null;
    try {
      const groqResponse = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationHistory.slice(-10),
          systemPrompt: systemPrompt + `\n\nCURRENT TIME RIGHT NOW: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}. When user asks for time or date, directly tell them this exact time.`,
          searchQuery: searchQuery
        })
      });
      const groqData = await groqResponse.json();
      if (groqData && groqData.reply) {
        if (/^(Groq failed:|Search failed:|Server error:)/i.test(groqData.reply)) {
          console.warn("Server notice:", groqData.reply);
          reply = "I had trouble getting a response from the server. Please try again in a moment! 🌙";
        } else {
          reply = groqData.reply;
        }
      }
    } catch (e) {
      console.log("Chat request failed 🔄", e);
    }

    conversationHistory.push({ role: "assistant", content: reply || "Something went wrong." });
    if (conversationHistory.length > 100) conversationHistory.splice(0, conversationHistory.length - 100);
    localStorage.setItem('moonbyte-history', JSON.stringify(conversationHistory));

    thinkingDiv.className = "message assistant";

    if (currentMode === "style" && reply && typeof showStyleReply === 'function' && showStyleReply(thinkingDiv, reply)) {
      // outfit cards were drawn by showStyleReply (js/wardrobe.js)
    } else if (currentMode === "recipe" && reply && typeof showRecipeReply === 'function' && showRecipeReply(thinkingDiv, reply)) {
      // recipe card was drawn by showRecipeReply (js/recipe.js)
    } else if (currentMode === "ppt" && reply && typeof showPptReply === 'function' && showPptReply(thinkingDiv, reply)) {
      // the deck is built by showPptReply (js/ppt.js)
    } else {
      const replyText = reply || "Something went wrong. Try again!";
      const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      thinkingDiv.innerHTML = `<div class="msg-avatar ai-av">🌙</div><div class="msg-content"><div class="msg-bubble">${formatReply(replyText)}</div><div class="msg-footer"><span class="msg-time">${timeStr}</span><button type="button" class="listen-btn" title="Listen" aria-label="Listen to message" onclick="speakFromButton(this)">🔊</button></div></div>`;
      speak(replyText);
    }
    if (reply && typeof syncExchange === 'function') syncExchange();
  } catch (error) {
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    thinkingDiv.className = "message assistant";
    thinkingDiv.innerHTML = `<div class="msg-avatar ai-av">🌙</div><div class="msg-content"><div class="msg-bubble">Something went wrong. Try again!</div><div class="msg-footer"><span class="msg-time">${timeStr}</span><button type="button" class="listen-btn" title="Listen" aria-label="Listen to message" onclick="speakFromButton(this)">🔊</button></div></div>`;
  }

  btn.disabled = false;
  input.focus();
}

function formatReply(text) {
  let safe = String(text ?? '');
  // Unescape standard HTML entities if already encoded to prevent double-encoding
  safe = safe
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Safely escape all raw HTML characters to prevent XSS
  safe = (typeof escHtml === 'function')
    ? escHtml(safe)
    : safe.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  return safe
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function addMessage(role, text) {
  const box = document.getElementById("chat-box");
  const div = document.createElement("div");
  div.className = `message ${role}`;
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (role === "user") {
    div.innerHTML = `<div class="msg-avatar user-av" onclick="toggleAvatarPicker()" style="cursor:pointer">${userAvatar}</div><div class="msg-content"><div class="msg-bubble">${formatReply(text)}</div><div class="msg-time">${timeStr}</div></div>`;
  } else if (role === "assistant") {
    div.innerHTML = `<div class="msg-avatar ai-av">🌙</div><div class="msg-content"><div class="msg-bubble">${formatReply(text)}</div><div class="msg-footer"><span class="msg-time">${timeStr}</span><button type="button" class="listen-btn" title="Listen" aria-label="Listen to message" onclick="speakFromButton(this)">🔊</button></div></div>`;
  } else {
    div.innerHTML = `<div class="msg-avatar ai-av">🌙</div><div class="msg-content"><div class="msg-bubble">${formatReply(text)}</div><div class="msg-time">${timeStr}</div></div>`;
  }
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div;
}

// Command bar filtering and keyboard triggers
const chatInput = document.getElementById("user-input");
if (chatInput) {
  chatInput.addEventListener("input", () => {
    const bar = document.getElementById('command-bar');
    if (!bar) return;
    const val = chatInput.value.trim();
    if (val.startsWith('/')) {
      bar.classList.add('open');
      const q = val.toLowerCase();
      bar.querySelectorAll('.command-item').forEach(item => {
        const key = item.querySelector('.command-key')?.textContent.toLowerCase() || '';
        const desc = item.querySelector('.command-desc')?.textContent.toLowerCase() || '';
        const match = key.includes(q) || desc.includes(q);
        item.style.display = match ? 'flex' : 'none';
      });
    } else {
      bar.classList.remove('open');
    }
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const bar = document.getElementById('command-bar');
      if (bar && bar.classList.contains('open')) {
        const firstVisible = Array.from(bar.querySelectorAll('.command-item')).find(item => item.style.display !== 'none');
        if (firstVisible) {
          firstVisible.click();
          e.preventDefault();
          return;
        }
      }
      sendMessage();
    } else if (e.key === "Escape") {
      const bar = document.getElementById('command-bar');
      if (bar) bar.classList.remove('open');
    }
  });
}

function startVoice() {
  const btn = document.getElementById("mic-btn");
  const input = document.getElementById("user-input");
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    alert("Speech recognition is not supported in this browser. Try Chrome or Edge!");
    return;
  }
  try {
    const recognition = new SpeechRec();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    btn.classList.add("listening");
    btn.textContent = "🔴";
    recognition.start();
    recognition.onresult = (event) => {
      input.value = event.results[0][0].transcript;
      btn.classList.remove("listening");
      btn.textContent = "🎤";
      sendMessage();
    };
    recognition.onerror = recognition.onend = () => {
      btn.classList.remove("listening");
      btn.textContent = "🎤";
    };
  } catch (err) {
    console.log("Voice input error", err);
    btn.classList.remove("listening");
    btn.textContent = "🎤";
  }
}

function calculate(expression) {
  try {
    const trimmed = String(expression ?? '').trim();
    if (!/^[\d\s+\-*/().]+$/.test(trimmed)) return null;
    if (/\(\s*\)/.test(trimmed)) return null;
    const fn = new Function('"use strict"; return (' + trimmed + ');');
    const val = fn();
    if (typeof val === 'number' && Number.isFinite(val)) {
      return Math.abs(val - Math.round(val)) < 1e-10 ? Math.round(val) : Number(val.toFixed(4));
    }
    return null;
  } catch {
    return null;
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const btn = document.getElementById('theme-btn');
  if (html.getAttribute('data-theme') === 'dark') {
    html.setAttribute('data-theme', 'light');
    btn.textContent = '🌙';
  } else {
    html.setAttribute('data-theme', 'dark');
    btn.textContent = '☀️';
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('open');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}

// Avatar picker
let userAvatar = localStorage.getItem('moonbyte-avatar') || '👤';

function initAvatar() {
  document.querySelectorAll('.user-av').forEach(el => {
    el.textContent = userAvatar;
  });
}

function toggleAvatarPicker() {
  document.getElementById('avatar-picker').classList.toggle('open');
}

function setAvatar(emoji) {
  userAvatar = emoji;
  localStorage.setItem('moonbyte-avatar', emoji);
  document.querySelectorAll('.user-av').forEach(el => {
    el.textContent = emoji;
  });
  document.getElementById('avatar-picker').classList.remove('open');
}

// Close pickers and command-bar when clicking outside
document.addEventListener('click', (e) => {
  const picker = document.getElementById('avatar-picker');
  if (picker && !e.target.closest('.user-av') && !e.target.closest('.avatar-picker')) {
    picker.classList.remove('open');
  }
  const bar = document.getElementById('command-bar');
  if (bar && !e.target.closest('#command-bar') && !e.target.closest('#user-input')) {
    bar.classList.remove('open');
  }
});

// Text to speech
let isMuted = false;

function toggleMute() {
  isMuted = !isMuted;
  const btn = document.getElementById('mute-btn');
  if (btn) btn.textContent = isMuted ? '🔇' : '🔊';
  if (isMuted && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

function speak(text, force = false) {
  if ((isMuted && !force) || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const clean = String(text ?? '')
      .replace(/<[^>]*>/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();
    if (!clean) return;
    const utterance = new SpeechSynthesisUtterance(clean);

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length) {
      const preferred = voices.find(v =>
        v.name.includes('Google') ||
        v.name.includes('Natural') ||
        v.name.includes('Neural') ||
        v.lang === 'en-IN'
      ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

      if (preferred) utterance.voice = preferred;
    }
    utterance.lang = 'en-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.log("Speech synthesis error", err);
  }
}

function speakFromButton(btn) {
  if (!('speechSynthesis' in window)) {
    alert("Speech playback is not supported on this device/browser.");
    return;
  }

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    document.querySelectorAll('.listen-btn').forEach(b => b.textContent = '🔊');
    return;
  }

  const content = btn.closest('.msg-content');
  const bubble = content ? content.querySelector('.msg-bubble') : null;
  const text = bubble ? bubble.textContent : '';
  if (!text) return;

  document.querySelectorAll('.listen-btn').forEach(b => b.textContent = '🔊');
  btn.textContent = '⏹️';
  speak(text, true);

  const checkInterval = setInterval(() => {
    if (!window.speechSynthesis.speaking) {
      btn.textContent = '🔊';
      clearInterval(checkInterval);
    }
  }, 250);
}

// Cache voices once browser loads them asynchronously
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

// Updated runCommand
function runCommand(cmd) {
  const bar = document.getElementById('command-bar');
  if (bar) bar.classList.remove('open');
  const input = document.getElementById('user-input');
  if (input) input.value = '';

  const modeCommands = ['general', 'study', 'code', 'style', 'recipe', 'ppt'];

  if (cmd === 'clear') {
    clearMemory();
  } else if (modeCommands.includes(cmd)) {
    const btn = document.querySelector(`.mode-btn[onclick="switchMode('${cmd}', this)"]`);
    if (btn) switchMode(cmd, btn);
  } else {
    const prompts = {
      time: 'What is the current time?',
      weather: 'What is the weather like in Hyderabad today?',
      motivate: 'Give me a short motivational quote for a CSE student.',
      joke: 'Tell me a funny short joke.',
      dbms: 'Give me a quick important DBMS concept I should know.',
      dsa: 'Give me a quick DSA topic or tip I should practice today.',
      outfit: 'Suggest a quick outfit for a college student in Hyderabad.',
      help: 'List all available commands in Moonbyte with what they do.',
    };
    if (prompts[cmd]) {
      if (input) input.value = prompts[cmd];
      sendMessage();
    }
  }
}

// Auto-focus the chat input when the user starts typing anywhere on the page
document.addEventListener('keydown', function(e) {
  const active = document.activeElement;
  const isTypingElsewhere = active && (
    active.tagName === 'INPUT' ||
    active.tagName === 'TEXTAREA' ||
    active.isContentEditable
  );
  const ignoredKeys = ['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'Escape', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

  const wardrobeModal = document.getElementById('wardrobe-modal');
  const cookbookModal = document.getElementById('cookbook-modal');
  const isModalOpen = document.body.classList.contains('auth-open') ||
    (wardrobeModal && wardrobeModal.style.display === 'flex') ||
    (cookbookModal && cookbookModal.style.display === 'flex');

  if (!isTypingElsewhere && !isModalOpen && !ignoredKeys.includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const input = document.getElementById('user-input');
    if (input) input.focus();
  }
});
