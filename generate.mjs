import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";

const client = new Anthropic();

const now = new Date();
const weekStart = new Date(now);
weekStart.setDate(now.getDate() - now.getDay() + 5);
const weekEnd = new Date(weekStart);
weekEnd.setDate(weekStart.getDate() + 6);
const fmt = (d) => d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
const dateRange = `${fmt(weekStart)} – ${fmt(weekEnd)}, ${weekEnd.getFullYear()}`;
const issueNum = Math.ceil((now - new Date("2026-07-25")) / (7 * 24 * 60 * 60 * 1000)) + 1;

console.log(`\n🎯 Generating data for Sammy's SF — ${dateRange} (Issue #${issueNum})\n`);

// SPLIT INTO 4 FOCUSED RESEARCH CALLS
async function searchBatch(label, prompt) {
  console.log(`🔍 ${label}...`);
  const r = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: prompt }]
  });
  const text = r.content.filter(b => b.type === "text").map(b => b.text).join("\n");
  console.log(`  ✅ Got ${text.length} chars\n`);
  return text;
}

const r1 = await searchBatch("Concerts & music",
  `Search for San Francisco concerts and live music for the week of ${dateRange}. Do 4-5 searches:
  - General SF concerts this week
  - Stern Grove concert schedule
  - Fillmore, Independent, Warfield, Great American Music Hall shows
  - Chase Center and Davies Symphony Hall events
  - Greek Theatre Berkeley
  For each: name, venue, date/time, price, 2-sentence description.`);

const r2 = await searchBatch("Food, bars & events",
  `Search for San Francisco food, restaurants, bars, and events for the week of ${dateRange}. Do 4-5 searches:
  - site:sf.eater.com new restaurant openings
  - site:theinfatuation.com san-francisco restaurants
  - site:dothebay.com events this week
  - SF festivals pop-ups markets this week
  - San Francisco free events this week
  For each: name, location, date, price, 1-2 sentences.`);

const r3 = await searchBatch("Sports & arts",
  `Search for San Francisco sports and arts for the week of ${dateRange}. Do 4-5 searches:
  - SF Giants schedule this week (home games at Oracle Park)
  - Golden State Warriors or Valkyries schedule
  - SFMOMA, de Young, Asian Art Museum exhibitions
  - San Francisco comedy shows Cobb's Punch Line
  - San Francisco theater shows this week
  For each: name, venue, date/time, price, 1-2 sentences.`);

const r4 = await searchBatch("Singles & nightlife",
  `Search for San Francisco singles events and nightlife for the week of ${dateRange}. Do 4-5 searches:
  - site:eventbrite.com San Francisco singles mixer speed dating
  - San Francisco social sports leagues running clubs
  - site:ra.co San Francisco DJ events
  - San Francisco EDM events 19hz.info
  For each: name, venue, date/time, price, 1-2 sentences.`);

const allResearch = `CONCERTS & MUSIC:\n${r1}\n\nFOOD & EVENTS:\n${r2}\n\nSPORTS & ARTS:\n${r3}\n\nSINGLES & NIGHTLIFE:\n${r4}`;
console.log(`📝 Total research: ${allResearch.length} chars. Generating JSON...\n`);

