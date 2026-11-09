// PPT mode: a small form, a stronger prompt, and a better deck builder (PptxGenJS is loaded in index.html).

const PPT_THEMES = {
  moon:   { name: 'Moon',   dark: '1A1A2E', accent: 'A78BFA', soft: 'F3F0FF', text: '2B2B3A' },
  ocean:  { name: 'Ocean',  dark: '0B2545', accent: '38BDF8', soft: 'E8F5FD', text: '1F2D3D' },
  forest: { name: 'Forest', dark: '12372A', accent: '4ADE80', soft: 'EAF7EF', text: '1F2D26' },
  sunset: { name: 'Sunset', dark: '3B1F2B', accent: 'FF8A5C', soft: 'FFF1EA', text: '33242A' },
  clean:  { name: 'Clean',  dark: '222222', accent: '2563EB', soft: 'F3F4F6', text: '222222' },
};
const pptOpts = { theme: 'moon', author: '', images: false };

modes.ppt = `You are Moonbyte in Presentation Mode. Build a presentation from Irfan's request. Respond ONLY with valid JSON, no text outside it and no code fences, in this shape:
{"title": "Deck title", "subtitle": "one short line", "slides": [{"heading": "Slide heading", "bullets": ["point 1", "point 2", "point 3"], "wiki": "Wikipedia article title", "notes": "what to say", "chart": {"type": "bar", "label": "Series name (unit)", "labels": ["A", "B", "C"], "values": [1, 2, 3]}}]}
Rules:
- Make exactly the number of content slides requested (5 if not stated). Do not add a title slide; the app adds it.
- Suit the depth and tone to the stated purpose and audience, and cover any key points he lists.
- 3 to 5 bullets per slide, each under 14 words. A slide with a chart has at most 3 bullets.
- "wiki", "notes" and "chart" are optional. Include "wiki" (a real, generic English Wikipedia article title that has a picture, such as Solar panel or Printing press) on most slides, only when pictures are requested. Include "notes" (2 or 3 sentences to say aloud) only when speaker notes are requested. Include at most one "chart" (type bar, line or pie; 3 to 6 labels; real figures only) only when a chart is requested and the topic has real numbers; otherwise leave it out.`;

// ---------- The form ----------

function showPptForm() {
  const box = document.getElementById('chat-box');
  box.querySelectorAll('.ppt-form').forEach((f) => f.remove());
  const form = document.createElement('div');
  form.className = 'ppt-form';
  form.innerHTML = `
    <h3>📊 New presentation</h3>
    <label>Topic<input id="ppt-topic" type="text" maxlength="120" placeholder="e.g. Climate change" /></label>
    <div class="ppt-row">
      <label>Slides<input id="ppt-count" type="number" min="3" max="12" value="6" /></label>
      <label>Purpose
        <select id="ppt-purpose">
          <option>Class seminar</option><option>Project demo</option><option>Pitch</option>
          <option>Report</option><option>Training session</option>
        </select>
      </label>
      <label>Audience
        <select id="ppt-audience">
          <option>Classmates</option><option>Faculty</option><option>Recruiters</option><option>General public</option>
        </select>
      </label>
    </div>
    <label>Points to cover (optional)<textarea id="ppt-points" rows="2" maxlength="400" placeholder="Causes, effects, solutions…"></textarea></label>
    <div class="ppt-label">Colour theme</div>
    <div class="ppt-themes">${Object.entries(PPT_THEMES).map(([k, t]) =>
      `<button type="button" class="ppt-swatch${k === pptOpts.theme ? ' on' : ''}" data-theme="${k}" style="--c:#${t.accent};--d:#${t.dark}">${t.name}</button>`).join('')}</div>
    <div class="ppt-checks">
      <label><input id="ppt-images" type="checkbox" checked /> Pictures</label>
      <label><input id="ppt-notes" type="checkbox" /> Speaker notes</label>
      <label><input id="ppt-chart" type="checkbox" /> Chart</label>
    </div>
    <label>Your name on the title slide (optional)<input id="ppt-author" type="text" maxlength="60" /></label>
    <button type="button" id="ppt-go" class="ppt-go">Create presentation</button>`;

  form.querySelectorAll('.ppt-swatch').forEach((b) => {
    b.onclick = () => {
      form.querySelectorAll('.ppt-swatch').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      pptOpts.theme = b.dataset.theme;
    };
  });
  form.querySelector('#ppt-go').onclick = () => submitPptForm(form);
  box.appendChild(form);
  box.scrollTop = box.scrollHeight;
}

