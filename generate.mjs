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
console.log("🔍 Searching for SF events...\n");

const research = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 5000,
  tools: [{ type: "web_search_20250305", name: "web_search" }],
  messages: [{
    role: "user",
    content: `Search for things to do in San Francisco for the week of ${dateRange}. Do at least 12 searches:
1. Concerts (SeatGeek SF, Stern Grove, Fillmore, Independent, Chase Center, Davies Hall, Greek Theatre Berkeley)
2. New restaurants and bars (site:sf.eater.com, site:sfchronicle.com)
3. Outdoor events, festivals, pop-ups, flea markets, farmers markets
4. Museums, art exhibitions, theater, comedy, film, book readings
5. Sports (SF Giants schedule, Golden State Valkyries WNBA, Oakland Ballers)
6. Singles events, speed dating, mixers (Eventbrite SF singles)
7. Nightlife, DJ events, day parties
8. Free events SF this week
For each event: name, venue, date/time, price, 2-sentence description.`
  }]
});

const researchText = research.content.filter(b => b.type === "text").map(b => b.text).join("\n");
console.log("📝 Research done. Generating JSON...\n");

const gen = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 14000,
  messages: [{
    role: "user",
    content: `Generate content for "Sammy's SF" weekly guide. Voice: fun, warm, friend-to-friend — like texting your group chat what to do this week.

RESEARCH:
${researchText}

Return ONLY valid JSON. No markdown fences. Structure:
{
  "dateRange": "${dateRange}",
  "issue": "${String(issueNum).padStart(2,'0')}",
  "picks": [
    {"t":"Event name","w":"Day Mon DD · Time","d":"2-3 fun sentences","cats":"music","price":"free","badge":"Free","tags":["Free","Music"],"hero":true}
  ],
  "ongoing": [{"t":"Name","d":"One line"}],
  "eats": {
    "new": [{"type":"Cuisine · Hood","name":"Place","d":"One line","price":"$$ · $30/pp"}],
    "classic": [{"type":"Cuisine · Hood","name":"Place","d":"One line","price":"$$ · $30/pp"}]
  },
  "bars": [{"type":"Style · Hood","name":"Bar","d":"One line","price":"$ · $12/drink"}],
  "sports": [{"section":"⚾ Team · Venue","games":[{"teams":"Team vs Team","detail":"Info","when":"Day\\nTime","price":"$25"}],"note":"Optional"}],
  "concerts": [{"t":"Artist","w":"Day Mon DD · Time","d":"2-3 sentences","venue":"Venue · Price","tags":["Genre"],"hi":false}],
  "concertsOngoing": [{"t":"Name","d":"One line"}],
  "singles": [{"t":"Event","w":"Day · Time","d":"2-3 sentences","tags":["Type"],"badge":"$$ · ~$30","link":"https://...","linkText":"Get tickets"}],
  "singlesOngoing": [{"t":"Name","d":"One line"}],
  "playbooks": {
    "date": [{"tier":"free","badge":"The Free One","est":"$0","title":"Plan Name","tagline":"One line","steps":[{"time":"6pm","title":"Step","detail":"What to do"}]}],
    "solo": [{"tier":"free","badge":"The Wander","est":"Free","title":"Plan","tagline":"Line","steps":[]}],
    "birthday": [{"tier":"free","badge":"Low-Key","est":"Free","title":"Plan","tagline":"Line","steps":[]}],
    "friends": [{"tier":"free","badge":"Classic SF","est":"Free","title":"Plan","tagline":"Line","steps":[]}],
    "parents": [{"tier":"free","badge":"Chill Day","est":"Free","title":"Plan","tagline":"Line","steps":[]}]
  }
}

RULES:
- picks: 10-14 items. First item must have "hero":true. cats from: music,shows,food,nightlife,active,sports. price from: free,$,$$,$$$
- eats.new: 4-6 items. eats.classic: 4-6 items. bars: 6-8 items
- concerts: 6-10 items. One can have "hi":true for highlight
- singles: 4-6 events with links. singlesOngoing: 4-5 items
- Each playbook occasion: exactly 3 plans (free/$$/$$$ tiers), each with 3-5 steps using THIS WEEK's events
- Use real events from the research. Don't make things up.`
  }]
});

let raw = gen.content.filter(b => b.type === "text").map(b => b.text).join("\n")
  .replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();

let data;
try { data = JSON.parse(raw); }
catch(e) {
  console.error("❌ JSON parse failed:", e.message);
  console.error("First 300 chars:", raw.substring(0, 300));
  // Try to fix common issues
  try {
    raw = raw.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    data = JSON.parse(raw);
    console.log("✅ Fixed and parsed JSON");
  } catch(e2) {
    console.error("❌ Still failed:", e2.message);
    process.exit(1);
  }
}

fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
console.log(`✅ data.json written (${(Buffer.byteLength(JSON.stringify(data)) / 1024).toFixed(1)} KB)`);
console.log(`📊 Issue #${issueNum} — ${dateRange}\n`);

// Newsletter
const bk = process.env.BUTTONDOWN_API_KEY;
if (bk) {
  console.log("📧 Sending newsletter...\n");
  const nr = await client.messages.create({
    model: "claude-sonnet-4-6", max_tokens: 2000,
    messages: [{ role: "user", content: `Write a short fun email newsletter from "your bff Sammy" using this data. Top 5-6 picks, one date night idea, link to sammyssf-1.vercel.app. Simple HTML. Data: ${JSON.stringify(data).substring(0,4000)}\nOutput ONLY HTML body.` }]
  });
  const body = nr.content.filter(b=>b.type==="text").map(b=>b.text).join("\n").replace(/^```html?\n?/,"").replace(/\n?```$/,"").trim();
  const r = await fetch("https://api.buttondown.com/v1/emails", {
    method:"POST", headers:{"Content-Type":"application/json",Authorization:`Token ${bk}`},
    body: JSON.stringify({subject:`Sammy's SF — ${dateRange}`,body,status:"about_to_send"})
  });
  console.log(r.ok ? "✅ Newsletter sent!\n" : `❌ Newsletter failed\n`);
} else console.log("⏭️  No BUTTONDOWN_API_KEY\n");
