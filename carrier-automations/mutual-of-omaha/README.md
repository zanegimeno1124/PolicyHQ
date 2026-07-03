# Mutual of Omaha — Portal Automation

Playwright-based automation for the Mutual of Omaha **Sales Professional Access (SPA)** portal. Downloads commission statements, chargeback notifications, and policy status reports, then reconciles them against PolicyHQ records.

## Portal Details

| Property | Value |
|----------|-------|
| Portal Name | Sales Professional Access (SPA) |
| Portal URL | https://producer.mutualofomaha.com/enterprise/myportal |
| Login URL | https://accounts.mutualofomaha.com/samlAuthnRequest |
| Auth Type | SAML SSO (username/email + password) |
| MFA | Possible (handled with manual fallback) |

## Setup

```bash
cd carrier-automations/mutual-of-omaha
npm install
npx playwright install chromium
cp .env.example .env
# Edit .env with your SPA credentials
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run login` | Test login flow and save session state |
| `npm run download-commissions` | Download commission statements from Reports tab |
| `npm run download-status` | Download pending cases and policy status changes |
| `npm run download-all` | Run all downloads in sequence |
| `npm run reconcile` | Match downloaded data against PolicyHQ records |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    download-all.js                           │
│                   (Orchestrator)                             │
├─────────────────┬───────────────────┬───────────────────────┤
│   login.js      │ download-         │ download-status-      │
│                 │ commissions.js    │ reports.js            │
│  • Auth flow    │ • Reports tab     │ • My Business tab     │
│  • Session save │ • Compensation    │ • Pending cases       │
│  • MFA handle   │   Brokerage       │ • Policy activity     │
│                 │ • PDF downloads   │ • Chargeback scrape   │
├─────────────────┴───────────────────┴───────────────────────┤
│                     reconcile.js                             │
│  • Parse downloaded files (JSON/CSV/PDF)                    │
│  • Fetch PolicyHQ records via API                           │
│  • Match carrier records → PolicyHQ policies                │
│  • Determine actions (update, alert, flag)                  │
│  • Generate reconciliation report                           │
└─────────────────────────────────────────────────────────────┘
```

## Portal Navigation Map

After login, the SPA portal has these main sections:

```
Sales Professional Access
├── Home (Dashboard)
├── My Business
│   ├── Pending Cases (applications in underwriting)
│   ├── Policy Status / Activity
│   └── Case Details
├── Reports
│   ├── Compensation Brokerage (commission statements)
│   ├── Med Supp, LTC, DI and Other Health Products
│   ├── Life Insurance Reports
│   ├── Annuity Reports
│   └── Production Reports
├── Sales & Marketing
└── Support
```

## Login Flow

The login process follows a SAML SSO pattern:

1. Navigate to `producer.mutualofomaha.com/enterprise/myportal`
2. Portal redirects to `accounts.mutualofomaha.com/samlAuthnRequest`
3. Fill username/email and password
4. Click "Sign in"
5. SAML assertion redirects back to portal
6. (Optional) MFA challenge if enabled on account
7. Session state saved for reuse (valid ~4 hours)

## Reconciliation Logic

The reconciliation engine matches carrier records to PolicyHQ using a scoring system:

| Match Criteria | Score | Confidence |
|----------------|-------|------------|
| Policy number exact match | +100 | High |
| Agent NPN match | +30 | — |
| Premium exact match | +25 | — |
| Premium within 5% | +15 | — |
| Client name exact | +25 | — |
| Client name partial | +15 | — |
| Date within 7 days | +10 | — |

A score of 50+ is considered a match. Actions are determined by comparing carrier status vs PolicyHQ status:

| Carrier Says | PolicyHQ Says | Action |
|--------------|---------------|--------|
| Issued | Submitted/Pending | Update status to Issued |
| Declined | Submitted/Pending | Alert agent (high priority) |
| Lapsed | Issued/Active | Chargeback alert (urgent) |
| Cancelled | Issued/Active | Chargeback alert (urgent) |
| Withdrawn | Submitted/Pending | Update status to Withdrawn |
| Paid | Issued | Confirm commission received |

## File Structure

```
mutual-of-omaha/
├── .env.example          # Configuration template
├── package.json          # Dependencies and scripts
├── README.md             # This file
├── src/
│   ├── login.js          # Authentication handler
│   ├── download-commissions.js    # Commission statement downloader
│   ├── download-status-reports.js # Status/chargeback downloader
│   ├── download-all.js   # Orchestrator
│   └── reconcile.js      # PolicyHQ reconciliation engine
├── auth-state/           # Saved session cookies (gitignored)
├── downloads/            # Downloaded reports (gitignored)
│   ├── commissions/      # Commission statement PDFs
│   ├── status/           # Status reports and scraped data
│   └── results/          # Run result summaries
├── reconciliation-output/ # Reconciliation reports
└── debug-screenshots/    # Error screenshots for debugging
```

## Running on a Schedule

For automated daily runs, use cron or a task scheduler:

```bash
# Run daily at 6 AM to download overnight commission postings
0 6 * * * cd /path/to/mutual-of-omaha && npm run download-all

# Run reconciliation after downloads complete
0 7 * * * cd /path/to/mutual-of-omaha && npm run reconcile
```

## Troubleshooting

**Login fails with "MFA required"**: Run with `HEADLESS=false` in .env to manually enter MFA code. After first successful login, the session is saved and reused.

**Session expired**: Delete `auth-state/moo-session.json` and run `npm run login` again.

**No reports found**: The portal may have changed its layout. Run with `HEADLESS=false` and `SLOW_MO=500` to visually debug navigation.

**Download timeout**: Increase `TIMEOUT` in .env (default 60000ms = 60s).

## Next Steps

1. Run `npm run login` with `HEADLESS=false` to verify login works with your credentials
2. Observe the portal layout and adjust selectors in download scripts if needed
3. Run `npm run download-all` to pull initial reports
4. Configure PolicyHQ token in .env for reconciliation
5. Set up scheduled runs for daily automation
