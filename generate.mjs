import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";

const client = new Anthropic();

// Get current date info
const now = new Date();
const weekStart = new Date(now);
weekStart.setDate(now.getDate() - now.getDay() + 5); // Friday
const weekEnd = new Date(weekStart);
weekEnd.setDate(weekStart.getDate() + 6); // Thursday next week

const fmt = (d) =>
  d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
const fmtFull = (d) =>
  d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

const dateRange = `${fmt(weekStart)} – ${fmt(weekEnd)}, ${weekEnd.getFullYear()}`;
const issueNum = Math.ceil(
  (now - new Date("2026-07-25")) / (7 * 24 * 60 * 60 * 1000)
) + 1;

console.log(`\n🎯 Generating Sammy's SF — ${dateRange} (Issue #${issueNum})\n`);

// Read the current template for reference
const currentTemplate = fs.readFileSync("index.html", "utf-8");

// Step 1: Research events
console.log("🔍 Searching for SF events...\n");

const researchResponse = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 4000,
  tools: [{ type: "web_search_20250305", name: "web_search" }],
  messages: [
    {
      role: "user",
      content: `Search for things to do in San Francisco for the week of ${dateRange}. I need:

1. Concerts and live music (check SeatGeek SF, Stern Grove schedule, Fillmore, The Independent, Chase Center, Davies Symphony Hall)
2. New restaurant and bar openings
3. Outdoor events, festivals, pop-ups, markets
4. Art exhibitions, theater, film screenings
5. Sports (Giants schedule, Valkyries, Oakland Ballers)
6. Any notable free events

Do at least 8-10 searches to be thorough. For each event, include: name, venue, date/time, price range, and a brief description. Return everything as a structured list organized by category.`,
    },
  ],
});

// Extract the research text
const researchText = researchResponse.content
  .filter((b) => b.type === "text")
  .map((b) => b.text)
  .join("\n");

console.log("📝 Research complete. Generating HTML...\n");

// Step 2: Generate the HTML using the research and template
const generateResponse = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 16000,
  messages: [
    {
      role: "user",
      content: `You are generating the weekly edition of "Sammy's SF" — a fun, curated guide to what's happening in San Francisco this week, shared among friends.

Here is the current site template for reference — keep the EXACT same HTML structure, CSS, tabs, and JavaScript. Only update the content (event cards, dates, descriptions):

<template>
${currentTemplate}
</template>

Here is this week's research:

<research>
${researchText}
</research>

Generate the complete updated HTML file for the week of ${dateRange} (Issue #${String(issueNum).padStart(2, "0")}). Rules:

1. Keep the EXACT same HTML structure, CSS styles, JavaScript, and tab system
2. Update the header date to "${dateRange}"
3. Update the footer to "Issue ${String(issueNum).padStart(2, "0")}"
4. Replace all event cards with this week's events from the research
5. THIS WEEK tab: Pick 12-15 best events across all categories. Include data-cats and data-price attributes for filtering.
6. PLAYBOOKS tab: Create 3 itineraries per occasion (Date Night, Solo Date, Birthday, Friends Visiting, Parents in Town) at Free/$$/$$$ tiers using this week's actual events
7. EATS & BARS tab: Update with any new openings. Keep bars that are still relevant from last week.
8. SPORTS tab: Update all game schedules
9. CONCERTS tab: Update all shows and concerts
10. Keep the writing voice fun, warm, and friend-to-friend — like texting your group chat
11. Price tiers: free, $ (under $20), $$ ($20-75), $$$ ($75+)
12. Category definitions for data-cats:
    - music: concerts, live music, DJs, music festivals
    - shows: broadway, theater, comedy, drag shows, film screenings, museums, art exhibitions, book readings, poetry nights, open mics, immersive experiences
    - food: restaurants, food fairs, new openings, cooking classes, tastings
    - nightlife: DJ nights, club events, day parties, arcade bars, karaoke, trivia nights, late night events
    - active: hikes, outdoor yoga, kayaking, bike rides, flea markets, pop-up experiences, farmers markets, vintage shopping, outdoor fitness
    - sports: professional sports, amateur events, watch parties, fitness competitions
    Cards can have multiple categories (e.g. data-cats="nightlife,music")

Output ONLY the complete HTML file, no markdown fences or explanation.`,
    },
  ],
});

const html = generateResponse.content
  .filter((b) => b.type === "text")
  .map((b) => b.text)
  .join("\n")
  .replace(/^```html?\n?/, "")
  .replace(/\n?```$/, "")
  .trim();

// Write the output
fs.writeFileSync("index.html", html);
console.log(`✅ Generated index.html for ${dateRange}`);
console.log(`📊 Issue #${issueNum}`);
console.log(`📦 File size: ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB\n`);

// Step 3: Send newsletter via Buttondown (if API key is set)
const buttondownKey = process.env.BUTTONDOWN_API_KEY;
if (buttondownKey) {
  console.log("📧 Sending newsletter...\n");

  // Generate an email-friendly version (plain text summary + link)
  const emailResponse = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Convert this weekly events page into a short, fun email newsletter. Keep the same voice ("your bff Sammy"). 

Include:
- A quick intro (2 sentences)
- Top 5-6 picks with name, when, price, and one-line description
- The date night splurge pick
- A sign-off linking to the full site

Use simple HTML formatting (h2, p, ul/li, bold, links). Keep it scannable — people read emails fast. Link to the full site at sammyssf-1.vercel.app for the complete guide.

Here's the page content:
${html.substring(0, 8000)}

Output ONLY the email HTML body, no markdown fences.`,
      },
    ],
  });

  const emailBody = emailResponse.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .replace(/^```html?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  const emailRes = await fetch("https://api.buttondown.com/v1/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${buttondownKey}`,
    },
    body: JSON.stringify({
      subject: `Sammy's SF — ${dateRange}`,
      body: emailBody,
      status: "about_to_send",
    }),
  });

  if (emailRes.ok) {
    console.log("✅ Newsletter sent!\n");
  } else {
    const err = await emailRes.text();
    console.error("❌ Newsletter failed:", err);
  }
} else {
  console.log("⏭️  No BUTTONDOWN_API_KEY set, skipping newsletter.\n");
}
