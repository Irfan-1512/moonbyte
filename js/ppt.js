// PPT mode: a small form, a prompt that lets the AI pick the theme and layouts, and the deck builder.
// PptxGenJS is loaded in index.html.

const PPT_PRESETS = {
  moon:   { name: 'Moon',   bg: '0B0B1A', accent: 'A78BFA' },
  ocean:  { name: 'Ocean',  bg: '07121F', accent: '38BDF8' },
  forest: { name: 'Forest', bg: '08140F', accent: '4ADE80' },
  sunset: { name: 'Sunset', bg: '1A0E12', accent: 'FF8A5C' },
  clean:  { name: 'Clean',  bg: 'F8FAFC', accent: '2563EB' },
};
const pptOpts = { theme: 'auto', author: '', images: false };
const PPT_FONT = 'Calibri';

modes.ppt = `You are Moonbyte in Presentation Mode. Build a polished presentation from Irfan's request. Respond ONLY with valid JSON, no text outside it and no code fences, in this shape:
{"title": "Deck title", "kicker": "SHORT TOPIC LABEL", "subtitle": "one short line", "theme": {"bg": "#0A0E17", "accent": "#22D3EE"}, "closing": {"title": "Closing line", "subtitle": "short line"}, "slides": [ ...slide objects... ]}
Every slide has "layout", "heading", an optional "kicker" (2 or 3 words such as HUMAN COST) and an optional "notes". The layouts:
- "bullets": "bullets" is 3 or 4 strings, each like "Short title: one short explanation" (under 16 words). Optional "wiki" (a generic English Wikipedia article title that has a picture, such as Solar panel) and optional "chart": {"type": "bar" or "line" or "pie", "label": "Name (unit)", "labels": [3 to 6 names], "values": [numbers]}.
- "stat": "stat": {"value": "9.0M", "label": "what it measures", "detail": "one line of context"} for one headline number.
- "stats": "stats" is 2 to 4 objects shaped like stat, for a row of key figures.
- "cards": "cards" is 2 to 4 objects {"title": "...", "text": "under 14 words"} for categories or comparisons.
- "steps": same as cards, for an ordered process or roadmap.
- "table": "table": {"columns": [2 to 4 names], "rows": [2 to 5 rows of short strings]} for comparisons.
Rules:
- Make exactly the number of content slides requested (5 if not stated). The app adds the title, closing and picture-credit slides itself.
- Choose "theme" yourself to suit the topic and mood: "bg" is one solid colour (very dark works best, or very light) and "accent" is one bright colour that stands out on it. Always include it.
- Mix the layouts: use at least 3 different layouts when there are 5 or more slides, and begin with an overview slide.
- Never invent statistics. Use a number only when you are confident it is right; otherwise use words and the bullets, cards or steps layouts. The stat, stats, table and chart layouts need real figures.
- Suit the depth and tone to the stated purpose and audience, and cover any points he lists.
- Include "wiki" (bullets slides only) only when pictures are requested, on about half of the bullets slides. Include "notes" (2 or 3 sentences to say aloud) only when speaker notes are requested. Include a "chart" only when a chart is requested, at most once.`;

// ---------- Colours ----------

