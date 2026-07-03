# Americo Financial — Portal Automation

Playwright-based automation for the **Americo Financial Agent Portal**. Downloads commission statements, pending business reports, transaction history, and policy status data for reconciliation with PolicyHQ.

## Portal Details

| Property | Value |
|----------|-------|
| Portal Name | Americo Agent Portal |
| Portal URL | https://portal.americoagent.com |
| Registration | https://account.americoagent.com/AgentRegistration |
| Auth Type | Username + Password (standard form login) |
| Session | Cookie-based with "Remember me" option |
| Support | Agent Services: 800.231.0801 / Agent.Services@americo.com |

## Setup

```bash
cd carrier-automations/americo
npm install
npx playwright install chromium
cp .env.example .env
# Edit .env with your Americo agent portal credentials
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run login` | Test login flow and save session state |
| `npm run download-commissions` | Download commission summary, statements, and transactions |
| `npm run download-pending` | Download pending business and policy status data |
| `npm run download-all` | Run all downloads in sequence |
| `npm run reconcile` | Match downloaded data against PolicyHQ records |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    download-all.js                           │
│                   (Orchestrator)                             │
├─────────────────┬───────────────────────────────────────────┤
│   login.js      │ download-commissions │ download-pending   │
│                 │ .js                  │ .js                │
│  • Auth flow    │ • Summary scrape     │ • Pending cases    │
│  • Remember me  │ • Statement PDFs     │ • Status filters   │
│  • Session save │ • Transaction export │ • Chargeback scan  │
├─────────────────┴──────────────────────┴────────────────────┤
│                     reconcile.js                             │
│  • Parse commission statements and transactions             │
│  • Identify chargebacks (negative commission entries)       │
│  • Match against PolicyHQ by policy#, name, premium, date   │
│  • Classify actions (update, alert, chargeback warning)     │
└─────────────────────────────────────────────────────────────┘
```

## Portal Navigation Map

```
Americo Agent Portal (portal.americoagent.com)
├── Home (Dashboard with commission snapshot)
├── Commissions
│   ├── Summary (overview of all commissions)
│   ├── Statements (monthly PDF statements)
│   └── Transactions (individual line items)
├── Pending Business (applications in underwriting)
├── Marketing Materials
├── Forms
├── Illustration Software
└── Supplies (order materials)
```

## Commission Statement Fields

Based on the Americo Commission Statement Guide, statements include:

| Field | Description |
|-------|-------------|
| Policy Number | Americo's policy identifier |
| Insured | Policyholder name |
| Agent Number | Writing agent's number |
| Product | Final Expense, Term, IUL, Annuity |
| Annual Premium | Policy premium amount |
| Commission Rate | Percentage earned |
| Commission Amount | Dollar amount paid |
| Transaction Type | First Year, Renewal, Chargeback |
| Issue Date | When policy was issued |
| Status | In Force, Lapsed, Cancelled, etc. |

## Chargeback Detection

Americo chargebacks appear as negative entries in commission transactions. The automation identifies them by:

1. Negative dollar amounts in the Commission/Amount column
2. Transaction types containing "Chargeback", "Reversal", or "Debit"
3. Status changes to "Lapsed", "Cancelled", or "Surrendered"

## Reconciliation Logic

| Americo Says | PolicyHQ Says | Action |
|--------------|---------------|--------|
| Issued / In Force | Submitted/Pending | Update status to Issued |
| Declined | Submitted/Pending | Alert agent (high priority) |
| Not Taken | Submitted | Alert agent |
| Lapsed | Issued/Active | Chargeback alert (urgent) |
| Cancelled | Issued/Active | Chargeback alert (urgent) |
| Surrendered | Issued/Active | Chargeback alert (urgent) |
| Withdrawn | Submitted/Pending | Update status to Withdrawn |

## Key Differences from Other Carriers

1. **Instant Decision Products**: Final Expense, Term, and IUL products often issue immediately — no underwriting wait
2. **Traditional Portal**: Server-rendered pages (not a React SPA), making table scraping more reliable
3. **Structured Commission Data**: Well-defined statement format with clear field names
4. **Agent Number System**: Uses Americo-specific agent numbers (not NPN) for matching

## Troubleshooting

**Login fails**: Verify your username (not email) and password. If you don't have an account, register at the registration URL above.

**No commission data**: Commission statements are generated on a schedule. Check that you have active policies with Americo.

**Session timeout**: Americo sessions last approximately 4 hours. The automation handles re-login automatically.

**Tables not found**: If the portal layout changes, run with `HEADLESS=false` and `SLOW_MO=500` to visually debug.