function submitPptForm(form) {
  const val = (id) => form.querySelector('#' + id).value.trim();
  const topic = val('ppt-topic');
  if (!topic) {
    form.querySelector('#ppt-topic').focus();
    return;
  }
  if (document.getElementById('send-btn').disabled) return;   // a reply is still on its way
  const count = Math.min(12, Math.max(3, parseInt(val('ppt-count'), 10) || 6));
  const yes = (id) => (form.querySelector('#' + id).checked ? 'yes' : 'no');
  pptOpts.author = val('ppt-author');
  pptOpts.images = form.querySelector('#ppt-images').checked;

  const lines = [
    'Topic: ' + topic,
    'Slides: ' + count,
    'Purpose: ' + val('ppt-purpose'),
    'Audience: ' + val('ppt-audience'),
    'Pictures: ' + yes('ppt-images'),
    'Speaker notes: ' + yes('ppt-notes'),
    'Chart: ' + yes('ppt-chart'),
  ];
  if (val('ppt-points')) lines.push('Points to cover: ' + val('ppt-points'));
  document.getElementById('user-input').value = lines.join('\n');
  sendMessage();
}

// ---------- The reply ----------

// Called from sendMessage (app.js). Returns true when it handled the reply.
function showPptReply(div, reply) {
  const data = parseJsonReply(reply);
  if (!data) return looksLikeJson(reply) ? showFormatFailure(div) : false;
  const slides = (Array.isArray(data.slides) ? data.slides : []).filter((s) => s && typeof s === 'object');
  if (!slides.length) return showFormatFailure(div);

  const title = String(data.title || 'Presentation').slice(0, 100);
  const say = (text) => {
    div.innerHTML = '<div class="msg-avatar ai-av">🌙</div><div class="msg-content">'
      + '<div class="msg-bubble">' + escHtml(text) + '</div></div>';
  };
  say('⏳ Building "' + title + '"…');
  replaceLastAssistant('Presentation: ' + title);

  buildDeck({ ...data, title, slides })
        .then((r) => {
      let note = '';
      if (pptOpts.images && !r.wanted) note = ' No pictures: the AI did not pick any picture topics, try again.';
      else if (r.wanted) note = ' Pictures: ' + r.got + ' of ' + r.wanted + (r.got < r.wanted ? ' (' + r.why + ')' : '') + '.';
      say('✅ "' + title + '" is ready. Downloading now…' + note);
    })
    .catch((err) => {
      console.log('PPT build failed', err);
      say("Couldn't build the file. Please try again.");
    });
  return true;
}

// ---------- The deck ----------

// Wikipedia picture as a data URL (so it is embedded in the file); '' if none or too slow
// Picture for a title: the article's main picture, or else the best Wikipedia search hit that has one
async function pptThumbUrl(title) {
  const direct = await wikiThumb(title, 800);
  if (direct) return direct;
  try {
    const api = 'https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrlimit=5&prop=pageimages&piprop=thumbnail'
      + '&pithumbsize=800&format=json&origin=*&gsrsearch=' + encodeURIComponent(title);
    const res = await fetch(api);
    if (!res.ok) return '';
    const data = await res.json();
    const pages = Object.values((data.query && data.query.pages) || {}).sort((x, y) => x.index - y.index);
    const hit = pages.find((p) => p.thumbnail && String(p.thumbnail.source).startsWith('https://upload.wikimedia.org/'));
    return hit ? hit.thumbnail.source : '';
  } catch (err) {
    return '';
  }
}

// Wikipedia picture as a data URL (so it is embedded in the file). Returns { data } or { why }.
async function pptImage(title) {
  if (typeof title !== 'string' || !WIKI_TITLE.test(title)) return { why: 'no picture topic' };
  try {
    const limit = new Promise((resolve) => setTimeout(() => resolve(''), 8000));
    const url = await Promise.race([pptThumbUrl(title), limit]);
    if (!url) return { why: 'none found' };
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { why: 'download failed ' + res.status };
    const blob = await res.blob();
    if (!/^image\/(jpeg|png)$/.test(blob.type)) return { why: 'unsupported type ' + blob.type };
    const data = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => resolve('');
      r.readAsDataURL(blob);
    });
    return data ? { data } : { why: 'could not read image' };
  } catch (err) {
    console.log('PPT image failed for', title, err);
    return { why: 'blocked by the browser' };
  }
}

// Only accepts a chart the model filled in properly
function cleanChart(c) {
  if (!c || typeof c !== 'object') return null;
  const labels = Array.isArray(c.labels) ? c.labels.slice(0, 6).map((x) => String(x).slice(0, 30)) : [];
  const values = Array.isArray(c.values) ? c.values.slice(0, 6).map(Number) : [];
  if (labels.length < 2 || labels.length !== values.length || values.some((v) => !Number.isFinite(v))) return null;
  const type = ['bar', 'line', 'pie'].includes(c.type) ? c.type : 'bar';
  return { type, name: String(c.label || 'Values').slice(0, 60), labels, values };
}

