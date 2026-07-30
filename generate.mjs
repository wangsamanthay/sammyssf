import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";

const client = new Anthropic();

// Get current date info
const now = new Date();
const weekStart = new Date(now);
weekStart.setDate(now.getDate() - now.getDay() + 5);
const weekEnd = new Date(weekStart);
weekEnd.setDate(weekStart.getDate() + 6);

const fmt = (d) => d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
const dateRange = `${fmt(weekStart)} – ${fmt(weekEnd)}, ${weekEnd.getFullYear()}`;
const issueNum = Math.ceil((now - new Date("2026-07-25")) / (7 * 24 * 60 * 60 * 1000)) + 1;
const issueStr = String(issueNum).padStart(2, "0");

console.log(`\n🎯 Generating Sammy's SF — ${dateRange} (Issue #${issueStr})\n`);

// Read the template
const template = fs.readFileSync("template.html", "utf-8");

// Step 1: Research events
console.log("🔍 Searching for SF events...\n");

const researchResponse = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 4000,
  tools: [{ type: "web_search_20250305", name: "web_search" }],
  messages: [{
    role: "user",
    content: `Search for things to do in San Francisco for the week of ${dateRange}. I need:
1. Concerts and live music (SeatGeek SF, Stern Grove, Fillmore, The Independent, Chase Center, Davies Symphony Hall, Greek Theatre Berkeley)
2. New restaurant and bar openings (site:sf.eater.com, site:sfchronicle.com)
3. Outdoor events, festivals, pop-ups, flea markets
4. Art exhibitions, theater, comedy, film screenings, book readings
5. Sports (Giants schedule, Valkyries, Oakland Ballers)
6. Singles events and social sports (Eventbrite SF singles, Thursday app)
7. Notable free events
8. Nightlife, DJ events, day parties

Do at least 10 searches to be thorough. For each event include: name, venue, date/time, price range, and a brief description.`
  }]
});

const researchText = researchResponse.content.filter(b => b.type === "text").map(b => b.text).join("\n");
console.log("📝 Research complete. Generating content...\n");

