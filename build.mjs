import fs from "fs";

// Read data and template
const data = JSON.parse(fs.readFileSync("data.json", "utf-8"));
let html = fs.readFileSync("template.html", "utf-8");

// Helper: escape HTML
const esc = s => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

// Replace date and issue
html = html.replace(/<!--DATE-->/g, data.dateRange || "This Week");
html = html.replace(/<!--ISSUE-->/g, data.issue || "01");

// Editorial hook (playbooks landing)
const editorialHook = data.editorialHook || "";
if (editorialHook) {
  html = html.replace("<!--EDITORIAL_HOOK-->", `<p style="font-family: 'Instrument Serif', serif; font-size: clamp(1.3rem, 3.5vw, 1.6rem); color: #444; line-height: 1.6; text-align: center; margin-bottom: 2.5rem; font-style: italic;">${esc(editorialHook)}</p>`);
} else {
  html = html.replace("<!--EDITORIAL_HOOK-->", "");
}

// Build hero + picks
const picks = data.picks || [];
const hero = picks.find(p => p.hero) || picks[0];
const rest = picks.filter(p => p !== hero);

let heroHtml = "";
if (hero) {
  heroHtml = `<div class="highlight-card card" data-cats="${esc(hero.cats)}" data-price="${esc(hero.price)}">
    <div class="card-top"><h3>${esc(hero.t)}</h3><div class="card-when">${esc(hero.w)}</div></div>
    <p>${esc(hero.d)}</p>
    <div class="tags">${(hero.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join("")}${hero.badge?`<span class="price-badge">${esc(hero.badge)}</span>`:""}</div>
  </div>`;
}
html = html.replace("<!--HERO-->", heroHtml);

// Sammy's Pick on landing page (editorial card with image)
let sammysPickHtml = "";
if (hero) {
  const imgUrl = hero.img || "";
  if (imgUrl) {
    // Split layout: image left, text right
    sammysPickHtml = `<div class="pick-editorial">
      <div class="pick-editorial-img" style="background-image:url('${esc(imgUrl)}')"></div>
      <div class="pick-editorial-body">
        <div class="pick-editorial-label">Sammy's Event Pick of the Week</div>
        <h3>${esc(hero.t)}</h3>
        <div class="card-when">${esc(hero.w)}</div>
        <p>${esc(hero.d)}</p>
        <div class="tags">${(hero.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join("")}${hero.badge?`<span class="price-badge">${esc(hero.badge)}</span>`:""}</div>
      </div>
    </div>`;
  } else {
    // Full-width centered layout when no image available
    sammysPickHtml = `<div class="pick-editorial pick-editorial-full">
      <div class="pick-editorial-body">
        <div class="pick-editorial-label">Sammy's Event Pick of the Week</div>
        <h3>${esc(hero.t)}</h3>
        <div class="card-when">${esc(hero.w)}</div>
        <p>${esc(hero.d)}</p>
        <div class="tags">${(hero.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join("")}${hero.badge?`<span class="price-badge">${esc(hero.badge)}</span>`:""}</div>
      </div>
    </div>`;
  }
}
html = html.replace("<!--SAMMYS_PICK-->", sammysPickHtml);

// Panel featured items - rich previews
const panelFeatHtml = {};

// Playbooks
const featPlay = (data.playbooks?.date || [])[0];
if (featPlay) {
  const playSteps = (featPlay.steps||[]).length;
  const playMeta = `${playSteps} stops · ${esc(featPlay.est)}`;
  panelFeatHtml.playbooks = `<div class="panel-featured">
    <div class="panel-feat-name">${esc(featPlay.title)}</div>
    <div class="panel-feat-detail">${esc(featPlay.badge)}</div>
    <div class="panel-feat-meta">${playMeta}</div>
  </div>`;
}

// Eats
const featEat = (data.eats?.new || [])[0];
if (featEat) {
  panelFeatHtml.eats = `<div class="panel-featured">
    <div class="panel-feat-name">${esc(featEat.name)}</div>
    <div class="panel-feat-detail">${esc(featEat.type)}</div>
    <div class="panel-feat-meta">${esc(featEat.price)}</div>
  </div>`;
}

