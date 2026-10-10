import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";

const client = new Anthropic();

const now = new Date();
const weekStart = new Date(now);
weekStart.setDate(now.getDate() - now.getDay() + 5);
const weekEnd = new Date(weekStart);
weekEnd.setDate(weekStart.getDate() + 6);
const fmt = (d) => d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
const dateRange = `${fmt(weekStart)} - ${fmt(weekEnd)}, ${weekEnd.getFullYear()}`;
const issueNum = Math.ceil((now - new Date("2026-07-25")) / (7 * 24 * 60 * 60 * 1000)) + 1;

console.log(`\n🔍 Scouting events for Sammy's SF - ${dateRange} (Issue #${issueNum})\n`);

// 4 FOCUSED RESEARCH CALLS
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
  - Fillmore, Independent, Warfield, Great American Music Hall, Bottom of the Hill, Rickshaw Stop, The Chapel, August Hall shows
  - Chase Center and Davies Symphony Hall events
  - Greek Theatre Berkeley
  For each: name, venue, date/time, price, 2-sentence description.`);

const r2 = await searchBatch("Food, bars & events",
  `Search for San Francisco food, restaurants, bars, and events for the week of ${dateRange}. Do 4-5 searches:
  - site:sf.eater.com new restaurant openings
  - site:theinfatuation.com san-francisco restaurants
  - site:sfchronicle.com new restaurant bar San Francisco
  - San Francisco newly opened restaurants Yelp Google Maps
  - site:dothebay.com events this week OR site:sf.funcheap.com free events OR site:lu.ma San Francisco events
  Also search for major San Francisco festivals and citywide events happening this week (Fleet Week, Outside Lands, Hardly Strictly Bluegrass, Bay to Breakers, Pride, Carnaval, Folsom, Litquake, etc.)
  For each: name, location, date, price, 1-2 sentences.`);

const r3 = await searchBatch("Sports & arts",
  `Search for San Francisco sports and arts for the week of ${dateRange}. Do 4-5 searches:
  - SF Giants schedule this week (home games at Oracle Park) + Golden State Warriors NBA + Golden State Valkyries WNBA + Oakland Ballers
  - SFMOMA, de Young, Asian Art Museum, Minnesota Street Project, Southern Exposure, Exploratorium After Dark exhibitions
  - San Francisco comedy shows Cobb's Comedy Club Punch Line Doc's Lab
  - San Francisco theater shows SF Playhouse ACT Club Fugazi + immersive art pop-up installations
  - City Lights Booksmith Green Apple book readings poetry this week
  For each: name, venue, date/time, price, 1-2 sentences.`);

const r4 = await searchBatch("Singles & nightlife",
  `Search for San Francisco singles events and nightlife for the week of ${dateRange}. Do 4-5 searches:
  - site:eventbrite.com San Francisco singles mixer speed dating
  - San Francisco social sports leagues running clubs meetups
  - site:ra.co San Francisco DJ events electronic music
  - San Francisco EDM events 19hz.info The Midway Public Works Audio SF 1015 Folsom Halcyon Temple Nightclub
  For each: name, venue, date/time, price, 1-2 sentences.`);

const allResearch = `CONCERTS & MUSIC:\n${r1}\n\nFOOD & EVENTS:\n${r2}\n\nSPORTS & ARTS:\n${r3}\n\nSINGLES & NIGHTLIFE:\n${r4}`;
console.log(`📝 Total research: ${allResearch.length} chars\n`);

// ASK CLAUDE TO PICK AND SCORE TOP 5
console.log("🏆 Scoring top 5 picks...\n");
const ranking = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 2000,
  messages: [{
    role: "user",
    content: `From this research about SF events for ${dateRange}, pick the TOP 5 events and score them.

SCORING:
- Scarcity (max 5): one-night-only=5, weekend=4, opening week=3, limited run=2, ongoing=0
- Buzz (max 4): new opening=4, selling out=3, notable venue=2, hidden gem=1
- Location (max 2): iconic venue=2, walkable=1
- Price (max 2): free=2, deal=1
- MAJOR FESTIVAL BONUS: If it's a major annual SF event (Fleet Week, Outside Lands, Hardly Strictly Bluegrass, Bay to Breakers, Pride, Carnaval, Chinese New Year Parade, Folsom Street Fair, etc.) add +3 points

Return ONLY valid JSON array, no markdown fences:
[
  {"rank": 1, "name": "Event Name", "score": 12, "oneLiner": "Short fun reason why this is amazing", "price": "Free or $XX", "when": "Day, Mon DD"},
  {"rank": 2, ...},
  {"rank": 3, ...},
  {"rank": 4, ...},
  {"rank": 5, ...}
]

Sort by score descending. Use ONLY real events from the research.

RESEARCH:
${allResearch}`
  }]
});

let rawTop5 = ranking.content.filter(b => b.type === "text").map(b => b.text).join("\n")
  .replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();

let top5;
try {
  top5 = JSON.parse(rawTop5);
  console.log("✅ Top 5 scored:\n");
  top5.forEach(e => console.log(`  ${e.rank}. ${e.name} (${e.score} pts) - ${e.oneLiner}`));
} catch(e) {
  console.error("❌ Failed to parse top 5:", e.message);
  // Fallback: just save research without top 5
  top5 = [];
}

// SAVE SCOUT DATA
const scoutData = {
  dateRange,
  issueNum,
  scoutedAt: new Date().toISOString(),
  top5,
  research: allResearch
};

fs.writeFileSync("scout.json", JSON.stringify(scoutData, null, 2));
console.log(`\n✅ scout.json written (${(Buffer.byteLength(JSON.stringify(scoutData)) / 1024).toFixed(1)} KB)`);

// FORMAT GITHUB ISSUE BODY (workflow will create the issue)
const issueBody = `## 🎯 Pick your hero for Issue #${issueNum}\n**${dateRange}**\n\nHere are your top 5 scored events. Reply with just a number (1-5) to pick your hero card.\n**If you don't reply by Tuesday 9am, #1 wins automatically.**\n\n---\n\n` +
  top5.map((e, i) =>
    `### ${i + 1}. ${e.name} (Score: ${e.score})\n${e.oneLiner}\n📅 ${e.when} | 💰 ${e.price}\n`
  ).join("\n") +
  `\n---\n*Reply with just a number: 1, 2, 3, 4, or 5*`;

fs.writeFileSync("scout-issue.md", issueBody);
console.log(`✅ scout-issue.md written\n`);