// Step 2: Generate ONLY the content sections as JSON
const generateResponse = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 12000,
  messages: [{
    role: "user",
    content: `You are generating content for "Sammy's SF" — a fun weekly guide to SF. Based on the research below, generate content in JSON format.

RESEARCH:
${researchText}

Return ONLY a valid JSON object (no markdown fences, no explanation) with these keys:

{
  "dateRange": "${dateRange}",
  "issueNum": "${issueStr}",
  "heroTitle": "Best event of the week",
  "heroWhen": "Day Date · Time",
  "heroDesc": "2-3 sentence description, fun and friend-to-friend voice",
  "heroCats": "music",
  "heroPrice": "free",
  "heroPriceBadge": "Free",
  "heroTags": [{"label": "Free"}, {"label": "Music"}],
  "picks": [
    {
      "title": "Event name",
      "when": "Day Date · Time",
      "desc": "1-2 sentences, fun voice",
      "cats": "music,nightlife",
      "price": "$$",
      "priceBadge": "$$ · ~$40",
      "tags": [{"label": "Concert", "type": "music"}]
    }
  ],
  "picksOngoing": [
    {"title": "Name", "desc": "One line description"}
  ],
  "eatsNew": [
    {"type": "Cuisine · Neighborhood", "name": "Restaurant", "desc": "One line", "price": "$$ · $25-50/pp"}
  ],
  "eatsClassic": [
    {"type": "Cuisine · Neighborhood", "name": "Restaurant", "desc": "One line", "price": "$$ · $25-50/pp"}
  ],
  "bars": [
    {"type": "Style · Neighborhood", "name": "Bar", "desc": "One line", "price": "$ · $12/drink"}
  ],
  "sports": [
    {"section": "⚾ Giants · Oracle Park", "games": [{"teams": "Giants vs. Team", "detail": "Game info", "when": "Day Date\\nTime", "price": "From $25"}], "note": "Optional note"}
  ],
  "concerts": [
    {"title": "Artist", "when": "Day Date · Time", "desc": "2-3 sentences", "venue": "Venue · Price info", "tags": [{"label": "Genre"}], "isHighlight": false}
  ],
  "concertsOngoing": [
    {"title": "Name", "desc": "One line description"}
  ],
  "singles": [
    {"title": "Event", "when": "Day · Time", "desc": "2-3 sentences", "tags": [{"label": "Type"}], "priceBadge": "$$ · ~$30", "link": "https://...", "linkText": "Get tickets"}
  ],
  "singlesOngoing": [
    {"title": "Name", "desc": "One line description"}
  ],
  "dateNight": [
    {"tier": "free", "badge": "The Free One", "est": "$0 + food", "title": "Plan Name", "tagline": "One line italic tagline", "steps": [{"time": "6:00 PM", "title": "Step name", "detail": "What to do"}]}
  ],
  "soloDate": [
    {"tier": "free", "badge": "The Wander", "est": "Free + coffee", "title": "Plan Name", "tagline": "Tagline", "steps": [{"time": "10:00 AM", "title": "Step", "detail": "Detail"}]}
  ],
  "birthday": [
    {"tier": "free", "badge": "Low-Key Birthday", "est": "Free + dinner", "title": "Plan Name", "tagline": "Tagline", "steps": [{"time": "2:00 PM", "title": "Step", "detail": "Detail"}]}
  ],
  "friendsVisiting": [
    {"tier": "free", "badge": "The Classic SF Day", "est": "Free + food", "title": "Plan Name", "tagline": "Tagline", "steps": [{"time": "10:00 AM", "title": "Step", "detail": "Detail"}]}
  ],
  "parentsInTown": [
    {"tier": "free", "badge": "The Chill Day", "est": "Free + lunch", "title": "Plan Name", "tagline": "Tagline", "steps": [{"time": "10:00 AM", "title": "Step", "detail": "Detail"}]}
  ]
}

IMPORTANT RULES:
- Each array should have 8-12 picks, 3-6 eatsNew, 3-4 eatsClassic, 6-8 bars, 4-6 concerts, 3-4 singles events
- Each playbook occasion needs 3 plans: free/$$/$$$ tiers using THIS WEEK's actual events
- cats must be from: music, shows, museums, food, nightlife, active, sports (can combine with commas)
- price must be from: free, $, $$, $$$
- Voice: fun, warm, friend-to-friend. Like texting your group chat
- The hero should be the single most can't-miss event of the week
- Output ONLY the JSON, no other text`
  }]
});

let jsonText = generateResponse.content.filter(b => b.type === "text").map(b => b.text).join("\n");
jsonText = jsonText.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();

let data;
try {
  data = JSON.parse(jsonText);
} catch (e) {
  console.error("❌ Failed to parse JSON:", e.message);
  console.error("Raw output:", jsonText.substring(0, 500));
  process.exit(1);
}

console.log("✅ Content generated. Building HTML...\n");

// Step 3: Inject content into template
let html = template;

// Replace date and issue
html = html.replace(/<!--DATE_RANGE-->/g, data.dateRange || dateRange);
html = html.replace(/<!--ISSUE_NUM-->/g, data.issueNum || issueStr);

// Build hero card
const heroHtml = `
  <div class="highlight-card card" data-cats="${data.heroCats}" data-price="${data.heroPrice}">
    <div class="card-top">
      <h3>${data.heroTitle}</h3>
      <div class="card-when">${data.heroWhen}</div>
    </div>
    <p>${data.heroDesc}</p>
    <div class="tags">
      ${(data.heroTags || []).map(t => `<span class="tag">${t.label}</span>`).join("\n      ")}
      ${data.heroPriceBadge ? `<span class="price-badge">${data.heroPriceBadge}</span>` : ""}
    </div>
  </div>`;
