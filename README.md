# Sammy's SF 🌉

Weekly picks from your bff Sammy — a curated guide to what's happening in San Francisco.

## How it works

Every Thursday at 6pm PT, a GitHub Action:
1. Searches the web for SF events, concerts, restaurant openings, and more
2. Uses Claude to generate a fresh edition of the site
3. Commits and pushes the updated `index.html`
4. Vercel auto-deploys the new version

## Setup

### 1. Create a GitHub repo
- Create a new repo (public or private)
- Push all these files to it

### 2. Add your Anthropic API key
- Go to your repo → Settings → Secrets and variables → Actions
- Click "New repository secret"
- Name: `ANTHROPIC_API_KEY`
- Value: your API key from console.anthropic.com

### 3. Connect to Vercel
- Go to vercel.com → Add New Project
- Import your GitHub repo
- Deploy — Vercel will auto-deploy on every push

### 4. (Optional) Add a custom domain
- In Vercel → Project Settings → Domains
- Add your domain (e.g. sammysscene.com)

## Manual generation

To generate a new edition manually:
```bash
npm install
ANTHROPIC_API_KEY=your-key npm run generate
```

Or trigger it from GitHub: Actions tab → "Generate Weekly Edition" → "Run workflow"

## Cost

Each weekly generation uses roughly:
- ~10 web searches
- ~20K input tokens + ~16K output tokens
- Estimated: ~$0.10-0.20 per week on Claude Sonnet
