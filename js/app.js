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
{"message": "short friendly reply, 1-3 sentences", "outfits": [{"title": "Outfit name", "occasion": "where to wear it", "items": [{"name": "Navy linen shirt", "color": "navy", "hex": "#1f2a44"}], "tip": "one short styling tip"}]}
When he asks for outfit ideas, give 2 outfits (3 at most) with 3 to 5 items each. For a general fashion question, answer in "message" and use an empty "outfits" list. Every hex must be a 6-digit value like #1f2a44.`,
      recipe: `You are Moonbyte in Recipe Mode. Help Irfan with cooking like a foodie friend. He loves biryani and pizza. Suggest simple practical recipes. Keep it fun and casual.`,
      ppt: `You are Moonbyte in Presentation Mode. Irfan will describe a topic and how many slides he wants. Respond ONLY with valid JSON, no other text, no markdown code fences, in this exact structure:
      {"title": "Presentation Title", "slides": [{"heading": "Slide Heading", "bullets": ["point 1", "point 2", "point 3"]}]}
      Keep each bullet short (under 15 words). Match the number of slides Irfan asks for (default to 5 if he doesn't say). Do not include anything outside the JSON object.`
};
    let currentMode = "general";
    let systemPrompt = modes.general;

        function renderChatHistory() {
      const container = document.getElementById('chat-history');
      container.innerHTML = '';
      chatSessions.slice(-8).reverse().forEach((session, i) => {
        const div = document.createElement('div');
        div.className = 'chat-history-item' + (i === 0 ? ' active' : '');
        div.textContent = session.title || 'Conversation';
        div.style.cursor = 'pointer';
        div.onclick = () => loadSession(session);
        container.appendChild(div);
      });
    }

    function loadSession(session) {
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
        const parsed = JSON.parse(saved);
        const recent = parsed.slice(-30);
        recent.forEach(msg => {
          conversationHistory.push(msg);
          addMessage(msg.role === "user" ? "user" : "assistant", msg.content);
        });
        addMessage("assistant", "Welcome back Irfan! 🌙 I remember our last conversation.");
      } else {
        addMessage("assistant", "Hey Irfan! 🌙 Moonbyte is online. What can I help you with today?");
      }
      renderChatHistory();
    };

      function switchMode(mode, btn) {
      if (conversationHistory.length > 0) {
        const firstMsg = conversationHistory.find(m => m.role === 'user');
        const title = firstMsg ? firstMsg.content.slice(0, 30) + '...' : 'Conversation';
        chatSessions.push({ title, time: Date.now(), messages: [...conversationHistory] });
        localStorage.setItem('moonbyte-sessions', JSON.stringify(chatSessions));
      }
      currentMode = mode;
      systemPrompt = modes[mode];
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('mode-title').textContent = btn.textContent.trim();
      document.getElementById('chat-box').innerHTML = '';
      const welcomes = {
        general: "Hey Irfan! 🌙 Switched to General mode. What's on your mind?",
        study: "📚 Study Mode ON! What subject are we tackling today Irfan?",
        code: "💻 Code Mode ON! Share your code or tell me what you're building Irfan!",
        style: "👔 Style Mode ON! Let's talk fashion Irfan. What's the occasion?",
        recipe: "🍳 Recipe Mode ON! Hungry Irfan? Tell me what ingredients you have!",
        ppt: "📊 Presentation Mode ON! Tell me the topic and how many slides you want, Irfan!"
      };
      addMessage("assistant", welcomes[mode]);
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
      document.getElementById('chat-box').innerHTML = '';
      addMessage("assistant", "Memory cleared! Fresh start Irfan. 🌙");
    }

    async function sendMessage() {
      const input = document.getElementById("user-input");
      const btn = document.getElementById("send-btn");
      const userText = input.value.trim();
      if (!userText) {
    const wrap = document.querySelector('.input-wrap');
    wrap.classList.add('shake');
    setTimeout(() => wrap.classList.remove('shake'), 400);
    return;
     }

      addMessage("user", userText);
      input.value = "";
      btn.classList.add('clicked');
      setTimeout(() => btn.classList.remove('clicked'), 300);
      btn.disabled = true;
      btn.disabled = true;

      const mathRegex = /^[\d\s\+\-\*\/\(\)\.]+$/;
      let processedText = userText;
      if (mathRegex.test(userText)) {
        const result = calculate(userText);
        processedText = `${userText} = ${result}`;
      }

     // Check if it's a search query
const searchTriggers = ['search', 'find', 'look up', 'what is', 'who is', 'latest', 'news', 'current'];
const isSearch = searchTriggers.some(trigger => userText.toLowerCase().startsWith(trigger));

conversationHistory.push({ role: "user", content: processedText });
const thinkingDiv = addMessage("thinking", "");
thinkingDiv.innerHTML = `<div class="msg-avatar ai-av">🌙</div><div class="msg-content"><div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>`;
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
      searchQuery: isSearch ? userText : null
    })
  });
  const groqData = await groqResponse.json();
  if (groqData.reply) reply = groqData.reply;
} catch (e) { console.log("Groq failed 🔄", e); }

        conversationHistory.push({ role: "assistant", content: reply || "Something went wrong." });
        if (conversationHistory.length > 100) conversationHistory.splice(0, conversationHistory.length - 100);
        localStorage.setItem('moonbyte-history', JSON.stringify(conversationHistory));

              thinkingDiv.className = "message assistant";