// Concerts
const featConcert = (data.concerts || [])[0];
if (featConcert) {
  const concertWhen = (featConcert.w || '').split(' · ')[0];
  panelFeatHtml.concerts = `<div class="panel-featured">
    <div class="panel-feat-name">${esc(featConcert.t)}</div>
    <div class="panel-feat-detail">${esc(featConcert.venue)}</div>
    <div class="panel-feat-meta">${esc(concertWhen)}</div>
  </div>`;
}

// Sports
const featGame = (data.sports || []).find(s => s.games?.length)?.games?.[0];
if (featGame) {
  const gameWhen = (featGame.when || '').replace(/\\n/g, ' · ');
  panelFeatHtml.sports = `<div class="panel-featured">
    <div class="panel-feat-name">${esc(featGame.teams)}</div>
    <div class="panel-feat-detail">${esc(gameWhen)}</div>
    <div class="panel-feat-meta">${esc(featGame.price)}</div>
  </div>`;
}

// Singles
const featSingle = (data.singles || [])[0];
if (featSingle) {
  const singleName = featSingle.t?.split(' - ')[0] || featSingle.t;
  panelFeatHtml.singles = `<div class="panel-featured">
    <div class="panel-feat-name">${esc(singleName)}</div>
    <div class="panel-feat-detail">${esc(featSingle.w)}</div>
    <div class="panel-feat-meta">${(featSingle.tags||[]).slice(0,2).map(t=>esc(t)).join(' · ')}</div>
  </div>`;
}

Object.entries(panelFeatHtml).forEach(([key, val]) => {
  html = html.replace(`<!--PANEL_FEAT_${key.toUpperCase()}-->`, val);
});
// Clean up any unreplaced placeholders
html = html.replace(/<!--PANEL_FEAT_\w+-->/g, '');

let picksHtml = rest.map(p => `<div class="card" data-cats="${esc(p.cats)}" data-price="${esc(p.price)}">
    <div class="card-top"><h3>${esc(p.t)}</h3><div class="card-when">${esc(p.w)}</div></div>
    <p>${esc(p.d)}</p>
    <div class="tags">${(p.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join("")}${p.badge?`<span class="price-badge">${esc(p.badge)}</span>`:""}</div>
  </div>`).join("\n\n  ");
html = html.replace("<!--PICKS-->", picksHtml);

// Ongoing
let ongoingHtml = (data.ongoing||[]).map(o=>`<div class="ongoing"><h4>${esc(o.t)}</h4><p>${esc(o.d)}</p></div>`).join("\n  ");
html = html.replace("<!--ONGOING-->", ongoingHtml);

// Eats
let eatsNewHtml = (data.eats?.new||[]).map(e=>`<div class="mini-card"><div class="mini-type">${esc(e.type)}</div><h4>${esc(e.name)}</h4><p>${esc(e.d)}</p><div class="mini-price">${esc(e.price)}</div></div>`).join("\n    ");
html = html.replace("<!--EATS_NEW-->", eatsNewHtml);

let eatsClassicHtml = (data.eats?.classic||[]).map(e=>`<div class="mini-card"><div class="mini-type">${esc(e.type)}</div><h4>${esc(e.name)}</h4><p>${esc(e.d)}</p><div class="mini-price">${esc(e.price)}</div></div>`).join("\n    ");
html = html.replace("<!--EATS_CLASSIC-->", eatsClassicHtml);

let barsHtml = (data.bars||[]).map(b=>`<div class="mini-card"><div class="mini-type">${esc(b.type)}</div><h4>${esc(b.name)}</h4><p>${esc(b.d)}</p><div class="mini-price">${esc(b.price)}</div></div>`).join("\n    ");
html = html.replace("<!--BARS-->", barsHtml);