async function buildDeck(data) {
  const t = PPT_THEMES[pptOpts.theme] || PPT_THEMES.moon;
  const slides = data.slides.slice(0, 12);
    const found = await Promise.all(slides.map((s) => pptImage(s.wiki)));
   const seen = new Set();                         // never use the same picture twice
  found.forEach((f) => {
    if (f.data && seen.has(f.data)) { delete f.data; f.why = 'repeat of another slide'; }
    else if (f.data) seen.add(f.data);
  });
  const images = found.map((f) => f.data || '');
  const tried = found.filter((f) => f.why !== 'no picture topic');
  const result = {
    wanted: tried.length,
    got: images.filter(Boolean).length,
    why: [...new Set(tried.map((f) => f.why).filter(Boolean))].slice(0, 2).join(', '),
  };

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'MOON', width: 10, height: 5.63 });
  pptx.layout = 'MOON';
  pptx.title = data.title;
  const font = 'Calibri';

  // Title slide
  const first = pptx.addSlide();
  first.background = { color: t.dark };
  first.addShape(pptx.ShapeType.rect, { x: 0.7, y: 1.55, w: 0.12, h: 1.9, fill: { color: t.accent }, line: { color: t.accent } });
  first.addText(data.title, { x: 1.1, y: 1.45, w: 8.2, h: 1.4, fontFace: font, fontSize: 38, bold: true, color: 'FFFFFF', valign: 'middle', fit: 'shrink' });
  const sub = [data.subtitle, pptOpts.author].filter((x) => typeof x === 'string' && x.trim());
  if (sub.length) {
    first.addText(sub.join('  ·  ').slice(0, 140), { x: 1.1, y: 2.95, w: 8.2, h: 0.6, fontFace: font, fontSize: 18, color: t.accent, valign: 'top', fit: 'shrink' });
  }

  slides.forEach((slide, i) => {
    const s = pptx.addSlide();
    s.background = { color: 'FFFFFF' };
    const chart = cleanChart(slide.chart);
    const img = images[i];
    const bullets = (Array.isArray(slide.bullets) ? slide.bullets : []).slice(0, chart ? 3 : 6)
      .map((b) => ({ text: String(b).slice(0, 140), options: { bullet: { indent: 18 }, breakLine: true, paraSpaceAfter: 8 } }));
    const side = chart || img;                      // something on the right-hand side
    const textW = side ? 4.9 : 8.6;

    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.15, fill: { color: t.soft }, line: { color: t.soft } });
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 1.15, fill: { color: t.accent }, line: { color: t.accent } });
    s.addText(String(slide.heading || '').slice(0, 80), { x: 0.5, y: 0.1, w: 9, h: 0.95, fontFace: font, fontSize: 28, bold: true, color: t.dark, valign: 'middle', fit: 'shrink' });
    s.addText(bullets, { x: 0.6, y: 1.45, w: textW, h: 3.6, fontFace: font, fontSize: side ? 18 : 20, color: t.text, valign: 'top', fit: 'shrink' });

    if (chart) {
      const type = { bar: pptx.charts.BAR, line: pptx.charts.LINE, pie: pptx.charts.PIE }[chart.type];
      const opts = { x: 5.7, y: 1.4, w: 3.9, h: 3.6, showLegend: chart.type === 'pie', legendPos: 'b', legendFontSize: 11,
        chartColors: chart.type === 'pie' ? [t.accent, t.dark, '94A3B8', 'F59E0B', '10B981', 'EF4444'] : [t.accent],
        catAxisLabelFontSize: 11, valAxisLabelFontSize: 11, showTitle: true, title: chart.name, titleFontSize: 12, titleColor: t.text };
      s.addChart(type, [{ name: chart.name, labels: chart.labels, values: chart.values }], opts);
    } else if (img) {
      s.addImage({ data: img, x: 5.7, y: 1.45, w: 3.9, h: 3.3, sizing: { type: 'contain', w: 3.9, h: 3.3 } });
      s.addText('Image: Wikipedia', { x: 5.7, y: 4.75, w: 3.9, h: 0.25, fontFace: font, fontSize: 9, color: '888888', align: 'right' });
    }

    s.addText(String(i + 1), { x: 9.1, y: 5.2, w: 0.6, h: 0.3, fontFace: font, fontSize: 11, color: '888888', align: 'right' });
    if (typeof slide.notes === 'string' && slide.notes.trim()) s.addNotes(slide.notes.slice(0, 1000));
  });

  await pptx.writeFile({ fileName: data.title.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') + '.pptx' });
  return result;
}