if (currentMode === "style" && reply && showStyleReply(thinkingDiv, reply)) {
  // outfit cards were drawn by showStyleReply (js/wardrobe.js)
} else if (currentMode === "ppt" && reply) {
  try {
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in reply");
    const cleaned = jsonMatch[0];
    const data = JSON.parse(cleaned);
    generatePPTX(data);
    thinkingDiv.innerHTML = `<div class="msg-avatar ai-av">🌙</div><div class="msg-content"><div class="msg-bubble">✅ Your presentation "${data.title}" is ready! Downloading now...</div></div>`;
  } catch (e) {
    console.log("PPT parse failed", e);
    console.log("Raw reply was:", reply);
    thinkingDiv.innerHTML = `<div class="msg-avatar ai-av">🌙</div><div class="msg-content"><div class="msg-bubble">Couldn't build the slides from that reply — try rephrasing your topic.</div></div>`;
  }
} else {
const replyText = reply || "Something went wrong. Try again!";
thinkingDiv.innerHTML = `<div class="msg-avatar ai-av">🌙</div><div class="msg-content"><div class="msg-bubble">${formatReply(replyText)}</div></div>`;
speak(replyText);
}
      } catch (error) {
        thinkingDiv.className = "message assistant";
        thinkingDiv.innerHTML = `<div class="msg-avatar ai-av">🌙</div><div class="msg-content"><div class="msg-bubble">Something went wrong. Try again!</div></div>`;
      }

      btn.disabled = false;
      input.focus();
    }

    function formatReply(text) {
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
    }
    function generatePPTX(data) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'MOON', width: 10, height: 5.63 });
  pptx.layout = 'MOON';

  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: '1a1a2e' };
  titleSlide.addText(data.title || 'Presentation', {
    x: 0.5, y: 2, w: 9, h: 1.5, fontSize: 36, bold: true, color: 'FFFFFF', align: 'center'
  });

  (data.slides || []).forEach(slide => {
    const s = pptx.addSlide();
    s.background = { color: 'FFFFFF' };
    s.addText(slide.heading || '', { x: 0.5, y: 0.4, w: 9, h: 0.8, fontSize: 28, bold: true, color: '1a1a2e' });
    const bulletText = (slide.bullets || []).map(b => ({ text: b, options: { bullet: true, breakLine: true } }));
    s.addText(bulletText, { x: 0.7, y: 1.4, w: 8.5, h: 3.8, fontSize: 18, color: '333333' });
  });

  pptx.writeFile({ fileName: (data.title || 'Moonbyte-Presentation').replace(/[^a-z0-9]/gi, '_') + '.pptx' });
}
    function addMessage(role, text) {
  const box = document.getElementById("chat-box");
  const div = document.createElement("div");
  div.className = `message ${role}`;
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (role === "user") {
    div.innerHTML = `<div class="msg-avatar user-av" onclick="toggleAvatarPicker()" style="cursor:pointer">${userAvatar}</div><div class="msg-content"><div class="msg-bubble">${formatReply(text)}</div><div class="msg-time">${timeStr}</div></div>`;
  } else {
    div.innerHTML = `<div class="msg-avatar ai-av">🌙</div><div class="msg-content"><div class="msg-bubble">${formatReply(text)}</div><div class="msg-time">${timeStr}</div></div>`;
  }
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div;
}

    document.getElementById("user-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendMessage();
    });

    function startVoice() {
      const btn = document.getElementById("mic-btn");
      const input = document.getElementById("user-input");
      const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
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
    }

    function calculate(expression) {
      try { return eval(expression); }
      catch { return "Invalid calculation"; }
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

// Close picker when clicking outside
document.addEventListener('click', (e) => {
  const picker = document.getElementById('avatar-picker');
  if (!e.target.closest('.user-av') && !e.target.closest('.avatar-picker')) {
    picker.classList.remove('open');
  }
});
// Command bar
// Text to speech
let isMuted = false;

function toggleMute() {
  isMuted = !isMuted;
  const btn = document.getElementById('mute-btn');
  btn.textContent = isMuted ? '🔇' : '🔊';
  if (isMuted) window.speechSynthesis.cancel();
}

function speak(text) {
  if (isMuted) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/<[^>]*>/g, '').replace(/\*\*/g, '').replace(/\*/g, '');
  const utterance = new SpeechSynthesisUtterance(clean);
  
  // Pick best available voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => 
    v.name.includes('Google') || 
    v.name.includes('Natural') ||
    v.name.includes('Neural') ||
    v.lang === 'en-IN'
  ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
  
  if (preferred) utterance.voice = preferred;
  utterance.lang = 'en-IN';
  utterance.rate = 0.95;
  utterance.pitch = 1.1;
  window.speechSynthesis.speak(utterance);
}

// Updated runCommand with new commands
function runCommand(cmd) {
  const bar = document.getElementById('command-bar');
  bar.classList.remove('open');
  document.getElementById('user-input').value = '';

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
      document.getElementById('user-input').value = prompts[cmd];
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

  if (!isTypingElsewhere && !document.body.classList.contains('auth-open') && !ignoredKeys.includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const input = document.getElementById('user-input');
    if (input) input.focus();
  }
});
