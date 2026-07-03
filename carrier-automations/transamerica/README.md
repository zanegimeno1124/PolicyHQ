# TransAmerica — Portal Automation

Playwright-based automation for **TransAmerica** agent portals. Downloads commission statements, pending business data, in force policy details, status changes, and customer correspondences for reconciliation with PolicyHQ.

## Portal Ecosystem

TransAmerica operates multiple portals. This automation supports all three:

| Portal | URL | Best For |
|--------|-----|----------|
| **TransACT** (default) | transact.transamerica.com | Commission statements, production reports |
| **Agent Home** | transamerica.com/login/financial-professional | SSO to Life Access, book of business |
| **TLIC** | tlic.transamerica.com/portal/public/tlc/login | TransAmerica Life Insurance Company policies |

Set `PORTAL=transact` (or `agent_home` or `tlic`) in your `.env` to select which portal to use.

## Setup

```bash
cd carrier-automations/transamerica
npm install
npx playwright install chromium
cp .env.example .env
# Edit .env with your TransAmerica portal credentials and portal selection
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run login` | Test login flow and save session state |
| `npm run download-commissions` | Download commission summaries, statement PDFs, and exports |
| `npm run download-policies` | Download pending business, in force policies, status changes, correspondences |
| `npm run download-all` | Run all downloads in sequence |
| `npm run reconcile` | Match downloaded data against PolicyHQ records |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    download-all.js                           │
│                   (Orchestrator)                             │
├─────────────────┬───────────────────────────────────────────┤
│   login.js      │ download-commissions │ download-policies  │
│                 │ .js                  │ .js                │
│  • TransACT     │ • Monthly statements │ • Pending cases    │
│  • Agent Home   │ • Earned commission  │ • In force book    │
│  • TLIC         │ • Agent Detail PDF   │ • Status changes   │
│  • Session save │ • CSV/Excel exports  │ • Correspondences  │
├─────────────────┴──────────────────────┴────────────────────┤
│                     reconcile.js                             │
│  • Parse commission + policy data                           │
│  • Match against PolicyHQ (policy#, name, premium, date)    │
│  • Classify actions (update, alert, chargeback)             │
│  • Analyze correspondences for actionable keywords          │
└─────────────────────────────────────────────────────────────┘
```

## Portal Navigation Map

```
TransACT (transact.transamerica.com)
├── Dashboard
├── Commissions
│   ├── Earned Commission Summary
│   ├── Monthly Statements (PDF)
│   ├── Agent Detail Report
│   └── Transaction History
├── Production
├── Licensing & Appointments
└── Resources

Agent Home / Life Access
├── Dashboard (individualized)
├── Book of Business
│   ├── Pending Business
│   │   ├── Case requirements
│   │   ├── Upload documents
│   │   └── View applications
│   ├── In Force Policies
│   │   ├── Policy details
│   │   └── Customer correspondences
│   └── Status Filters
│       ├── Lapsed
│       ├── Cancelled/Terminated
│       └── Not Taken
├── Submit Applications (eApp)
├── Producer Profile
│   ├── State licensing
│   └── Appointment info
└── Sales Literature
```

## Products Covered

| Product | Type | Notes |
|---------|------|-------|
| Term Life | Term | Various term lengths |
| Final Expense | Whole Life | Simplified issue |
| Index Universal Life (IUL) | Permanent | Cash value accumulation |
| Whole Life | Permanent | Guaranteed cash value |
| Medicare Supplement | Health | Transamerica Medicare |

## Commission Details

From the TransAmerica Earned Commission Reference Guide:

- Monthly commission statements generated per agent number
- "Agent Detail" button generates one PDF for all agent numbers
- Quick summary shows earned commissions with monthly totals
- No vesting for producer commissions (commissions stop if contract terminates)
- Chargebacks appear as negative entries when policies lapse within chargeback period

## Reconciliation Logic

| TransAmerica Says | PolicyHQ Says | Action |
|-------------------|---------------|--------|
| In Force / Issued / Active | Submitted/Pending | Update status to Issued |
| Declined | Submitted/Pending | Alert agent (high priority) |
| Not Taken | Submitted/Pending | Alert agent |
| Lapsed | Issued/Active/In Force | Chargeback alert (urgent) |
| Cancelled / Terminated | Issued/Active | Chargeback alert (urgent) |
| Withdrawn | Submitted/Pending | Update status to Withdrawn |
| Pending | Submitted | Info only (still in underwriting) |

## Correspondence Analysis

The reconciliation engine also analyzes customer correspondences for actionable keywords:

| Priority | Keywords |
|----------|----------|
| Urgent | lapse, cancel, terminate, chargeback, final notice, grace period |
| High | decline, not taken, requirement, missing information |
| Normal | issued, approved, welcome, confirmation |

## Troubleshooting

**Multiple portals**: If you're unsure which portal to use, start with `PORTAL=transact` for commission data. Switch to `agent_home` for pending business and policy status.

**WFG agents**: If you're a World Financial Group agent, you may need to log in through MyWFG.com first. Set `PORTAL=transact` and use your TransACT credentials.

**Session timeout**: TransAmerica sessions typically last 4 hours. The automation handles re-login automatically.

**No commission data visible**: Ensure your agent number has commission statements generated for the selected month. Contact Licensing and Commissions at (888) 859-xxxx if needed.

**Portal migration**: TransAmerica is consolidating portals toward Agent Home. If TAANI or older URLs redirect, update to `PORTAL=agent_home`.