// Sports
let sportsHtml = (data.sports||[]).map(s => {
  let games = (s.games||[]).map(g=>`<div class="sport-row"><div class="sr-teams"><h4>${esc(g.teams)}</h4><p>${esc(g.detail)}</p></div><div class="sr-when">${(g.when||"").replace(/\\n/g,"<br>")}</div><div class="sr-price">${esc(g.price)}</div></div>`).join("\n  ");
  return `<div class="section-label">${esc(s.section)}</div>\n  ${games}\n  ${s.note?`<p class="sport-note">${esc(s.note)}</p>`:""}`;
}).join("\n\n  ");
html = html.replace("<!--SPORTS-->", sportsHtml);

// Concerts
let concertsHtml = (data.concerts||[]).map(c => {
  let cls = c.hi ? "highlight-card card" : "card";
  return `<div class="${cls}">
    <div class="card-top"><h3>${esc(c.t)}</h3><div class="card-when">${esc(c.w)}</div></div>
    <p>${esc(c.d)}</p>
    <div class="tags">${(c.tags||[]).map(t=>`<span class="tag tag-music">${esc(t)}</span>`).join("")}<span class="price-badge">${esc(c.venue)}</span></div>
  </div>`;
}).join("\n\n  ");
html = html.replace("<!--CONCERTS-->", concertsHtml);

let concertsOngHtml = (data.concertsOngoing||[]).map(o=>`<div class="ongoing"><h4>${esc(o.t)}</h4><p>${esc(o.d)}</p></div>`).join("\n  ");
html = html.replace("<!--CONCERTS_ONGOING-->", concertsOngHtml);

// Singles
let singlesHtml = (data.singles||[]).map(s=>`<div class="card">
    <div class="card-top"><h3>${esc(s.t)}</h3><div class="card-when">${esc(s.w)}</div></div>
    <p>${esc(s.d)}</p>
    ${s.link?`<a class="card-link" href="${esc(s.link)}" target="_blank">${esc(s.linkText||"Learn more")}</a>`:""}
    <div class="tags">${(s.tags||[]).map(t=>`<span class="tag tag-nightlife">${esc(t)}</span>`).join("")}<span class="price-badge">${esc(s.badge)}</span></div>
  </div>`).join("\n\n  ");
html = html.replace("<!--SINGLES-->", singlesHtml);

let singlesOngHtml = (data.singlesOngoing||[]).map(o=>`<div class="ongoing"><h4>${esc(o.t)}</h4><p>${esc(o.d)}</p></div>`).join("\n  ");
html = html.replace("<!--SINGLES_ONGOING-->", singlesOngHtml);

// Playbooks
function buildPlans(plans) {
  return (plans||[]).map(p => {
    let tc = p.tier==="free"?"dn-tier-free":p.tier==="$$"?"dn-tier-mid":"dn-tier-splurge";
    let steps = (p.steps||[]).map((s,i)=>`<li class="dn-step" data-step="${i+1}"><div><div class="dn-step-time">${esc(s.time)}</div><div class="dn-step-title">${esc(s.title)}</div><div class="dn-step-detail">${esc(s.detail)}</div></div></li>`).join("\n          ");
    return `<div class="dn-card ${tc}">
      <div class="dn-tier"><span class="dn-tier-badge">${esc(p.badge)}</span><span class="dn-tier-est">${esc(p.est)}</span></div>
      <div class="dn-body"><h3>${esc(p.title)}</h3><p class="dn-tagline">${esc(p.tagline)}</p><ul class="dn-steps">${steps}</ul></div>
    </div>`;
  }).join("\n\n    ");
}

const pb = data.playbooks || {};
html = html.replace("<!--PB_DATE-->", buildPlans(pb.date));
html = html.replace("<!--PB_SOLO-->", buildPlans(pb.solo));
html = html.replace("<!--PB_BDAY-->", buildPlans(pb.birthday));
html = html.replace("<!--PB_FRIENDS-->", buildPlans(pb.friends));
html = html.replace("<!--PB_PARENTS-->", buildPlans(pb.parents));

fs.writeFileSync("index.html", html);
console.log(`✅ Built index.html (${(Buffer.byteLength(html)/1024).toFixed(1)} KB)`);