// GENERATE JSON
const gen = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 14000,
  messages: [{
    role: "user",
    content: `Generate content for "Sammy's SF" weekly guide. Voice: fun, warm, friend-to-friend.

RESEARCH:
${allResearch}

Return ONLY valid JSON. No markdown fences. Structure:
{
  "dateRange": "${dateRange}",
  "issue": "${String(issueNum).padStart(2,'0')}",
  "picks": [
    {"t":"Event name","w":"Day Mon DD · Time","d":"2-3 fun sentences","cats":"music","price":"free","badge":"Free","tags":["Free","Music"],"hero":true,"score":11}
  ],
  "ongoing": [{"t":"Name","d":"One line"}],
  "eats": {
    "new": [{"type":"Cuisine · Hood","name":"Place","d":"One line","price":"$$ · $30/pp"}],
    "classic": [{"type":"Cuisine · Hood","name":"Place","d":"One line","price":"$$ · $30/pp"}]
  },
  "bars": [{"type":"Style · Hood","name":"Bar","d":"One line","price":"$ · $12/drink"}],
  "sports": [{"section":"⚾ Team · Venue","games":[{"teams":"vs Team","detail":"Info","when":"Day\\nTime","price":"$25"}],"note":"Optional"}],
  "concerts": [{"t":"Artist","w":"Day · Time","d":"2-3 sentences","venue":"Venue · Price","tags":["Genre"],"hi":false}],
  "concertsOngoing": [{"t":"Name","d":"One line"}],
  "singles": [{"t":"Event","w":"Day · Time","d":"2-3 sentences","tags":["Type"],"badge":"$$ · ~$30","link":"https://...","linkText":"Tickets"}],
  "singlesOngoing": [{"t":"Name","d":"One line"}],
  "playbooks": {
    "date": [{"tier":"free","badge":"The Free One","est":"$0","title":"Plan","tagline":"Line","steps":[{"time":"6pm","title":"Step","detail":"Detail"}]}],
    "solo": [same format, 3 plans],
    "birthday": [same format, 3 plans],
    "friends": [same format, 3 plans],
    "parents": [same format, 3 plans]
  }
}

RULES:
- picks: 10-14 items sorted by score. First item must have "hero":true
- SCORING: one-night-only=5, weekend=4, opening week=3, ongoing=0 | new opening=4, selling out=3, notable venue=2 | iconic location=2 | free=2, deal=1
- DIVERSITY: must include 1 music, 1 food, 1 free, 1 cultural, 1 outdoors
- eats.new: 4-6, eats.classic: 4-6, bars: 6-8, concerts: 6-10, singles: 4-6
- Each playbook: exactly 3 plans (free/$$/$$$ tiers), 3-5 steps each using THIS WEEK's events
- cats from: music,shows,food,nightlife,active,sports. price from: free,$,$$,$$$
- Use ONLY real events from the research. Never invent events.`
  }]
});

let raw = gen.content.filter(b => b.type === "text").map(b => b.text).join("\n")
  .replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();

let data;
try { data = JSON.parse(raw); }
catch(e) {
  console.error("❌ JSON parse failed:", e.message);
  try {
    raw = raw.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    data = JSON.parse(raw);
    console.log("✅ Fixed and parsed JSON");
  } catch(e2) {
    console.error("❌ Still failed. Keeping existing data.json");
    process.exit(1);
  }
}

// SAFETY CHECK: don't overwrite good data with empty content
const picks = data.picks || [];
if (picks.length < 3 || (picks[0] && picks[0].t && picks[0].t.includes("No research"))) {
  console.error("❌ Generated content looks empty or placeholder. Keeping existing data.json");
  process.exit(1);
}

fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
console.log(`✅ data.json written (${(Buffer.byteLength(JSON.stringify(data)) / 1024).toFixed(1)} KB)`);
console.log(`📊 ${picks.length} picks, Issue #${issueNum}\n`);

// Newsletter (only if key exists)
const bk = process.env.BUTTONDOWN_API_KEY;
if (bk) {
  console.log("📧 Sending newsletter...\n");
  const nr = await client.messages.create({
    model: "claude-sonnet-4-6", max_tokens: 3000,
    messages: [{ role: "user", content: `Generate an email newsletter for "Sammy's SF" using this event data. Output ONLY the HTML body — no markdown fences.

Use this structure:
<div style="max-width:520px;margin:0 auto;font-family:Arial,sans-serif;">
  <div style="background:linear-gradient(135deg,#C4724A 0%,#B85A6A 50%,#5A7A9A 100%);padding:28px 24px;text-align:center;border-radius:12px 12px 0 0;">
    <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.7);">WEEKLY PICKS FROM YOUR BFF SAMMY</div>
    <div style="font-size:28px;color:#fff;font-family:Georgia,serif;">Sammy's <em>SF</em></div>
    <div style="font-size:13px;color:rgba(255,255,255,0.5);">${dateRange}</div>
  </div>
  <div style="background:#fff;padding:24px;border:1px solid #eee;border-radius:0 0 12px 12px;">
    Brief fun intro, top 5-6 picks with prices, one date night plan, link to sammyssf-1.vercel.app, sign-off.
  </div>
</div>

Data: ${JSON.stringify(data).substring(0,4000)}` }]
  });
  const body = nr.content.filter(b=>b.type==="text").map(b=>b.text).join("\n").replace(/^```html?\n?/,"").replace(/\n?```$/,"").trim();
  const r = await fetch("https://api.buttondown.com/v1/emails", {
    method:"POST",
    headers:{"Content-Type":"application/json",Authorization:`Token ${bk}`,"X-Buttondown-Live-Dangerously":"true"},
    body: JSON.stringify({subject:`Sammy's SF — ${dateRange}`,body,status:"about_to_send"})
  });
  if (r.ok) { console.log("✅ Newsletter sent!\n"); }
  else { const errText = await r.text(); console.log("❌ Newsletter failed:", r.status, errText); }
} else console.log("⏭️  No BUTTONDOWN_API_KEY\n");