html = html.replace("<!--HERO_CARD-->", heroHtml);

// Build picks
const picksHtml = (data.picks || []).map(p => `
  <div class="card" data-cats="${p.cats}" data-price="${p.price}">
    <div class="card-top">
      <h3>${p.title}</h3>
      <div class="card-when">${p.when}</div>
    </div>
    <p>${p.desc}</p>
    <div class="tags">
      ${(p.tags || []).map(t => `<span class="tag tag-${t.type || ''}">${t.label}</span>`).join("\n      ")}
      ${p.priceBadge ? `<span class="price-badge">${p.priceBadge}</span>` : ""}
    </div>
  </div>`).join("\n");
html = html.replace("<!--PICKS_CARDS-->", picksHtml);

// Build ongoing
const ongoingHtml = (data.picksOngoing || []).map(o =>
  `<div class="ongoing"><h4>${o.title}</h4><p>${o.desc}</p></div>`
).join("\n  ");
html = html.replace("<!--PICKS_ONGOING-->", ongoingHtml);

// Build eats
const eatsNewHtml = (data.eatsNew || []).map(e =>
  `<div class="mini-card"><div class="mini-type">${e.type}</div><h4>${e.name}</h4><p>${e.desc}</p><div class="mini-price">${e.price}</div></div>`
).join("\n    ");
html = html.replace("<!--EATS_NEW-->", eatsNewHtml);

const eatsClassicHtml = (data.eatsClassic || []).map(e =>
  `<div class="mini-card"><div class="mini-type">${e.type}</div><h4>${e.name}</h4><p>${e.desc}</p><div class="mini-price">${e.price}</div></div>`
).join("\n    ");
html = html.replace("<!--EATS_CLASSIC-->", eatsClassicHtml);

const barsHtml = (data.bars || []).map(b =>
  `<div class="mini-card"><div class="mini-type">${b.type}</div><h4>${b.name}</h4><p>${b.desc}</p><div class="mini-price">${b.price}</div></div>`
).join("\n    ");
html = html.replace("<!--BARS-->", barsHtml);

// Build sports
const sportsHtml = (data.sports || []).map(s => {
  const games = (s.games || []).map(g =>
    `<div class="sport-row"><div class="sr-teams"><h4>${g.teams}</h4><p>${g.detail}</p></div><div class="sr-when">${g.when.replace(/\\n/g, "<br>")}</div><div class="sr-price">${g.price}</div></div>`
  ).join("\n  ");
  return `<div class="section-label">${s.section}</div>\n  ${games}\n  ${s.note ? `<p class="sport-note">${s.note}</p>` : ""}`;
}).join("\n\n  ");
html = html.replace("<!--SPORTS-->", sportsHtml);

// Build concerts
const concertsHtml = (data.concerts || []).map(c => {
  if (c.isHighlight) {
    return `<div class="highlight-card card">
    <div class="card-top"><h3>${c.title}</h3><div class="card-when">${c.when}</div></div>
    <p>${c.desc}</p>
    <div class="tags">${(c.tags || []).map(t => `<span class="tag">${t.label}</span>`).join("")}<span class="price-badge">${c.venue}</span></div>
  </div>`;
  }
  return `<div class="card">
    <div class="card-top"><h3>${c.title}</h3><div class="card-when">${c.when}</div></div>
    <p>${c.desc}</p>
    <div class="tags">${(c.tags || []).map(t => `<span class="tag tag-music">${t.label}</span>`).join("")}<span class="price-badge">${c.venue}</span></div>
  </div>`;
}).join("\n\n  ");
html = html.replace("<!--CONCERTS-->", concertsHtml);

const concertsOngoingHtml = (data.concertsOngoing || []).map(o =>
  `<div class="ongoing"><h4>${o.title}</h4><p>${o.desc}</p></div>`
).join("\n  ");
html = html.replace("<!--CONCERTS_ONGOING-->", concertsOngoingHtml);

