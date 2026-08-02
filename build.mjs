import fs from "fs";

// Read data and template
const data = JSON.parse(fs.readFileSync("data.json", "utf-8"));
let html = fs.readFileSync("template.html", "utf-8");

// Helper: escape HTML
const esc = s => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

// Replace date and issue
html = html.replace(/<!--DATE-->/g, data.dateRange || "This Week");
html = html.replace(/<!--ISSUE-->/g, data.issue || "01");

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
