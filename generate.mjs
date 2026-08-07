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
    content: `Search for things to do in San Francisco for the week of ${dateRange}. Do at least 18 searches across these categories and sources:

CONCERTS & MUSIC (do 4 searches):
1. "San Francisco concerts this week ${dateRange}" — general concert listings
2. San Francisco live music this week Fillmore Independent Warfield — major venues
3. Stern Grove concert schedule + Chase Center events + Davies Symphony Hall — free concerts and big shows
4. Bottom of the Hill, Rickshaw Stop, Great American Music Hall, The Chapel, August Hall, Greek Theatre Berkeley — smaller venues this week

NEW RESTAURANTS & BARS (do 4 searches):
5. site:sf.eater.com new restaurant openings — Eater SF is the best source
6. site:sfchronicle.com new restaurant bar San Francisco — Chronicle food section
7. site:theinfatuation.com san-francisco best new restaurants — Infatuation reviews and rankings
8. San Francisco newly opened restaurants Yelp Google Maps ${dateRange} — catch anything the food blogs missed

EVENTS & FESTIVALS (do 4 searches):
7. site:dothebay.com this week — Do The Bay is SF's best event aggregator
8. site:sf.funcheap.com — SF Fun Cheap for free and cheap events
9. site:lu.ma San Francisco events — Luma events (tech, social, creative community events)
10. San Francisco festivals pop-ups markets this week ${dateRange}

ARTS, CULTURE & COMEDY (do 3 searches):
11. San Francisco gallery openings art exhibitions this week — SFMOMA, de Young, Asian Art Museum, Minnesota Street Project, Southern Exposure, Exploratorium After Dark
12. San Francisco comedy shows this week — Cobb's Comedy Club, The Punch Line, Doc's Lab, SF Sketchfest (if in season), stand-up open mics, improv shows
13. San Francisco theater book readings poetry immersive art this week — SF Playhouse, ACT, Club Fugazi, City Lights, Booksmith, pop-up installations, First Fridays Oakland

SPORTS (do 1 search):
14. SF Giants schedule this week + Golden State Warriors NBA + Golden State Valkyries WNBA + Oakland Ballers schedule

SINGLES & SOCIAL (do 2 searches):
15. site:eventbrite.com San Francisco singles mixer speed dating — singles events
16. San Francisco social sports leagues running clubs meetups this week

NIGHTLIFE & EDM (do 2 searches):
17. site:ra.co San Francisco events — Resident Advisor for DJ sets, electronic shows, club nights
18. San Francisco EDM events raves this week 19hz.info — 19hz is the Bay Area EDM calendar. Also check: The Midway, Public Works, Audio SF, 1015 Folsom, Halcyon, Temple Nightclub

For each event include: name, venue, exact date/time, price range, and a 2-sentence description. Prioritize one-time events over ongoing ones.`
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
- picks: 10-14 items. Score each event and sort by score. First item (highest score) must have "hero":true
- SCORING SYSTEM for picks (include "score" field for each pick):
  * Scarcity: one-night-only=5, weekend-only=4, opening/closing week=3, limited run=2, ongoing=0
  * Buzz: new opening first 2 weeks=4, selling out=3, notable name/venue=2, hidden gem=1
  * Location: iconic SF venue/neighborhood=2, walkable to other picks=1, off beaten path=1
  * Price: free=2, has deal/discount code=1, under $20=1
  * Max score: 13. Sort picks by score descending.
- DIVERSITY RULE: picks MUST include at least 1 music, 1 food, 1 free event, 1 cultural (museum/show), 1 outdoors. If top scores are all one category, bump the lowest and pull in the highest-scoring event from the missing category.
- cats from: music,shows,food,nightlife,active,sports. price from: free,$,$$,$$$
- eats.new: 4-6 items. eats.classic: 4-6 items. bars: 6-8 items
- concerts: 6-10 items. One can have "hi":true for highlight
- singles: 4-6 events with links. singlesOngoing: 4-5 items
- Each playbook occasion: exactly 3 plans (free/$$/$$$ tiers), each with 3-5 steps using THIS WEEK's actual events
- Use ONLY real events from the research. Never make up events, venues, or dates.
- Prioritize events from: dothebay.com, sf.funcheap.com, sf.eater.com, seatgeek.com, venue websites`
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
