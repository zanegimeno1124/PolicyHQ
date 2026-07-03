# Ethos Life — Portal Automation

Playwright-based automation for the **Ethos Life Agent Portal**. Downloads earnings/commission data, customer policy statuses, and chargeback indicators for reconciliation with PolicyHQ.

## Portal Details

| Property | Value |
|----------|-------|
| Portal Name | Ethos Agent Portal |
| Portal URL | https://agents.ethoslife.com |
| Login URL | https://agents.ethoslife.com (React SPA) |
| Auth Type | Email + Password (form-based) |
| Protection | Cloudflare (requires real browser) |
| Payments | Weekly (activated policies), Monthly (bonuses/referrals) |

## Setup

```bash
cd carrier-automations/ethos
npm install
npx playwright install chromium
cp .env.example .env
# Edit .env with your Ethos agent portal credentials
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run login` | Test login flow and save session state |
| `npm run download-earnings` | Download earnings/commission data from Earnings section |
| `npm run download-customers` | Download customer list and policy status changes |
| `npm run download-all` | Run all downloads in sequence |
| `npm run reconcile` | Match downloaded data against PolicyHQ records |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    download-all.js                           │
│                   (Orchestrator)                             │
├─────────────────┬───────────────────────────────────────────┤
│   login.js      │ download-earnings.js │ download-customers │
│                 │                      │ .js                │
│  • Auth flow    │ • Earnings section   │ • Customers section│
│  • Cloudflare   │ • API interception   │ • Status filters   │
│  • Session save │ • Export downloads   │ • Lapse detection  │
├─────────────────┴──────────────────────┴────────────────────┤
│                     reconcile.js                             │
│  • Parse downloaded JSON/CSV files                          │
│  • Fetch PolicyHQ records via API                           │
│  • Score-based matching (name, premium, NPN, date)          │
│  • Action classification (update, alert, chargeback)        │
└─────────────────────────────────────────────────────────────┘
```

## Portal Navigation Map

```
Ethos Agent Portal
├── Home (Dashboard)
├── Quote & Application (start new apps)
├── Customers (client list + policy statuses)
│   ├── Active policies
│   ├── Pending applications
│   ├── Lapsed/Cancelled
│   └── Declined
├── Earnings (commission tracking)
│   ├── Weekly payments (activated policies)
│   ├── Monthly bonuses
│   └── Referral earnings
├── Performance (production metrics)
├── Resources (marketing, training)
└── Share Website (agent link/QR code)
```

## Key Differences from Traditional Carriers

Ethos operates as a modern insurtech platform with several unique characteristics:

1. **Instant Decisions**: 90% of applicants get instant decisions, so status changes happen rapidly
2. **Weekly Payments**: Commissions paid weekly for activated policies (not monthly like most carriers)
3. **API-Driven SPA**: The portal is a React single-page app that fetches data via APIs — the automation intercepts these API calls for structured JSON data
4. **Multi-Carrier Backend**: Ethos places policies with multiple underlying carriers (TruStage, Ameritas, etc.)
5. **Cloudflare Protection**: Requires a real browser context (no simple HTTP scraping)

## API Interception Strategy

Unlike traditional carrier portals that serve HTML pages, Ethos's React SPA fetches data from APIs. The automation intercepts these network requests to capture structured JSON data directly, which is more reliable than DOM scraping:

```javascript
page.on('response', async (response) => {
  if (url.includes('earning') || url.includes('customer')) {
    const data = await response.json();
    // Structured data captured directly from API
  }
});
```

## Reconciliation Logic

Same scoring system as other carriers, adapted for Ethos's data structure:

| Carrier Says | PolicyHQ Says | Action |
|--------------|---------------|--------|
| Active/Activated | Submitted/Pending | Update status to Issued |
| Declined | Submitted/Pending | Alert agent (high priority) |
| Lapsed | Issued/Active | Chargeback alert (urgent) |
| Cancelled | Issued/Active | Chargeback alert (urgent) |
| Withdrawn | Submitted/Pending | Update status to Withdrawn |

## Troubleshooting

**Cloudflare blocks access**: Run with `HEADLESS=false` — Cloudflare challenges are easier to pass with a visible browser window. You may need to solve a CAPTCHA on first run.

**Login form not found**: The React SPA may take time to render. Increase `TIMEOUT` in .env or add `SLOW_MO=500` for debugging.

**No API data captured**: Ensure you're navigating to the correct sections. The API interception only captures responses during active navigation.

**Session expired quickly**: Ethos sessions may be shorter-lived than traditional carriers. The automation checks session validity before reuse (2-hour window).
