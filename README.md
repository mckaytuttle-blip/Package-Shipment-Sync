# Package & Shipment Refresh

Polls Zoho Inventory every 30 minutes for new packages and shipment events, then POSTs each record to a Zapier Catch Hook which writes a row to the `Package & Shipment Log` tab in Google Sheets.

---

## Project Structure

```
package-shipment-refresh/
├── api/
│   └── sync.js          # Vercel cron endpoint
├── lib/
│   ├── zohoAuth.js      # Zoho OAuth token refresh
│   └── zohoPackages.js  # Zoho polling + row building logic
├── .env.example         # Env var reference (do not commit real values)
├── vercel.json          # Cron schedule config
└── package.json
```

---

## Setup

### 1. Environment Variables
Add the following to Vercel → Project Settings → Environment Variables:

| Variable | Description |
|---|---|
| `ZOHO_CLIENT_ID` | From Zoho API Console |
| `ZOHO_CLIENT_SECRET` | From Zoho API Console |
| `ZOHO_REFRESH_TOKEN` | From Zoho OAuth flow |
| `ZOHO_ORG_ID` | Your Zoho org ID |
| `ZAPIER_HOOK_URL` | Zapier Catch Hook URL |
| `CRON_SECRET` | Random secret to protect /api/sync |

### 2. Zapier Setup
1. Create a new Zap with trigger: **Webhooks by Zapier → Catch Hook**
2. Copy the hook URL → paste into `ZAPIER_HOOK_URL` env var
3. Add action: **Google Sheets → Lookup Spreadsheet Row**
   - Workbook: `SO Automation Tracking`
   - Sheet: `Package & Shipment Log`
   - Lookup column: `Sales Order ID`
   - Lookup value: `salesOrderId` from the hook payload
4. Add a **Filter**: only continue if row was NOT found (deduplication)
5. Add action: **Google Sheets → Create Spreadsheet Row**
   - Map fields:
     - Sales Order ID → `salesOrderId`
     - Package Created Date → `packageCreatedDate`
     - Package Created Time → `packageCreatedTime`
     - Actual Ship Date → `actualShipDate`
     - Actual Ship Time → `actualShipTime`

### 3. Google Sheet Setup
In the `SO Automation Tracking` workbook, create a new tab called `Package & Shipment Log` with these headers in row 1:

| A | B | C | D | E |
|---|---|---|---|---|
| Sales Order ID | Package Created Date | Package Created Time | Actual Ship Date | Actual Ship Time |

### 4. Deploy to Vercel
```bash
vercel deploy
```

The cron job runs automatically every 30 minutes via `vercel.json`.

---

## How It Works

1. Vercel triggers `/api/sync` every 30 minutes
2. App refreshes Zoho OAuth token
3. Queries Zoho for packages updated in the last 35 minutes (slightly wider window to avoid gaps)
4. Fetches detail for each package to get ship date/time
5. POSTs each row to Zapier hook
6. Zapier checks for duplicates, then writes new rows to the sheet

---

## Notes
- The 35-minute window is intentionally wider than the 30-minute cron interval to prevent gaps at boundaries
- Deduplication is handled by Zapier's Lookup step — existing SO IDs are skipped
- No external storage required — stateless design
