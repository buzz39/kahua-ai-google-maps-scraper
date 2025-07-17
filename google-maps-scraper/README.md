# Google Maps Scraper (Apollo-Style)

A production-ready, Playwright-powered Google Maps business scraper with Apollo-style dashboard, advanced enrichment, and Docker support.

## Features
- 🎯 Apollo-style web dashboard for lead generation
- 🤖 Playwright automation for Google Maps
- 🔍 Data enrichment (social, tech, company size, sentiment)
- 🛡️ Anti-detection & proxy rotation
- 📊 Real-time job management
- 📤 Export CSV/JSON
- 🐳 Docker-ready

## Quick Start

```bash
git clone <repo-url>
cd google-maps-scraper
cp .env.example .env
npm install
npm start
```

Or with Docker:

```bash
docker-compose up --build
```

## Configuration
See `.env.example` for all options: proxies, rate limits, CAPTCHA, DB, email, security, Playwright.

## Usage
### Combined Scraper (Recommended)
The combined scraper performs both URL discovery and detailed data extraction in one workflow:

```bash
# Run the combined scraper directly
node combined-scraper.js "restaurants" "New York" 10

# Or use the test script
node test-combined.js

# Or use the API server
npm start
```

### Individual Scripts
- `scraper.js` - Only scrapes URLs from Google Maps search
- `main.js` - Extracts detailed data from URLs in results.csv
- `combined-scraper.js` - Does both in one workflow

### API Endpoints
- Web dashboard: http://localhost:3000
- POST `/api/scrape` - Start new scraping job
- POST `/api/scrape/bulk` - Bulk scraping
- GET `/api/jobs` - List all jobs
- GET `/api/jobs/:id` - Get job status
- GET `/api/jobs/:id/results` - Get job results
- GET `/api/jobs/:id/download/csv` - Download CSV
- DELETE `/api/jobs/:id` - Delete job

### API Parameters
```json
{
  "searchTerm": "restaurants",
  "location": "New York",
  "maxResults": 100,
  "batchSize": 3,
  "stealthLevel": "optimized"
}
```

**Stealth Level Options:**
- `optimized`: Faster performance with basic anti-detection (default)
- `high-stealth`: Slower but maximum anti-detection with rotating contexts

**Batch Size Options:**
- `1-2`: Conservative (less server load)
- `3`: Balanced (recommended)
- `4-5`: Fast (higher server load)

**Performance Comparison:**
- **Optimized Mode**: ~3x faster, uses one context per batch
- **High-Stealth Mode**: Maximum anti-detection, uses one context per URL

## Ethical Use
- For research and lead generation only. Respect Google Maps TOS and robots.txt.

## Troubleshooting
- See Playwright docs for browser issues.
- Use proxies and delays to avoid bans.

## License
MIT 