// Build singles
const singlesHtml = (data.singles || []).map(s => `
  <div class="card">
    <div class="card-top"><h3>${s.title}</h3><div class="card-when">${s.when}</div></div>
    <p>${s.desc}</p>
    ${s.link ? `<a class="card-link" href="${s.link}" target="_blank">${s.linkText || 'Learn more'}</a>` : ""}
    <div class="tags">${(s.tags || []).map(t => `<span class="tag tag-nightlife">${t.label}</span>`).join("")}<span class="price-badge">${s.priceBadge}</span></div>
  </div>`).join("\n");
html = html.replace("<!--SINGLES_EVENTS-->", singlesHtml);

const singlesOngoingHtml = (data.singlesOngoing || []).map(o =>
  `<div class="ongoing"><h4>${o.title}</h4><p>${o.desc}</p></div>`
).join("\n  ");
html = html.replace("<!--SINGLES_ONGOING-->", singlesOngoingHtml);

// Build playbooks
function buildOccasion(plans) {
  return (plans || []).map(p => {
    const tierClass = p.tier === "free" ? "dn-tier-free" : p.tier === "$$" ? "dn-tier-mid" : "dn-tier-splurge";
    const steps = (p.steps || []).map((s, i) =>
      `<li class="dn-step" data-step="${i + 1}"><div><div class="dn-step-time">${s.time}</div><div class="dn-step-title">${s.title}</div><div class="dn-step-detail">${s.detail}</div></div></li>`
    ).join("\n          ");
    return `<div class="dn-card ${tierClass}">
      <div class="dn-tier"><span class="dn-tier-badge">${p.badge}</span><span class="dn-tier-est">${p.est}</span></div>
      <div class="dn-body">
        <h3>${p.title}</h3>
        <p class="dn-tagline">${p.tagline}</p>
        <ul class="dn-steps">${steps}</ul>
      </div>
    </div>`;
  }).join("\n\n    ");
}

html = html.replace("<!--PLAYBOOK_DATE-->", buildOccasion(data.dateNight));
html = html.replace("<!--PLAYBOOK_SOLO-->", buildOccasion(data.soloDate));
html = html.replace("<!--PLAYBOOK_BIRTHDAY-->", buildOccasion(data.birthday));
html = html.replace("<!--PLAYBOOK_FRIENDS-->", buildOccasion(data.friendsVisiting));
html = html.replace("<!--PLAYBOOK_PARENTS-->", buildOccasion(data.parentsInTown));

// Write output
fs.writeFileSync("index.html", html);
console.log(`✅ Generated index.html for ${dateRange}`);
console.log(`📊 Issue #${issueStr}`);
console.log(`📦 File size: ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB\n`);

// Step 4: Newsletter (optional)
const buttondownKey = process.env.BUTTONDOWN_API_KEY;
if (buttondownKey) {
  console.log("📧 Sending newsletter...\n");
  const emailResponse = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `Convert this event data into a short, fun email newsletter from "your bff Sammy." Include a quick intro, top 5-6 picks, the splurge date night pick, and a link to sammyssf-1.vercel.app. Use simple HTML (h2, p, ul/li, bold). Keep it scannable.\n\nData: ${JSON.stringify(data).substring(0, 4000)}\n\nOutput ONLY the email HTML body.`
    }]
  });
  const emailBody = emailResponse.content.filter(b => b.type === "text").map(b => b.text).join("\n").replace(/^```html?\n?/, "").replace(/\n?```$/, "").trim();
  const emailRes = await fetch("https://api.buttondown.com/v1/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Token ${buttondownKey}` },
    body: JSON.stringify({ subject: `Sammy's SF — ${dateRange}`, body: emailBody, status: "about_to_send" })
  });
  console.log(emailRes.ok ? "✅ Newsletter sent!\n" : `❌ Newsletter failed: ${await emailRes.text()}\n`);
} else {
  console.log("⏭️  No BUTTONDOWN_API_KEY set, skipping newsletter.\n");
}