const hex6 = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c || '').trim()); return m ? m[1].toUpperCase() : ''; };
const rgb = (h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h) => {
  const [r, g, b] = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mix = (a, b, t) => {
  const [p, q] = [rgb(a), rgb(b)];
  return p.map((v, i) => Math.round(v + (q[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
};

// Turns a background and an accent into a full palette, fixing combinations that would be hard to read
function makeTheme(bg, accent) {
  const dark = lum(bg) < 0.4;
  const text = dark ? 'FFFFFF' : '0F172A';
  if (contrast(accent, bg) < 3) accent = dark ? '22D3EE' : '2563EB';
  return { bg, accent, text, muted: mix(text, bg, 0.4), card: mix(bg, text, 0.06), line: mix(bg, text, 0.14) };
}

function resolveTheme(data) {
  const preset = PPT_PRESETS[pptOpts.theme];
  const bg = preset ? preset.bg : hex6(data.theme && data.theme.bg);
  const accent = preset ? preset.accent : hex6(data.theme && data.theme.accent);
  const t = bg && accent ? makeTheme(bg, accent) : null;
  if (t && contrast(t.text, t.bg) >= 4.5) return t;           // a mid-tone background is too hard to read
  return makeTheme(PPT_PRESETS.ocean.bg, PPT_PRESETS.ocean.accent);
}

// ---------- The form ----------

function showPptForm() {
  const box = document.getElementById('chat-box');
  box.querySelectorAll('.ppt-form').forEach((f) => f.remove());
  const form = document.createElement('div');
  form.className = 'ppt-form';
  const swatches = '<button type="button" class="ppt-swatch on" data-theme="auto" style="--c:#A78BFA;--d:#22D3EE">✨ Auto</button>'
    + Object.entries(PPT_PRESETS).map(([k, p]) =>
      `<button type="button" class="ppt-swatch" data-theme="${k}" style="--c:#${p.accent};--d:#${p.bg}">${p.name}</button>`).join('');
  form.innerHTML = `
    <h3>📊 New presentation</h3>
    <label>Topic<input id="ppt-topic" type="text" maxlength="120" placeholder="e.g. Climate change" /></label>
    <div class="ppt-row">
      <label>Content slides<input id="ppt-count" type="number" min="3" max="12" value="6" /></label>
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
    <div class="ppt-label">Look: Auto lets the AI design the colours</div>
    <div class="ppt-themes">${swatches}</div>
    <div class="ppt-checks">
      <label><input id="ppt-images" type="checkbox" checked /> Pictures</label>
      <label><input id="ppt-notes" type="checkbox" /> Speaker notes</label>
      <label><input id="ppt-chart" type="checkbox" /> Chart</label>
    </div>
    <label>Your name on the title slide (optional)<input id="ppt-author" type="text" maxlength="60" /></label>
    <button type="button" id="ppt-go" class="ppt-go">Create presentation</button>`;

  pptOpts.theme = 'auto';
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
    'Content slides: ' + count,
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

// ---------- Pictures ----------

// Picture for a title: the article's main picture, or else the best Wikipedia search hit that has one.
// Returns { url, page } where page is the article the picture belongs to.
async function pptThumbUrl(title) {
  const direct = await wikiThumb(title, 800);
  if (direct) return { url: direct, page: title };
  try {
    const api = 'https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrlimit=5&prop=pageimages&piprop=thumbnail'
      + '&pithumbsize=800&format=json&origin=*&gsrsearch=' + encodeURIComponent(title);
    const res = await fetch(api);
    if (!res.ok) return null;
    const data = await res.json();
    const pages = Object.values((data.query && data.query.pages) || {}).sort((x, y) => x.index - y.index);
    const hit = pages.find((p) => p.thumbnail && String(p.thumbnail.source).startsWith('https://upload.wikimedia.org/'));
    return hit ? { url: hit.thumbnail.source, page: String(hit.title) } : null;
  } catch (err) {
    return null;
  }
}

// Wikipedia picture as a data URL (so it is embedded in the file). Returns { data, page } or { why }.
async function pptImage(title) {
  if (typeof title !== 'string' || !WIKI_TITLE.test(title)) return { why: 'no picture topic' };
  try {
    const limit = new Promise((resolve) => setTimeout(() => resolve(null), 8000));
    const found = await Promise.race([pptThumbUrl(title), limit]);
    if (!found) return { why: 'none found' };
    const res = await fetch(found.url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { why: 'download failed ' + res.status };
    const blob = await res.blob();
    if (!/^image\/(jpeg|png)$/.test(blob.type)) return { why: 'unsupported type ' + blob.type };
    const data = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => resolve('');
      r.readAsDataURL(blob);
    });
    return data ? { data, page: found.page } : { why: 'could not read image' };
  } catch (err) {
    console.log('PPT image failed for', title, err);
    return { why: 'blocked by the browser' };
  }
}

// ---------- Cleaning what the AI sent (anything unusable falls back to a plain bullets slide) ----------

const str = (v, n) => String(v == null ? '' : v).trim().slice(0, n);

function cleanChart(c) {
  if (!c || typeof c !== 'object') return null;
  const labels = Array.isArray(c.labels) ? c.labels.slice(0, 6).map((x) => str(x, 30)) : [];
  const values = Array.isArray(c.values) ? c.values.slice(0, 6).map(Number) : [];
  if (labels.length < 2 || labels.length !== values.length || values.some((v) => !Number.isFinite(v))) return null;
  const type = ['bar', 'line', 'pie'].includes(c.type) ? c.type : 'bar';
  return { type, name: str(c.label, 60) || 'Values', labels, values };
}

function cleanStat(o) {
  if (!o || typeof o !== 'object') return null;
  const value = str(o.value, 12), label = str(o.label, 70);
  return value && label ? { value, label, detail: str(o.detail, 110) } : null;
}

function cleanList(list, pick, min, max) {
  const out = (Array.isArray(list) ? list : []).map(pick).filter(Boolean).slice(0, max);
  return out.length >= min ? out : null;
}

function cleanTable(t) {
  if (!t || typeof t !== 'object' || !Array.isArray(t.columns) || !Array.isArray(t.rows)) return null;
  const columns = t.columns.slice(0, 4).map((c) => str(c, 40));
  if (columns.length < 2 || columns.some((c) => !c)) return null;
  const rows = t.rows.filter(Array.isArray).slice(0, 5).map((r) => columns.map((_, i) => str(r[i], 50)));
  return rows.length >= 2 ? { columns, rows } : null;
}

function plainBullets(slide) {
  const b = (Array.isArray(slide.bullets) ? slide.bullets : []).map((x) => str(x, 140)).filter(Boolean);
  if (b.length) return b;
  const out = [];
  (Array.isArray(slide.cards) ? slide.cards : []).forEach((c) => c && c.title && out.push(str(c.title, 60) + (c.text ? ': ' + str(c.text, 90) : '')));
  (Array.isArray(slide.stats) ? slide.stats : []).forEach((c) => c && c.value && out.push(str(c.value, 12) + ' ' + str(c.label, 80)));
  if (slide.stat && slide.stat.value) out.push(str(slide.stat.value, 12) + ' ' + str(slide.stat.label, 80));
  return out;
}

// "Lead: rest" -> ['Lead', 'rest']
function splitLead(b) {
  const i = b.indexOf(': ');
  return i > 0 && i < 40 ? [b.slice(0, i), b.slice(i + 2)] : ['', b];
}

// ---------- Layouts (each draws below the heading and returns false when its data is unusable) ----------

function drawCard(pptx, s, t, x, y, w, h, bar) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.1, fill: { color: t.card }, line: { color: t.line, width: 0.75 } });
  if (bar) s.addShape(pptx.ShapeType.rect, { x, y: y + 0.12, w: 0.06, h: h - 0.24, fill: { color: t.accent }, line: { color: t.accent } });
}

function layoutStat(pptx, s, t, slide) {
  const st = cleanStat(slide.stat);
  if (!st) return false;
  s.addText(st.value, { x: 0.5, y: 1.5, w: 9, h: 1.6, fontFace: PPT_FONT, fontSize: st.value.length > 7 ? 54 : 88, bold: true, color: t.accent, align: 'center', valign: 'middle', fit: 'shrink' });
  s.addText(st.label, { x: 0.8, y: 3.2, w: 8.4, h: 0.6, fontFace: PPT_FONT, fontSize: 22, bold: true, color: t.text, align: 'center', valign: 'middle', fit: 'shrink' });
  if (st.detail) s.addText(st.detail, { x: 1, y: 3.85, w: 8, h: 0.6, fontFace: PPT_FONT, fontSize: 14, color: t.muted, align: 'center', valign: 'top', fit: 'shrink' });
  return true;
}

function layoutStats(pptx, s, t, slide) {
  const items = cleanList(slide.stats, cleanStat, 2, 4);
  if (!items) return false;
  const w = 9 / items.length;
  items.forEach((it, i) => {
    const x = 0.5 + i * w;
    s.addText(it.value, { x, y: 1.9, w, h: 1.1, fontFace: PPT_FONT, fontSize: items.length > 3 ? 40 : 52, bold: true, color: t.accent, align: 'center', valign: 'middle', fit: 'shrink' });
    s.addText(it.label, { x: x + 0.15, y: 3.05, w: w - 0.3, h: 0.5, fontFace: PPT_FONT, fontSize: 16, bold: true, color: t.text, align: 'center', valign: 'top', fit: 'shrink' });
    if (it.detail) s.addText(it.detail, { x: x + 0.15, y: 3.55, w: w - 0.3, h: 0.8, fontFace: PPT_FONT, fontSize: 12, color: t.muted, align: 'center', valign: 'top', fit: 'shrink' });
    if (i) s.addShape(pptx.ShapeType.line, { x, y: 1.95, w: 0, h: 2.4, line: { color: t.line, width: 1 } });
  });
  return true;
}

function layoutCards(pptx, s, t, slide, steps) {
  const items = cleanList(slide.cards, (c) => (c && str(c.title, 40) ? { title: str(c.title, 40), text: str(c.text, 110) } : null), 2, 4);
  if (!items) return false;
  const gap = 0.25, w = (9 - gap * (items.length - 1)) / items.length;
  items.forEach((c, i) => {
    const x = 0.5 + i * (w + gap);
    drawCard(pptx, s, t, x, 1.8, w, 2.3, false);
    if (steps) {
      s.addText('STAGE 0' + (i + 1), { x: x + 0.25, y: 2.0, w: w - 0.5, h: 0.3, fontFace: PPT_FONT, fontSize: 10, bold: true, color: t.accent, charSpacing: 2, margin: 0 });
    } else {
      s.addShape(pptx.ShapeType.rect, { x: x + 0.25, y: 2.05, w: 0.5, h: 0.06, fill: { color: t.accent }, line: { color: t.accent } });
    }
    const ty = steps ? 2.4 : 2.3;
    s.addText(c.title, { x: x + 0.25, y: ty, w: w - 0.5, h: 0.6, fontFace: PPT_FONT, fontSize: 17, bold: true, color: t.text, valign: 'top', fit: 'shrink', margin: 0 });
    s.addText(c.text, { x: x + 0.25, y: ty + 0.65, w: w - 0.5, h: 1.2, fontFace: PPT_FONT, fontSize: 13, color: t.muted, valign: 'top', fit: 'shrink', margin: 0 });
  });
  return true;
}

function layoutTable(pptx, s, t, slide) {
  const tb = cleanTable(slide.table);
  if (!tb) return false;
  const head = tb.columns.map((c) => ({ text: c, options: { bold: true, color: t.accent, fill: { color: mix(t.bg, t.accent, 0.18) } } }));
  const body = tb.rows.map((r) => r.map((c, i) => ({ text: c, options: { bold: i === 0, color: t.text, fill: { color: t.card } } })));
  const first = tb.columns.length === 2 ? 4 : 3.4;
  const colW = tb.columns.map((_, i) => (i === 0 ? first : (9 - first) / (tb.columns.length - 1)));
  s.addTable([head, ...body], { x: 0.5, y: 1.75, w: 9, colW, rowH: 0.55, fontFace: PPT_FONT, fontSize: 14, valign: 'middle', margin: [0, 0.15, 0, 0.15], border: { type: 'solid', pt: 0.5, color: t.line } });
  return true;
}

function layoutBullets(pptx, s, t, slide, img, chart) {
  const all = plainBullets(slide);
  const list = all.slice(0, chart ? 3 : img ? 4 : 5);
  if (!list.length) return;

  if (!chart && img) {                               // picture on the left, one card per point on the right
    s.addImage({ data: img.data, x: 0.5, y: 1.55, w: 4.1, h: 3.45, sizing: { type: 'contain', w: 4.1, h: 3.45 } });
    s.addText('Image: Wikipedia', { x: 0.5, y: 5.02, w: 4.1, h: 0.25, fontFace: PPT_FONT, fontSize: 9, color: t.muted });
    const gap = 0.12, h = Math.min(1.05, (3.45 - gap * (list.length - 1)) / list.length);
    list.forEach((b, i) => {
      const y = 1.55 + i * (h + gap), [lead, rest] = splitLead(b);
      drawCard(pptx, s, t, 4.9, y, 4.6, h, true);
      const runs = lead
        ? [{ text: lead, options: { bold: true, fontSize: 15, color: t.text, breakLine: true } }, { text: rest, options: { fontSize: 12, color: t.muted } }]
        : [{ text: rest, options: { fontSize: 14, color: t.text } }];
      s.addText(runs, { x: 5.15, y, w: 4.2, h, fontFace: PPT_FONT, valign: 'middle', fit: 'shrink', margin: 0 });
    });
  } else if (chart) {                                // short list on the left, chart on the right
    const runs = list.map((b) => ({ text: b, options: { bullet: { indent: 18 }, breakLine: true, paraSpaceAfter: 10 } }));
    s.addText(runs, { x: 0.5, y: 1.6, w: 4.6, h: 3.4, fontFace: PPT_FONT, fontSize: 17, color: t.text, valign: 'top', fit: 'shrink' });
    const type = { bar: pptx.charts.BAR, line: pptx.charts.LINE, pie: pptx.charts.PIE }[chart.type];
    const pie = chart.type === 'pie';
    s.addChart(type, [{ name: chart.name, labels: chart.labels, values: chart.values }], {
      x: 5.3, y: 1.5, w: 4.3, h: 3.6, showTitle: true, title: chart.name, titleFontSize: 12, titleColor: t.text,
      showLegend: pie, legendPos: 'b', legendFontSize: 11, legendColor: t.muted,
      chartColors: pie ? [t.accent, '94A3B8', 'F59E0B', '10B981', 'EF4444', '8B5CF6'] : [t.accent],
      catAxisLabelColor: t.muted, valAxisLabelColor: t.muted, catAxisLabelFontSize: 11, valAxisLabelFontSize: 11,
      valGridLine: { color: t.line, size: 0.5 }, catGridLine: { style: 'none' },
    });
  } else {                                           // checklist rows
    const y0 = 1.6 + (5 - list.length) * 0.2;
    list.forEach((b, i) => {
      const y = y0 + i * 0.72, [lead, rest] = splitLead(b);
      s.addShape(pptx.ShapeType.ellipse, { x: 0.55, y: y + 0.1, w: 0.3, h: 0.3, fill: { color: t.accent }, line: { color: t.accent } });
      s.addText('✓', { x: 0.55, y: y + 0.1, w: 0.3, h: 0.3, fontFace: PPT_FONT, fontSize: 10, bold: true, color: t.bg, align: 'center', valign: 'middle', margin: 0 });
      const runs = lead
        ? [{ text: lead + ': ', options: { bold: true } }, { text: rest, options: {} }]
        : [{ text: rest, options: {} }];
      s.addText(runs, { x: 1.05, y, w: 8.4, h: 0.5, fontFace: PPT_FONT, fontSize: 17, color: t.text, valign: 'middle', fit: 'shrink', margin: 0 });
    });
  }
}

// ---------- The deck ----------

const usesPicture = (slide) => !slide.layout || String(slide.layout).toLowerCase() === 'bullets';

async function buildDeck(data) {
  const t = resolveTheme(data);
  const slides = data.slides.slice(0, 12);
  const charts = slides.map((s) => (usesPicture(s) ? cleanChart(s.chart) : null));   // a chart takes the picture's place
  const found = await Promise.all(slides.map((s, i) => (usesPicture(s) && !charts[i] ? pptImage(s.wiki) : { why: 'no picture topic' })));
  const seen = new Set();                            // never use the same picture twice
  found.forEach((f) => {
    if (f.data && seen.has(f.data)) { delete f.data; f.why = 'repeat of another slide'; }
    else if (f.data) seen.add(f.data);
  });
  const tried = found.filter((f) => f.why !== 'no picture topic');
  const result = {
    wanted: tried.length,
    got: found.filter((f) => f.data).length,
    why: [...new Set(tried.map((f) => f.why).filter(Boolean))].slice(0, 2).join(', '),
  };

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'MOON', width: 10, height: 5.63 });
  pptx.layout = 'MOON';
  pptx.title = data.title;

  // Title slide
  const first = pptx.addSlide();
  first.background = { color: t.bg };
  if (data.kicker) first.addText(str(data.kicker, 50).toUpperCase(), { x: 0.8, y: 1.15, w: 8.4, h: 0.3, fontFace: PPT_FONT, fontSize: 12, bold: true, color: t.accent, charSpacing: 4, margin: 0 });
  first.addText(data.title, { x: 0.8, y: 1.5, w: 8.4, h: 1.7, fontFace: PPT_FONT, fontSize: 40, bold: true, color: t.text, valign: 'top', fit: 'shrink', margin: 0 });
  if (str(data.subtitle, 140)) first.addText(str(data.subtitle, 140), { x: 0.8, y: 3.3, w: 7.2, h: 0.8, fontFace: PPT_FONT, fontSize: 16, color: t.muted, valign: 'top', fit: 'shrink', margin: 0 });
  first.addShape(pptx.ShapeType.rect, { x: 0.8, y: 4.3, w: 0.9, h: 0.06, fill: { color: t.accent }, line: { color: t.accent } });
  if (pptOpts.author) first.addText(pptOpts.author, { x: 0.8, y: 4.55, w: 6, h: 0.35, fontFace: PPT_FONT, fontSize: 12, color: t.muted, margin: 0 });

  // Content slides
  slides.forEach((slide, i) => {
    const s = pptx.addSlide();
    s.background = { color: t.bg };
    if (str(slide.kicker, 40)) s.addText(str(slide.kicker, 40).toUpperCase(), { x: 0.5, y: 0.3, w: 9, h: 0.3, fontFace: PPT_FONT, fontSize: 11, bold: true, color: t.accent, charSpacing: 3, margin: 0 });
    s.addText(str(slide.heading, 80), { x: 0.5, y: 0.6, w: 9, h: 0.75, fontFace: PPT_FONT, fontSize: 28, bold: true, color: t.text, valign: 'middle', fit: 'shrink', margin: 0 });

    const layout = String(slide.layout || 'bullets').toLowerCase();
    const drawn = (layout === 'stat' && layoutStat(pptx, s, t, slide))
      || (layout === 'stats' && layoutStats(pptx, s, t, slide))
      || (layout === 'cards' && layoutCards(pptx, s, t, slide, false))
      || (layout === 'steps' && layoutCards(pptx, s, t, slide, true))
      || (layout === 'table' && layoutTable(pptx, s, t, slide));
    if (!drawn) {
      layoutBullets(pptx, s, t, slide, found[i].data ? found[i] : null, charts[i]);
    }

    s.addText(String(i + 1), { x: 9.1, y: 5.2, w: 0.5, h: 0.3, fontFace: PPT_FONT, fontSize: 10, color: t.muted, align: 'right', margin: 0 });
    if (typeof slide.notes === 'string' && slide.notes.trim()) s.addNotes(slide.notes.slice(0, 1000));
  });

  // Closing slide
  const c = data.closing && typeof data.closing === 'object' ? data.closing : {};
  const last = pptx.addSlide();
  last.background = { color: t.bg };
  last.addText(str(c.title, 70) || 'Thank you', { x: 0.7, y: 1.8, w: 8.6, h: 1.1, fontFace: PPT_FONT, fontSize: 36, bold: true, color: t.text, align: 'center', valign: 'middle', fit: 'shrink' });
  last.addText(str(c.subtitle, 100) || 'Questions are welcome.', { x: 1, y: 3, w: 8, h: 0.6, fontFace: PPT_FONT, fontSize: 16, color: t.muted, align: 'center', valign: 'top', fit: 'shrink' });
  last.addShape(pptx.ShapeType.rect, { x: 4.55, y: 3.85, w: 0.9, h: 0.06, fill: { color: t.accent }, line: { color: t.accent } });

  // Picture credits (Wikipedia pictures need to be credited)
  const used = found.filter((f) => f.data);
  for (let k = 0; k < used.length; k += 6) {
    const cs = pptx.addSlide();
    cs.background = { color: t.bg };
    cs.addText('Image sources', { x: 0.5, y: 0.35, w: 9, h: 0.6, fontFace: PPT_FONT, fontSize: 24, bold: true, color: t.text, margin: 0 });
    used.slice(k, k + 6).forEach((f, i) => {
      const y = 1.15 + i * 0.67, url = 'https://en.wikipedia.org/wiki/' + encodeURIComponent(f.page.replace(/ /g, '_'));
      cs.addImage({ data: f.data, x: 0.5, y, w: 0.95, h: 0.55, sizing: { type: 'contain', w: 0.95, h: 0.55 } });
      cs.addText([
        { text: f.page, options: { bold: true, fontSize: 13, color: t.text, breakLine: true } },
        { text: url, options: { fontSize: 10, color: t.accent, hyperlink: { url } } },
      ], { x: 1.65, y, w: 7.85, h: 0.55, fontFace: PPT_FONT, valign: 'middle', fit: 'shrink', margin: 0 });
    });
    cs.addText('Pictures from Wikipedia and Wikimedia Commons. Each article lists the licence and author of its pictures.', { x: 0.5, y: 5.15, w: 8.5, h: 0.3, fontFace: PPT_FONT, fontSize: 10, color: t.muted, margin: 0 });
  }

  await pptx.writeFile({ fileName: data.title.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') + '.pptx' });
  return result;
}